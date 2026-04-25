/**
 * Content script: banner detection + consent-click capture + storage reading.
 *
 * Runs at document_start on every page. Responsibilities:
 *   1. Detect consent banner → report shape to background
 *   2. Watch for Accept/Reject/Manage clicks → report to background
 *   3. On request: read localStorage/sessionStorage keys → send to sidebar
 *   4. On request: clear sessionStorage (browsingData can't do this per-origin)
 */
import type { ExtensionMessage, StorageEntry } from '@/ui/types/messages';
import type { ObservedBanner } from '@/lib/observations';

declare const browser: typeof chrome | undefined;
const api: typeof chrome = (typeof browser !== 'undefined' && browser?.runtime) ? browser as typeof chrome : chrome;

// Content script now runs in every frame so iframe-hosted CMPs (Sourcepoint,
// Funding Choices, etc.) get banner detection. Storage handlers must stay
// top-frame-only — running them in subframes would clear iframe storage and
// confuse the sidebar's resource-domain probe.
const isTopFrame = window === window.top;

// Known CMP container selectors. Fully-namespaced — using vendor IDs / class
// prefixes so we don't false-match on a site that happens to ship a class
// called `.cookie-banner` somewhere unrelated.
const BANNER_SELECTORS = [
  // OneTrust
  '#onetrust-banner-sdk',
  '#onetrust-consent-sdk',
  '#onetrust-pc-sdk',
  // Cookiebot
  '#CybotCookiebotDialog',
  '#CybotCookiebotDialogBodyContentText',
  // Usercentrics
  '#usercentrics-root',
  '#usercentrics-cmp-ui',
  // Didomi
  '#didomi-notice',
  '#didomi-host',
  // CookieYes
  '.cky-consent-container',
  '.cky-modal',
  // Sourcepoint
  '.sp_message_container',
  '#sp_message_container_*',
  // TrustArc
  '#truste-consent-track',
  '#consent_blackbar',
  // Quantcast
  '.qc-cmp2-container',
  // Klaro
  '#klaro',
  // Termly
  '.termly-styles-banner',
  // Iubenda
  '#iubenda-cs-banner',
  // Osano
  '.osano-cm-window',
  '.osano-cm-dialog',
  // Zest (ConsentTheater own / generic BEM)
  '.zest-banner',
  '.zest-banner__container',
  '[class*="zest-banner"]',
  // Generic — last resort, kept narrow
  '[role="dialog"][aria-label*="cookie" i]',
  '[role="dialog"][aria-label*="consent" i]',
  '[role="alertdialog"][aria-label*="cookie" i]'
];

// Selector prefixes that indicate a CMP regardless of exact ID/class. Used to
// promote any matching ancestor to the highest-confidence detection.
const CMP_PREFIXES = [
  'onetrust-', 'CybotCookiebot', 'usercentrics-', 'didomi-',
  'cky-', 'sp_message_', 'truste-', 'qc-cmp2-', 'klaro',
  'termly-', 'iubenda-', 'osano-', 'cc-banner', 'cc-window',
  'zest-banner', 'zest-cmp', 'zest-consent'
];

// Order matters in classifyButton(): reject > manage > accept. "I do not agree"
// matches `\bagree\b` as accept AND `do not agree` as reject — precedence picks
// reject first, which is the user's actual intent.
//
// Patterns use literal spaces (not \s+) on purpose: classifyButton() collapses
// whitespace before testing, and literal spaces avoid the overlapping-quantifier
// shapes that eslint-plugin-security's detect-unsafe-regex rule flags.
const REJECT_RE = /\b(reject|decline|deny|refuse|disagree|do(?:es)? not (?:agree|accept|allow)|don'?t (?:agree|accept|allow)|no,? thanks?|opt[- ]?out|continue without accept|(?:only |strictly )?(?:essential|necessary|required) only|rechazar(?: todo| todas)?|rejeitar(?: tudo)?|refuser(?: tout)?|alle ablehnen|ablehnen|nur (?:erforderliche|notwendige)|rifiuta(?:re)?|nessun consenso)\b/i;
const MANAGE_RE = /\b(manage|preferences|settings|customi[sz]e|let me choose|more options|see (?:options|choices)|personali[sz]ar|personnaliser|verwalten|gestire|impostazion[ei]|paramètres|einstellungen)\b/i;
const ACCEPT_RE = /\b(accept(?: all)?|agree(?: all)?|allow(?: all)?|got it|i agree|opt[- ]?in|aceptar(?: todo)?|aceitar(?: tudo)?|accepter(?: tout)?|alle akzeptieren|akzeptieren|zustimmen|accetta(?:re)?(?: tutto)?|continue|^ok$)\b/i;

/** Classify a button's text into an action. Precedence: reject > manage > accept.
 *  "I do not agree" → reject (would match accept by `agree` alone). */
function classifyButton(text: string): 'accept' | 'reject' | 'manage' | null {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (REJECT_RE.test(t)) return 'reject';
  if (MANAGE_RE.test(t)) return 'manage';
  if (ACCEPT_RE.test(t)) return 'accept';
  return null;
}

let bannerElement: HTMLElement | null = null;
let bannerReported = false;
let consentReported = false;

function truncate(s: string, max: number): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max - 1).trimEnd() + '…';
}

