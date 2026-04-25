/**
 * HAR 1.2 recorder.
 *
 * Hooks into webRequest events to assemble HAR entries during a scan. Pure
 * bookkeeping — no browser API calls, no I/O. Background owns the listener
 * registration and feeds events here.
 *
 * What we capture:
 *   - method, url, type (from onBeforeRequest)
 *   - request headers (from onSendHeaders)
 *   - status, response headers (from onHeadersReceived)
 *   - serverIPAddress, fromCache (from onResponseStarted / onCompleted)
 *   - approximate timings derived from event timestamps
 *   - per-entry Playbill enrichment if the host matches a known tracker
 *
 * What we do NOT capture (extension API limit):
 *   - Request bodies (postData) — rarely visible to webRequest in MV3
 *   - Response bodies (content.text) — needs chrome.debugger which prompts
 *     the user on every scan; UX cost not worth it
 *
 * The resulting HAR opens cleanly in Charles, HTTPToolkit, browser DevTools,
 * and `har-cli` tools that don't require body content.
 */
import type {
  HarLog, HarEntry, HarHeader, HarQuery, HarTimings
} from '@/lib/har-types';
import type { DomainMatch } from '@/lib/tracker-matcher';

/** A still-in-flight request. We promote it to a finalized HarEntry on completion. */
interface PartialEntry {
  requestId: string;
  startedAt: number;
  /** Cap above which extra requests are silently dropped to keep memory bounded. */
  url: string;
  method: string;
  type?: string;
  requestHeaders: HarHeader[];
  responseHeaders: HarHeader[];
  status: number;
  statusText: string;
  fromCache: boolean;
  serverIp?: string;
  /** Event timestamps (ms) for timing computation. */
  ts: {
    requestStart?: number;
    sendHeadersAt?: number;
    responseStartAt?: number;
    completeAt?: number;
  };
  beforeConsent: boolean;
  match?: DomainMatch | null;
  error?: string;
}

const ENTRY_CAP = 5000;

export interface HarRecorderState {
  /** Open requests keyed by webRequest requestId. */
  pending: Map<string, PartialEntry>;
  /** Finalized entries, in completion order. */
  entries: PartialEntry[];
  /** Page-level info — captured at scan start. */
  page: {
    startedDateTime: string;
    title: string;
    onLoad?: number;
  } | null;
}

export function newHarRecorderState(): HarRecorderState {
  return { pending: new Map(), entries: [], page: null };
}

export function resetHar(state: HarRecorderState): void {
  state.pending.clear();
  state.entries.length = 0;
  state.page = null;
}

export function startPage(state: HarRecorderState, title: string): void {
  state.page = { startedDateTime: new Date().toISOString(), title };
}

export function markPageOnLoad(state: HarRecorderState, ts: number): void {
  if (state.page && state.page.onLoad === undefined) {
    state.page.onLoad = Math.round(ts);
  }
}

export function recordRequest(
  state: HarRecorderState,
  requestId: string,
  url: string,
  method: string,
  type: string | undefined,
  ts: number,
  beforeConsent: boolean,
  match: DomainMatch | null
): void {
  if (state.entries.length + state.pending.size >= ENTRY_CAP) return;
  state.pending.set(requestId, {
    requestId,
    startedAt: Date.now(),
    url,
    method,
    type,
    requestHeaders: [],
    responseHeaders: [],
    status: 0,
    statusText: '',
    fromCache: false,
    ts: { requestStart: ts },
    beforeConsent,
    match
  });
}

export function recordRequestHeaders(
  state: HarRecorderState,
  requestId: string,
  headers: chrome.webRequest.HttpHeader[] | undefined,
  ts: number
): void {
  const e = state.pending.get(requestId);
  if (!e) return;
  e.requestHeaders = mapHeaders(headers);
  e.ts.sendHeadersAt = ts;
}

export function recordResponseHeaders(
  state: HarRecorderState,
  requestId: string,
  statusCode: number,
  statusLine: string | undefined,
  headers: chrome.webRequest.HttpHeader[] | undefined,
  ts: number
): void {
  const e = state.pending.get(requestId);
  if (!e) return;
  e.status = statusCode;
  e.statusText = parseStatusText(statusLine, statusCode);
  e.responseHeaders = mapHeaders(headers);
  e.ts.responseStartAt = ts;
}

export function recordResponseStarted(
  state: HarRecorderState,
  requestId: string,
  ip: string | undefined,
  fromCache: boolean,
  ts: number
): void {
  const e = state.pending.get(requestId);
  if (!e) return;
  if (ip) e.serverIp = ip;
  e.fromCache = fromCache || e.fromCache;
  if (!e.ts.responseStartAt) e.ts.responseStartAt = ts;
}

export function recordComplete(
  state: HarRecorderState,
  requestId: string,
  ts: number
): void {
  const e = state.pending.get(requestId);
  if (!e) return;
  e.ts.completeAt = ts;
  state.pending.delete(requestId);
  state.entries.push(e);
}

