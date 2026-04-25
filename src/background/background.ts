/**
 * ConsentTheater background service worker.
 *
 * Two modes of operation:
 *
 * 1. LIVE INSPECTOR — always available, no action needed:
 *    - getLiveCookies: reads ALL cookies for the current tab's domain via chrome.cookies
 *    - clearAll: wipes cookies + storage for the origin (without reload)
 *    - cookiesChanged: pushed to sidebar when cookies.onChanged fires
 *
 * 2. GDPR TEST — triggered by user clicking "Run GDPR Test":
 *    - Clears everything, reloads with bypassCache, captures for SCAN_WINDOW_MS
 *    - Transitions to monitoring phase (keeps capturing after initial report)
 *    - Reports score + violations based on what happened BEFORE consent
 */
import type {
  ExtensionMessage,
  Report,
  ReportResponse,
  TestResponse,
  StateResponse,
  TestPhase,
  CapturedCookie,
  CapturedRequest,
  LiveCookie,
  LiveCookiesResponse,
  LiveTracker,
  DbStatsResponse,
  ClearAllResponse
} from '@/ui/types/messages';
import { isSameOrSubdomain, matchCookie, matchDomain } from '@/lib/tracker-matcher';
import type { TrackerDB } from '@/lib/tracker-matcher';
import { loadPlaybill } from '@consenttheater/playbill';

// Injected at build time by scripts/build.js — the @consenttheater/playbill
// version pinned in the extension's package.json devDependencies.
declare const __PLAYBILL_VERSION__: string;
import type { ObservedBanner } from '@/lib/observations';
import { detectSuspiciousPattern } from '@/lib/pattern-detector';
import type { ConsentAction } from '@/ui/types/messages';

declare const browser: typeof chrome | undefined;
const bAPI: typeof chrome = (typeof browser !== 'undefined' && browser?.runtime) ? browser as typeof chrome : chrome;

/** Fire-and-forget message to sidebar. Silently swallows "no receiver" errors. */
function pushToSidebar(message: Record<string, unknown>): void {
  bAPI.runtime.sendMessage(message).catch(() => { /* sidebar may be closed — expected */ });
}

const SCAN_WINDOW_MS = 6000;
const MONITOR_UPDATE_DEBOUNCE_MS = 1500;

interface TabState {
  phase: TestPhase;
  scanStartedAt: number;
  consentResolvedAt: number;
  consentAction: ConsentAction | null;
  origin: string | null;
  hostname: string | null;
  cookies: CapturedCookie[];
  requests: CapturedRequest[];
  banner: ObservedBanner | null;
  report: Report | null;
  scanTimer: ReturnType<typeof setTimeout> | null;
  lastReportItemCount: number;
  updateTimer: ReturnType<typeof setTimeout> | null;
}

function newTabState(): TabState {
  return {
    phase: 'idle',
    scanStartedAt: 0,
    consentResolvedAt: 0,
    consentAction: null,
    origin: null,
    hostname: null,
    cookies: [],
    requests: [],
    banner: null,
    report: null,
    scanTimer: null,
    lastReportItemCount: 0,
    updateTimer: null
  };
}

const tabStates = new Map<number, TabState>();

/**
 * Tracks every host each tab has contacted (always-on, lightweight).
 * Map<host, requestCount>. Used by:
 *  - Live inspector: queries cookies for every domain touched (mirrors DevTools
 *    Application tab) and surfaces a "loaded trackers" list with request counts.
 *  - Cookie attribution: cross-references third-party cookies against hosts the
 *    tab actually contacted, so we don't leak cookies from other tabs.
 */
const tabDomains = new Map<number, Map<string, number>>();

// Playbill is bundled into the service worker at build time — no runtime fetch.
// We keep the full Playbill object (for .stats / .tier / .version) and expose
// the matcher-compatible view as trackerDB. Playbill is a superset of TrackerDB.
const playbill = loadPlaybill('full');
const trackerDB: TrackerDB = playbill as unknown as TrackerDB;

function isCapturing(state: TabState): boolean {
  return state.phase === 'testing' || state.phase === 'monitoring';
}