function visible(el: HTMLElement | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.height <= 0 || r.width <= 0) return false;
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
  return true;
}

/** Yield the document and every reachable open shadow root. Closed shadow
 *  roots are inaccessible by spec — there is no workaround for those.
 *  Used to make selector matching and text scanning shadow-aware. */
function* walkRoots(root: Document | ShadowRoot, depth = 0): IterableIterator<Document | ShadowRoot> {
  if (depth > 8) return; // bound recursion in pathological DOMs
  yield root;
  const all = root.querySelectorAll<HTMLElement>('*');
  for (const el of all) {
    const sr = (el as HTMLElement & { shadowRoot?: ShadowRoot | null }).shadowRoot;
    if (sr) yield* walkRoots(sr, depth + 1);
  }
}

/** querySelector across the document and every reachable open shadow root. */
function deepQuery(selector: string): HTMLElement | null {
  for (const root of walkRoots(document)) {
    let el: HTMLElement | null = null;
    try { el = root.querySelector<HTMLElement>(selector); } catch { /* invalid selector */ }
    if (el && visible(el)) return el;
  }
  return null;
}

/** querySelectorAll across the document and every reachable open shadow root. */
function deepQueryAll(selector: string): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const root of walkRoots(document)) {
    let nodes: NodeListOf<HTMLElement> | null = null;
    try { nodes = root.querySelectorAll<HTMLElement>(selector); } catch { /* invalid */ }
    if (nodes) for (const n of nodes) out.push(n);
  }
  return out;
}

/** Walk up to the closest ancestor whose ID or class matches a known CMP prefix.
 *  Helps when we hit an inner text node (e.g. `#onetrust-policy-text`) but want
 *  the outer banner container with the buttons. */
function climbToCmpRoot(el: HTMLElement): HTMLElement {
  let cur: HTMLElement | null = el;
  let best: HTMLElement = el;
  for (let depth = 0; cur && depth < 10; depth++, cur = cur.parentElement) {
    const id = cur.id || '';
    const cls = cur.className && typeof cur.className === 'string' ? cur.className : '';
    if (CMP_PREFIXES.some(p => id.startsWith(p) || cls.split(/\s+/).some(c => c.startsWith(p)))) {
      best = cur;
    }
  }
  return best;
}

function findBannerBySelectors(): HTMLElement | null {
  for (const sel of BANNER_SELECTORS) {
    const el = deepQuery(sel);
    if (el) return climbToCmpRoot(el);
  }
  return null;
}

/** Heuristic fallback when no known CMP selector matched. Strict on purpose:
 *  earlier versions matched site headers / footers because they happened to
 *  contain the words "cookie" + "manage" somewhere. We now require:
 *    1. Element is not the page wrapper (≤ 60% of viewport height)
 *    2. Element is positioned fixed / sticky OR has high z-index — banners
 *       are overlays, not inline page content.
 *    3. Element contains the cookie/consent/privacy keyword AND at least one
 *       child button whose own text matches accept/reject/manage (not just
 *       the parent's combined innerText).
 *  When several candidates pass, the smallest one wins (banners are focused
 *  components, not full-page chrome). */
function findBannerByText(): HTMLElement | null {
  const vh = window.innerHeight || 800;
  const candidates = deepQueryAll('div, section, aside, [role="dialog"], [role="alertdialog"]');
  type Hit = { el: HTMLElement; area: number };
  const hits: Hit[] = [];

  for (const el of candidates) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 40 || r.width < 200) continue;
    if (r.height > vh * 0.6) continue; // skip full-page wrappers

    const cs = getComputedStyle(el);
    const positioned = cs.position === 'fixed' || cs.position === 'sticky' || (cs.position === 'absolute' && Number(cs.zIndex) > 0);
    if (!positioned) continue;

    const text = (el.innerText || '').toLowerCase();
    if (!(text.includes('cookie') || text.includes('consent') || text.includes('privacy'))) continue;

    // Require at least one child button-like element whose own text triggers a
    // CTA regex, not the parent's combined innerText. Avoids false positives on
    // nav menus that contain "Manage subscription" + a "Privacy" link.
    const buttons = el.querySelectorAll<HTMLElement>('button, a[role="button"], [role="button"], [type="button"]');
    let hasCta = false;
    for (const b of buttons) {
      if (classifyButton(b.innerText || b.textContent || '')) { hasCta = true; break; }
    }
    if (!hasCta) continue;

    hits.push({ el, area: r.width * r.height });
  }

  if (hits.length === 0) return null;
  hits.sort((a, b) => a.area - b.area);
  return hits[0].el;
}

