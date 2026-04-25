/**
 * Runtime-message contract between the sidebar (UI), content script, and background.
 *
 * Keep this file the single source of truth — every sender and handler imports from here.
 */
import type { ObservedBanner, ObservedCookie, ObservedRequest } from '@/lib/observations';

export type ConsentAction = 'accept' | 'reject' | 'manage';

export type TestPhase = 'idle' | 'testing' | 'reporting' | 'monitoring';

export type ExtensionMessage =
  // Live inspector
  | { type: 'getLiveCookies'; tabId: number }
  | { type: 'getStorage'; }
  | { type: 'clearAll'; tabId: number }
  | { type: 'cookiesChanged'; tabId: number }
  // Playbill metadata
  | { type: 'getDbStats' }
  // GDPR test
  | { type: 'runTest'; tabId: number }
  | { type: 'getState'; tabId: number }
  | { type: 'getReport'; tabId: number }
  | { type: 'getHar'; tabId: number }
  // Content script → background
  | { type: 'bannerDetected'; banner: ObservedBanner }
  | { type: 'consentResolved'; action: ConsentAction }
  // Content script → sidebar (storage data)
  | { type: 'storageData'; localStorage: StorageEntry[]; sessionStorage: StorageEntry[]; resourceDomains: string[] }
  // Background → sidebar
  | { type: 'reportReady'; tabId: number }
  | { type: 'reportUpdated'; tabId: number };

/** Playbill stats response — counts reported by the loaded DB. */
export interface DbStatsResponse {
  cookies: number;
  domains: number;
  companies: number;
  total: number;
  tier: string;
  /** Playbill npm package version (e.g. "0.1.2"). Injected at build time. */
  packageVersion: string;
  /** Playbill schema version (bumps when the on-disk JSON shape changes). */
  schemaVersion: number;
  /** ISO timestamp of when loadPlaybill() ran — usually service-worker startup. */
  generated: string;
}

/** A key-value pair from localStorage or sessionStorage. */
export interface StorageEntry {
  key: string;
  value: string;
  size: number;
}

/** A cookie as seen by the live inspector (raw from chrome.cookies API). */
export interface LiveCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expirationDate?: number;
  /** Enrichment from Playbill (null if unknown) */
  company?: string;
  service?: string;
  category?: string;
  consent_burden?: string;
  description?: string;
  lifetime?: string;
  docs_url?: string;
  /** Whether this cookie's domain differs from the page domain */
  isThirdParty: boolean;
  /** Heuristic pattern detection — catches unknown trackers by name/value patterns */
  suspicionLevel?: 'high' | 'medium' | 'low' | 'none';
  suspicionReasons?: string[];
}

/** A third-party host the tab has contacted, enriched from Playbill if known. */
export interface LiveTracker {
  hostname: string;
  /** Number of requests this tab has made to this host since last navigation */
  count: number;
  /** Playbill enrichment (null if unknown third party) */
  company?: string;
  service?: string;
  category?: string;
  consent_burden?: string;
  note?: string;
  docs_url?: string;
  /** Which key in the Playbill domains dict matched (e.g. 'hubspot.com' for 'track-eu1.hubspot.com') */
  matchedDomain?: string;
}

/** Live inspector response — all cookies for the current tab's site. */
export interface LiveCookiesResponse {
  cookies: LiveCookie[];
  trackers: LiveTracker[];
  url: string;
  hostname: string;
}

/** Raw captured item with enriched metadata for the Test view. */
export interface CapturedCookie extends ObservedCookie {
  beforeConsent: boolean;
}

export interface CapturedRequest extends ObservedRequest {
  url?: string;
  type?: string;
  beforeConsent: boolean;
}

export interface Report {
  stats: {
    preConsentCookies: number;
    preConsentRequests: number;
    dataLeakRequests: number;
    totalCookies: number;
    totalRequests: number;
    bannerDetected: boolean;
    consentAction: ConsentAction | null;
  };
  banner: ObservedBanner | null;
  cookies: CapturedCookie[];
  requests: CapturedRequest[];
  origin: string | null;
  phase: TestPhase;
  finishedAt: number;
}

export interface StateResponse {
  phase: TestPhase;
  hasReport: boolean;
  report: Report | null;
}

export interface TestResponse {
  ok?: boolean;
  scanWindowMs?: number;
  error?: string;
}

export interface ReportResponse {
  report: Report | null;
  phase?: TestPhase;
}

export interface ClearAllResponse {
  ok: boolean;
  cookiesCleared: number;
  storageCleared: boolean;
}