// =============================================================================
// LIVE INSPECTOR — cookie reading & clearing
// =============================================================================

async function getLiveCookies(tabId: number): Promise<LiveCookiesResponse> {
  const db = trackerDB;
  const tab = await bAPI.tabs.get(tabId);
  if (!tab.url || !/^https?:/i.test(tab.url)) {
    return { cookies: [], trackers: [], url: tab.url || '', hostname: '' };
  }

  const url = new URL(tab.url);
  const hostname = url.hostname;

  // STRATEGY: Try targeted queries first (works in Chrome, Firefox, Edge).
  // Fall back to getAll({}) + filter only if targeted queries return empty (WaveBox).
  const seen = new Set<string>();
  const allRaw: chrome.cookies.Cookie[] = [];

  const addCookie = (c: chrome.cookies.Cookie) => {
    const key = `${c.name}|${c.domain}|${c.path}|${c.storeId}`;
    if (!seen.has(key)) { seen.add(key); allRaw.push(c); }
  };

  // Step 1: Get first-party cookies via targeted queries
  try { (await bAPI.cookies.getAll({ url: tab.url })).forEach(addCookie); } catch { /* */ }
  try { (await bAPI.cookies.getAll({ domain: hostname })).forEach(addCookie); } catch { /* */ }
  try { (await bAPI.cookies.getAll({ domain: '.' + hostname })).forEach(addCookie); } catch { /* */ }

  // Step 2: Get third-party cookies for domains this tab contacted
  const trackedDomains = new Set<string>(tabDomains.get(tabId)?.keys() ?? []);

  // Also get resource domains from content script (catches pre-loaded resources)
  try {
    const resp = await Promise.race([
      new Promise<{ resourceDomains?: string[] }>((resolve) => {
        bAPI.tabs.sendMessage(tabId, { type: 'getStorage' }, (r) => {
          void bAPI.runtime.lastError;
          resolve(r || {});
        });
      }),
      new Promise<{ resourceDomains?: string[] }>((resolve) => setTimeout(() => resolve({}), 500))
    ]);
    if (resp.resourceDomains) {
      for (const d of resp.resourceDomains) {
        trackedDomains.add(d);
        if (!tabDomains.has(tabId)) tabDomains.set(tabId, new Map());
        const counts = tabDomains.get(tabId)!;
        if (!counts.has(d)) counts.set(d, 0);
      }
    }
  } catch { /* content script not available */ }

  for (const domain of trackedDomains) {
    if (domain === hostname) continue;
    try { (await bAPI.cookies.getAll({ domain })).forEach(addCookie); } catch { /* */ }
  }

  // Step 3: Get partitioned cookies (Chrome 119+ CHIPS)
  try {
    const partitioned = await (bAPI.cookies.getAll as (details: unknown) => Promise<chrome.cookies.Cookie[]>)({
      partitionKey: { topLevelSite: url.origin }
    });
    if (Array.isArray(partitioned)) partitioned.forEach(addCookie);
  } catch { /* partitionKey not supported */ }

  // Step 4: WaveBox fallback — if targeted queries returned nothing, try getAll({}) + filter
  if (allRaw.length === 0) {
    const allBrowser = await bAPI.cookies.getAll({});
    const relevantDomains = new Set<string>([hostname, ...trackedDomains]);
    for (const c of allBrowser) {
      const cd = c.domain.replace(/^\./, '');
      for (const rd of relevantDomains) {
        if (cd === rd || cd.endsWith('.' + rd) || rd.endsWith('.' + cd)) {
          addCookie(c);
          break;
        }
      }
    }
  }

  const cookies: LiveCookie[] = allRaw.map(c => {
    const cookieDomain = c.domain.replace(/^\./, '');
    const isThirdParty = !isSameOrSubdomain(cookieDomain, hostname);
    const match = matchCookie(db, c.name);

    return {
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite,
      expirationDate: c.expirationDate,
      company: match?.company,
      service: match?.service,
      category: match?.category,
      consent_burden: match?.consent_burden,
      description: match?.description,
      lifetime: match?.lifetime,
      docs_url: match?.docs_url,
      isThirdParty,
      // Pattern detection — catches unknown trackers even if not in Playbill
      ...(() => {
        const pattern = detectSuspiciousPattern(c.name, c.value);
        return pattern.level !== 'none'
          ? { suspicionLevel: pattern.level, suspicionReasons: pattern.reasons }
          : {};
      })()
    };
  });

  // Sort: current domain first, then third-party by domain
  cookies.sort((a, b) => {
    if (a.isThirdParty !== b.isThirdParty) return a.isThirdParty ? 1 : -1;
    return a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name);
  });

  const trackers = buildLiveTrackers(tabId, hostname, db);

  return { cookies, trackers, url: tab.url, hostname };
}