export function recordError(
  state: HarRecorderState,
  requestId: string,
  error: string,
  ts: number
): void {
  const e = state.pending.get(requestId);
  if (!e) return;
  e.error = error;
  e.ts.completeAt = ts;
  state.pending.delete(requestId);
  state.entries.push(e);
}

/**
 * Build a complete HAR 1.2 log object from the recorder state. Pure function —
 * call this at export time, not in the hot path.
 */
export function buildHar(
  state: HarRecorderState,
  meta: { extensionVersion: string; browserName: string; browserVersion: string }
): HarLog {
  const pageId = 'page_1';
  const pageStart = state.page?.startedDateTime || new Date().toISOString();
  const entries = state.entries.map(e => toHarEntry(e, pageId));

  return {
    log: {
      version: '1.2',
      creator: {
        name: 'ConsentTheater',
        version: meta.extensionVersion,
        comment: 'https://consenttheater.org — bodies are not captured (browser-extension API limit)'
      },
      browser: { name: meta.browserName, version: meta.browserVersion },
      pages: [{
        startedDateTime: pageStart,
        id: pageId,
        title: state.page?.title || 'ConsentTheater scan',
        pageTimings: {
          onContentLoad: -1,
          onLoad: state.page?.onLoad ?? -1
        }
      }],
      entries
    }
  };
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function mapHeaders(headers: chrome.webRequest.HttpHeader[] | undefined): HarHeader[] {
  if (!headers) return [];
  return headers
    .filter(h => h && typeof h.name === 'string')
    .map(h => ({ name: h.name, value: typeof h.value === 'string' ? h.value : '' }));
}

function parseStatusText(line: string | undefined, code: number): string {
  if (!line) return '';
  // statusLine looks like "HTTP/1.1 200 OK"
  const m = /^HTTP\/[\d.]+\s+\d+\s+(.*)$/.exec(line);
  if (m) return m[1];
  // Fallback: derive from code if statusLine couldn't be parsed
  return code === 200 ? 'OK' : '';
}

function parseQueryString(url: string): HarQuery[] {
  try {
    const u = new URL(url);
    const params: HarQuery[] = [];
    u.searchParams.forEach((value, name) => params.push({ name, value }));
    return params;
  } catch { return []; }
}

function parseHttpVersion(headers: HarHeader[]): string {
  // webRequest doesn't surface protocol directly; default to HTTP/1.1.
  // If a `:method` header is present, this is HTTP/2.
  if (headers.some(h => h.name.toLowerCase().startsWith(':'))) return 'HTTP/2';
  return 'HTTP/1.1';
}

function findHeader(headers: HarHeader[], name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const h of headers) if (h.name.toLowerCase() === lower) return h.value;
  return undefined;
}

function timings(e: PartialEntry): { timings: HarTimings; total: number } {
  const t = e.ts;
  const reqStart = t.requestStart ?? 0;
  const respStart = t.responseStartAt ?? reqStart;
  const complete = t.completeAt ?? respStart;
  const wait = Math.max(0, Math.round(respStart - reqStart));
  const receive = Math.max(0, Math.round(complete - respStart));
  const total = wait + receive;
  return {
    timings: {
      blocked: -1,
      dns: -1,
      connect: -1,
      send: 0,
      wait,
      receive,
      ssl: -1
    },
    total
  };
}

function toHarEntry(e: PartialEntry, pageId: string): HarEntry {
  const { timings: timingObj, total } = timings(e);
  const httpVersion = parseHttpVersion(e.responseHeaders);
  const mimeType = findHeader(e.responseHeaders, 'content-type') ?? '';
  const contentLength = Number(findHeader(e.responseHeaders, 'content-length') ?? -1);
  const redirect = findHeader(e.responseHeaders, 'location') ?? '';

  return {
    pageref: pageId,
    startedDateTime: new Date(e.startedAt).toISOString(),
    time: total,
    request: {
      method: e.method,
      url: e.url,
      httpVersion,
      cookies: [],
      headers: e.requestHeaders,
      queryString: parseQueryString(e.url),
      headersSize: -1,
      bodySize: -1
    },
    response: {
      status: e.status,
      statusText: e.statusText,
      httpVersion,
      cookies: [],
      headers: e.responseHeaders,
      content: { size: Number.isFinite(contentLength) ? contentLength : -1, mimeType },
      redirectURL: redirect,
      headersSize: -1,
      bodySize: -1,
      ...(e.error ? { _error: e.error } : {})
    },
    cache: {},
    timings: timingObj,
    ...(e.serverIp ? { serverIPAddress: e.serverIp } : {}),
    _consent_theater: {
      company: e.match?.company,
      service: e.match?.service,
      category: e.match?.category,
      consent_burden: e.match?.consent_burden,
      matched_domain: e.match?.matchedDomain,
      before_consent: e.beforeConsent
    }
  };
}