function analyzeBanner(banner: HTMLElement): ObservedBanner {
  const buttons = banner.querySelectorAll<HTMLElement>('button, a[role="button"], [role="button"], [class*="btn"], [type="button"]');
  let hasAccept = false;
  let hasReject = false;
  let hasManage = false;
  for (const b of buttons) {
    const t = (b.innerText || b.textContent || '');
    switch (classifyButton(t)) {
      case 'accept': hasAccept = true; break;
      case 'reject': hasReject = true; break;
      case 'manage': hasManage = true; break;
    }
  }
  return {
    detected: true,
    hasAcceptButton: hasAccept,
    hasRejectButton: hasReject,
    hasManageButton: hasManage,
    buttonCount: buttons.length,
    textPreview: truncate(banner.innerText || '', 200)
  };
}

function sendMessage(msg: ExtensionMessage): void {
  try { api.runtime.sendMessage(msg); } catch { /* no-op */ }
}

function reportBanner(): void {
  if (bannerReported || !bannerElement) return;
  bannerReported = true;
  sendMessage({ type: 'bannerDetected', banner: analyzeBanner(bannerElement) });
}

function reportConsent(action: 'accept' | 'reject' | 'manage'): void {
  if (consentReported) return;
  consentReported = true;
  sendMessage({ type: 'consentResolved', action });
}

function attachBannerClickHandler(banner: HTMLElement): void {
  banner.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
      'button, a, [role="button"], [type="button"]'
    );
    if (!target) return;
    const action = classifyButton(target.innerText || target.textContent || '');
    if (action) reportConsent(action);
  }, true);
}

function tryDetect(): void {
  if (bannerReported) return;
  const banner = findBannerBySelectors() || findBannerByText();
  if (banner) {
    bannerElement = banner;
    reportBanner();
    attachBannerClickHandler(banner);
  }
}

const observer = new MutationObserver(() => { if (!bannerReported) tryDetect(); });

function start(): void {
  tryDetect();
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: false });
  setTimeout(() => observer.disconnect(), 10000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}

// --- Storage reading & clearing (requested by sidebar/background) --------

function readStorage(storage: Storage): StorageEntry[] {
  const entries: StorageEntry[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      const value = storage.getItem(key) || '';
      entries.push({ key, value: value.slice(0, 500), size: value.length });
    }
  } catch { /* storage may be blocked */ }
  return entries;
}

api.runtime.onMessage.addListener((message: { type: string }, _sender, sendResponse) => {
  // Sidebar / background only ever talk to the top frame for storage operations.
  // Subframes ignore these — otherwise we'd return iframe storage as "the page's"
  // and clear iframe storage during a scan reset.
  if (!isTopFrame) return;

  if (message.type === 'getStorage') {
    // Also collect all resource domains from Performance API — this is how we know
    // which third-party domains the page contacted, even if webRequest missed them.
    const resourceDomains: string[] = [];
    try {
      const entries = performance.getEntriesByType('resource');
      const domainSet = new Set<string>();
      for (const entry of entries) {
        try {
          const host = new URL(entry.name).hostname;
          if (host) domainSet.add(host);
        } catch { /* invalid URL */ }
      }
      resourceDomains.push(...domainSet);
    } catch { /* Performance API unavailable */ }

    sendResponse({
      type: 'storageData',
      localStorage: readStorage(window.localStorage),
      sessionStorage: readStorage(window.sessionStorage),
      resourceDomains
    });
    return;
  }

  if (message.type === 'clearAllStorage') {
    let cleared = false;
    try { window.localStorage.clear(); cleared = true; } catch { /* blocked */ }
    try { window.sessionStorage.clear(); cleared = true; } catch { /* blocked */ }
    // Also clear document.cookie (JS-accessible cookies)
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const name = cookie.split('=')[0]?.trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
        }
      }
    } catch { /* blocked */ }
    sendResponse({ ok: cleared });
    return;
  }

  if (message.type === 'clearSessionStorage') {
    try { window.sessionStorage.clear(); } catch { /* blocked */ }
    sendResponse({ ok: true });
    return;
  }
});