/**
 * Builds the live-tracker list from tabDomains. Skips first-party (same origin
 * as the current page) and enriches each third-party host with Playbill metadata
 * when available. Unknown hosts still appear — the UI groups them into the
 * "unknown third party" bucket so users can spot the zoo.
 */
function buildLiveTrackers(tabId: number, pageHostname: string, db: TrackerDB): LiveTracker[] {
  const counts = tabDomains.get(tabId);
  if (!counts) return [];
  const trackers: LiveTracker[] = [];
  for (const [host, count] of counts) {
    if (isSameOrSubdomain(host, pageHostname)) continue;
    const match = matchDomain(db, host);
    trackers.push({
      hostname: host,
      count,
      company: match?.company,
      service: match?.service,
      category: match?.category,
      consent_burden: match?.consent_burden,
      note: match?.note,
      docs_url: match?.docs_url,
      matchedDomain: match?.matchedDomain
    });
  }
  // Default sort: request count desc, then hostname alpha. UI re-buckets.
  trackers.sort((a, b) => b.count - a.count || a.hostname.localeCompare(b.hostname));
  return trackers;
}

async function clearAll(tabId: number): Promise<ClearAllResponse> {
  const tab = await bAPI.tabs.get(tabId);
  if (!tab.url || !/^https?:/i.test(tab.url)) {
    return { ok: false, cookiesCleared: 0, storageCleared: false };
  }

  const url = new URL(tab.url);
  const origin = url.origin;

  let cookiesCleared = 0;
  let storageCleared = false;

  // STEP 1: Nuclear option — browsingData.remove with cookies:true clears ALL first-party cookies
  try {
    await bAPI.browsingData.remove(
      { origins: [origin] },
      { cookies: true, localStorage: true, indexedDB: true, cacheStorage: true, serviceWorkers: true, cache: true }
    );
    storageCleared = true;
  } catch (e) {
    console.warn('ConsentTheater: browsingData.remove failed', e);
  }

  // STEP 2: Remove ALL cookies + partitioned cookies.
  try {
    const allCookies = await bAPI.cookies.getAll({});

    // Also get PARTITIONED cookies (CHIPS)
    try {
      const partitioned = await (bAPI.cookies.getAll as (details: unknown) => Promise<chrome.cookies.Cookie[]>)({
        partitionKey: { topLevelSite: origin }
      });
      if (Array.isArray(partitioned)) {
        const seen = new Set(allCookies.map((c: chrome.cookies.Cookie) => `${c.name}|${c.domain}|${c.path}`));
        for (const c of partitioned) {
          const key = `${c.name}|${c.domain}|${c.path}`;
          if (!seen.has(key)) { seen.add(key); allCookies.push(c); }
        }
      }
    } catch { /* partitionKey not supported */ }

    for (const c of allCookies) {
      const cookieDomain = c.domain.replace(/^\./, '');
      // Use the cookie's own secure flag — wrong protocol = silent no-op
      const protocol = c.secure ? 'https' : 'http';
      const removeUrl = `${protocol}://${cookieDomain}${c.path}`;

      const removeParams: { url: string; name: string; storeId?: string; partitionKey?: { topLevelSite: string } } = {
        url: removeUrl,
        name: c.name,
        storeId: c.storeId
      };

      // Handle partitioned cookies (Chrome 119+ CHIPS)
      if ((c as chrome.cookies.Cookie & { partitionKey?: { topLevelSite: string } }).partitionKey) {
        removeParams.partitionKey = (c as chrome.cookies.Cookie & { partitionKey?: { topLevelSite: string } }).partitionKey;
      }

      const result = await bAPI.cookies.remove(removeParams);
      if (result) {
        cookiesCleared++;
      } else {
        // If secure-based protocol failed, try the other one
        const fallbackProto = c.secure ? 'http' : 'https';
        const fallbackResult = await bAPI.cookies.remove({
          ...removeParams,
          url: `${fallbackProto}://${cookieDomain}${c.path}`
        });
        if (fallbackResult) cookiesCleared++;
      }
    }
  } catch (e) {
    console.warn('ConsentTheater: individual cookie clear error', e);
  }

  // STEP 3: Content script clears localStorage, sessionStorage, and JS-accessible cookies
  try {
    await new Promise<void>((resolve) => {
      bAPI.tabs.sendMessage(tabId, { type: 'clearAllStorage' }, () => {
        void bAPI.runtime.lastError;
        resolve();
      });
    });
    storageCleared = true;
  } catch { /* content script may not be loaded */ }

  // Notify sidebar
  pushToSidebar({ type: 'cookiesChanged', tabId });

  return { ok: true, cookiesCleared, storageCleared };
}

// =============================================================================
// =============================================================================
// DOMAIN TRACKER — always on, lightweight. Collects all domains each tab contacts.
// =============================================================================

bAPI.webRequest.onBeforeRequest.addListener(
  (details): undefined => {
    if (details.tabId < 0) return;
    let host: string;
    try { host = new URL(details.url).hostname; } catch { return; }
    if (!tabDomains.has(details.tabId)) tabDomains.set(details.tabId, new Map());
    const counts = tabDomains.get(details.tabId)!;
    const isNewHost = !counts.has(host);
    counts.set(host, (counts.get(host) ?? 0) + 1);
    // First time we see this host on this tab — ping the sidebar so its live
    // tracker list refreshes. Repeat hits don't re-notify (count increments only).
    if (isNewHost) pushToSidebar({ type: 'cookiesChanged', tabId: details.tabId });
  },
  { urls: ['<all_urls>'] }
);

// Clear domain tracking on navigation.
// We clear TWICE: once on onBeforeNavigate (early reset), and again on
// onCommitted. The second clear matters because old-page unload handlers
// (sendBeacon to analytics, final-pageview pings, etc.) fire AFTER
// onBeforeNavigate but BEFORE onCommitted — they sneak into the freshly-
// cleared map and look like trackers of the new page. By the time
// onCommitted fires, unloads are done, so a second reset wipes those ghosts.
function resetTabDomains(tabId: number) {
  if (tabId >= 0) tabDomains.set(tabId, new Map());
}
bAPI.webNavigation?.onBeforeNavigate?.addListener((details) => {
  if (details.frameId === 0) resetTabDomains(details.tabId);
});
bAPI.webNavigation?.onCommitted?.addListener((details) => {
  if (details.frameId === 0) resetTabDomains(details.tabId);
});

// =============================================================================
// CAPTURE PIPELINE — active during GDPR test + monitoring
// =============================================================================

bAPI.webRequest.onBeforeRequest.addListener(
  (details): undefined => {
    if (details.tabId < 0 || !trackerDB) return;
    const state = tabStates.get(details.tabId);
    if (!state || !isCapturing(state) || !state.hostname) return;

    let host: string;
    try { host = new URL(details.url).hostname; } catch { return; }
    if (isSameOrSubdomain(host, state.hostname)) return;

    const match = matchDomain(trackerDB, host);
    if (!match) return;

    state.requests.push({
      url: details.url,
      hostname: host,
      company: match.company,
      service: match.service,
      category: match.category,
      consent_burden: match.consent_burden,
      note: match.note,
      type: details.type,
      ts: details.timeStamp,
      beforeConsent: !state.consentResolvedAt || details.timeStamp < state.consentResolvedAt
    });

    if (state.phase === 'monitoring') scheduleUpdate(details.tabId, state);
  },
  { urls: ['<all_urls>'] }
);

/**
 * A cookie belongs to tab T if the cookie's domain is first-party relative to
 * the scanned page, OR if T has made a request to a host whose domain matches
 * the cookie's domain. Cookies can only be set by the host that sends the
 * Set-Cookie response (or its superdomain via the Domain attribute), so any
 * third-party cookie that appears during a scan must have a matching request
 * already recorded in tabDomains. Attribution avoids leaking cookies from
 * other tabs (cookies.onChanged is a global event).
 */
function isCookieAttributableToTab(cookieDomain: string, tabId: number, state: TabState): boolean {
  if (!state.hostname) return false;
  if (isSameOrSubdomain(cookieDomain, state.hostname) ||
      isSameOrSubdomain(state.hostname, cookieDomain)) return true;
  const hosts = tabDomains.get(tabId);
  if (!hosts) return false;
  for (const host of hosts.keys()) {
    if (isSameOrSubdomain(host, cookieDomain)) return true;
  }
  return false;
}

bAPI.cookies.onChanged.addListener((changeInfo) => {
  if (!trackerDB) return;

  const cookieDomain = changeInfo.cookie.domain.replace(/^\./, '');

  // Always notify sidebar about cookie changes (for live inspector)
  if (!changeInfo.removed) {
    for (const [tabId, state] of tabStates) {
      if (isCookieAttributableToTab(cookieDomain, tabId, state)) {
        pushToSidebar({ type: 'cookiesChanged', tabId });
      }
    }
  }

  if (changeInfo.removed) return;
  const cookie = changeInfo.cookie;

  // Capture pipeline for GDPR test
  for (const [tabId, state] of tabStates) {
    if (!isCapturing(state) || !state.hostname) continue;
    if (!isCookieAttributableToTab(cookieDomain, tabId, state)) continue;

    const match = matchCookie(trackerDB, cookie.name);
    if (!match) continue;

    if (state.cookies.some(c => c.name === cookie.name && c.domain === cookie.domain)) continue;

    const now = Date.now();
    state.cookies.push({
      name: cookie.name,
      domain: cookie.domain,
      company: match.company,
      service: match.service,
      category: match.category,
      consent_burden: match.consent_burden,
      ts: now,
      beforeConsent: !state.consentResolvedAt || now < state.consentResolvedAt
    });

    if (state.phase === 'monitoring') scheduleUpdate(tabId, state);
  }
});

function scheduleUpdate(tabId: number, state: TabState) {
  if (state.updateTimer) return;
  state.updateTimer = setTimeout(async () => {
    state.updateTimer = null;
    const currentCount = state.cookies.length + state.requests.length;
    if (currentCount === state.lastReportItemCount) return;

    state.report = buildReport(state);
    state.lastReportItemCount = currentCount;
    await updateBadgeFromReport(tabId, state.report);
    pushToSidebar({ type: 'reportUpdated', tabId });
  }, MONITOR_UPDATE_DEBOUNCE_MS);
}

bAPI.tabs.onRemoved.addListener((tabId) => {
  const state = tabStates.get(tabId);
  if (state?.scanTimer) clearTimeout(state.scanTimer);
  if (state?.updateTimer) clearTimeout(state.updateTimer);
  tabStates.delete(tabId);
  tabDomains.delete(tabId);

});

bAPI.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url) {
    const state = tabStates.get(tabId);
    if (state) {
      // URL change — everything collected for the previous page is stale.
      // Drop the report and all accumulated scan data so the sidebar doesn't
      // keep showing ghost cookies / trackers / banner from the old URL.
      if (state.scanTimer) { clearTimeout(state.scanTimer); state.scanTimer = null; }
      if (state.updateTimer) { clearTimeout(state.updateTimer); state.updateTimer = null; }
      state.phase = 'idle';
      state.scanStartedAt = 0;
      state.consentResolvedAt = 0;
      state.consentAction = null;
      state.cookies = [];
      state.requests = [];
      state.banner = null;
      state.report = null;
      state.origin = null;
      state.hostname = null;
      state.lastReportItemCount = 0;
    }
    void setBadge(tabId, '', '#6b7280');
    // Tell the sidebar to resync — its useCurrentTab also triggers on
    // changeInfo.url, but pushing the signal explicitly avoids the race
    // where the sidebar queries getState before our clear finishes.
    pushToSidebar({ type: 'reportUpdated', tabId });
  }
  if (changeInfo.status === 'loading') {
    const state = tabStates.get(tabId);
    if (state && state.phase === 'idle') {
      void setBadge(tabId, '', '#6b7280');
    }
  }
  // Notify sidebar about potential cookie changes on navigation
  if (changeInfo.status === 'complete') {
    pushToSidebar({ type: 'cookiesChanged', tabId });
  }
});

// =============================================================================
// MESSAGING
// =============================================================================

bAPI.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse).catch(err => {
    console.error('ConsentTheater message error:', err);
    sendResponse({ error: err instanceof Error ? err.message : String(err) });
  });
  return true;
});

type HandlerReturn = TestResponse | StateResponse | ReportResponse | LiveCookiesResponse | DbStatsResponse | ClearAllResponse | { ok?: boolean; error?: string };

async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender
): Promise<HandlerReturn> {
  switch (message.type) {
    // Live inspector
    case 'getLiveCookies':
      return getLiveCookies(message.tabId);
    case 'clearAll':
      return clearAll(message.tabId);

    // GDPR test
    case 'runTest':
      return startTest(message.tabId);
    case 'getReport':
      return getReport(message.tabId);
    case 'getState': {
      const s = tabStates.get(message.tabId);
      return {
        phase: s?.phase || 'idle',
        hasReport: !!s?.report,
        report: s?.report || null
      };
    }
    case 'getDbStats':
      return {
        cookies: playbill.stats.cookies,
        domains: playbill.stats.domains,
        companies: playbill.stats.companies,
        total: playbill.stats.cookies + playbill.stats.domains,
        tier: playbill.tier,
        packageVersion: __PLAYBILL_VERSION__,
        schemaVersion: playbill.version,
        generated: playbill.generated
      };

    // Content script
    case 'bannerDetected':
      return recordBanner(sender.tab?.id, message.banner);
    case 'consentResolved':
      return recordConsent(sender.tab?.id, message.action);

    default:
      return { error: 'unknown action' };
  }
}

// =============================================================================
// GDPR TEST LIFECYCLE
// =============================================================================

async function startTest(tabId: number): Promise<TestResponse> {
  const tab = await bAPI.tabs.get(tabId);
  if (!tab.url || !/^https?:/i.test(tab.url)) {
    return { error: 'Only http(s) pages can be tested' };
  }

  const url = new URL(tab.url);

  const prev = tabStates.get(tabId);
  if (prev?.scanTimer) clearTimeout(prev.scanTimer);
  if (prev?.updateTimer) clearTimeout(prev.updateTimer);

  const state = newTabState();
  state.phase = 'testing';
  state.scanStartedAt = Date.now();
  state.origin = url.origin;
  state.hostname = url.hostname;
  tabStates.set(tabId, state);

  await setBadge(tabId, '...', '#6b7280');

  // Clear cookies + storage
  try {
    await bAPI.browsingData.remove({ origins: [url.origin] }, {
      cookies: true, localStorage: true, indexedDB: true,
      cacheStorage: true, serviceWorkers: true, cache: true
    });
  } catch { /* partial */ }

  await bAPI.tabs.reload(tabId, { bypassCache: true });

  state.scanTimer = setTimeout(() => void finalizeTest(tabId), SCAN_WINDOW_MS);
  return { ok: true, scanWindowMs: SCAN_WINDOW_MS };
}

async function finalizeTest(tabId: number): Promise<void> {
  const state = tabStates.get(tabId);
  if (!state) return;
  if (!state.consentResolvedAt) state.consentResolvedAt = Date.now();

  state.phase = 'reporting';
  state.report = buildReport(state);
  state.lastReportItemCount = state.cookies.length + state.requests.length;

  await updateBadgeFromReport(tabId, state.report);
  pushToSidebar({ type: 'reportReady', tabId });

  state.phase = 'monitoring';
}

async function getReport(tabId: number): Promise<ReportResponse> {
  const state = tabStates.get(tabId);
  if (!state) return { report: null };

  if (state.phase === 'testing' && Date.now() - state.scanStartedAt < SCAN_WINDOW_MS) {
    return { report: null, phase: 'testing' };
  }

  if (state.phase === 'testing') {
    await finalizeTest(tabId);
  }

  if (state.phase === 'monitoring') {
    const currentCount = state.cookies.length + state.requests.length;
    if (currentCount !== state.lastReportItemCount || !state.report) {
      state.report = buildReport(state);
      state.lastReportItemCount = currentCount;
      await updateBadgeFromReport(tabId, state.report);
    }
  }

  return { report: state.report, phase: state.phase };
}

function buildReport(state: TabState): Report {
  const consentTs = state.consentResolvedAt;

  const cookies: CapturedCookie[] = state.cookies.map(c => ({
    ...c,
    beforeConsent: !consentTs || (c.ts || 0) < consentTs
  }));

  const requests: CapturedRequest[] = state.requests.map(r => ({
    ...r,
    beforeConsent: !consentTs || (r.ts || 0) < consentTs
  }));

  const preCookies = cookies.filter(c => c.beforeConsent);
  const preReqs = requests.filter(r => r.beforeConsent);
  const leaks = requests.filter(r => r.category === 'data_leak');

  return {
    stats: {
      preConsentCookies: preCookies.length,
      preConsentRequests: preReqs.length,
      dataLeakRequests: leaks.length,
      totalCookies: cookies.length,
      totalRequests: requests.length,
      bannerDetected: !!state.banner?.detected,
      consentAction: state.consentAction
    },
    banner: state.banner ?? null,
    cookies, requests,
    origin: state.origin,
    phase: state.phase,
    finishedAt: Date.now()
  };
}

function recordBanner(tabId: number | undefined, banner: ObservedBanner): { ok: boolean } {
  if (!tabId) return { ok: false };
  const state = tabStates.get(tabId);
  if (!state) return { ok: false };
  state.banner = banner;
  return { ok: true };
}

function recordConsent(tabId: number | undefined, action: ConsentAction): { ok: boolean } {
  if (!tabId) return { ok: false };
  const state = tabStates.get(tabId);
  if (!state || state.phase === 'idle') return { ok: false };
  if (!state.consentResolvedAt) {
    state.consentResolvedAt = Date.now();
    state.consentAction = action;
  }
  return { ok: true };
}

// =============================================================================
// BADGE
// =============================================================================

async function setBadge(tabId: number, text: string, color: string): Promise<void> {
  try {
    await bAPI.action.setBadgeText({ tabId, text });
    if (color) await bAPI.action.setBadgeBackgroundColor({ tabId, color });
  } catch { /* tab may be gone */ }
}

async function updateBadgeFromReport(tabId: number, report: Report | null): Promise<void> {
  if (!report) return setBadge(tabId, '', '#6b7280');
  const preConsent = report.stats.preConsentCookies + report.stats.preConsentRequests;
  if (preConsent === 0) {
    await setBadge(tabId, '✓', '#16a34a');
    return;
  }
  await setBadge(tabId, String(preConsent), '#dc2626');
}

// =============================================================================
// SIDEBAR WIRING
// =============================================================================

type ChromeWithSidePanel = typeof chrome & {
  sidePanel?: {
    setPanelBehavior?: (options: { openPanelOnActionClick?: boolean }) => Promise<void>;
  };
  sidebarAction?: {
    toggle?: () => Promise<void>;
  };
};

const bAPIWithSidebar = bAPI as ChromeWithSidePanel;

if (bAPIWithSidebar.sidePanel?.setPanelBehavior) {
  bAPIWithSidebar.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e: Error) => console.warn('sidePanel.setPanelBehavior failed:', e));
}

bAPI.action?.onClicked?.addListener(async () => {
  if (bAPIWithSidebar.sidebarAction?.toggle) {
    try { await bAPIWithSidebar.sidebarAction.toggle(); }
    catch (e) { console.warn('sidebarAction.toggle failed:', e); }
  }
});
