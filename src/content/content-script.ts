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

const BANNER_SELECTORS = [
  '#onetrust-banner-sdk',
  '#CybotCookiebotDialog',
  '#usercentrics-root',
  '#didomi-notice',
  '.cky-consent-container',
  '.cookie-banner',
  '.cookie-consent',
  '#cookie-consent',
  '.consent-banner',
  '#gdpr-banner',
  '[class*="cookie-banner"]',
  '[class*="consent-banner"]',
  '[role="dialog"][aria-label*="cookie" i]',
  '[role="dialog"][aria-label*="consent" i]'
];

const ACCEPT_RE = /\b(accept|agree|allow|allow all|ok|got it|i agree|opt.?in|aceptar|aceitar|accepter|zustimmen|accetta)\b/i;
const REJECT_RE = /\b(reject|decline|deny|refuse|opt.?out|no thanks|rechazar|rejeitar|ablehnen|rifiuta)\b/i;
const MANAGE_RE = /\b(manage|preferences|settings|customize|personalizar|personnaliser|verwalten|gestire)\b/i;

let bannerElement: HTMLElement | null = null;
let bannerReported = false;
let consentReported = false;

function visible(el: HTMLElement | null): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.height > 0 && r.width > 0;
}

function findBannerBySelectors(): HTMLElement | null {
  for (const sel of BANNER_SELECTORS) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el && visible(el)) return el;
  }
  return null;
}

function findBannerByText(): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>('div, section, aside, [role="dialog"]');
  for (const el of candidates) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.height < 40 || r.width < 200) continue;
    const text = (el.innerText || '').toLowerCase();
    if ((text.includes('cookie') || text.includes('consent') || text.includes('privacy')) &&
        (text.includes('accept') || text.includes('reject') || text.includes('manage'))) {
      return el;
    }
  }
  return null;
}

function analyzeBanner(banner: HTMLElement): ObservedBanner {
  const buttons = banner.querySelectorAll<HTMLElement>('button, a[role="button"], [class*="btn"], [type="button"]');
  let hasAccept = false;
  let hasReject = false;
  let hasManage = false;
  for (const b of buttons) {
    const t = (b.innerText || b.textContent || '').trim();
    if (ACCEPT_RE.test(t)) hasAccept = true;
    if (REJECT_RE.test(t)) hasReject = true;
    if (MANAGE_RE.test(t)) hasManage = true;
  }
  return {
    detected: true,
    hasAcceptButton: hasAccept,
    hasRejectButton: hasReject,
    hasManageButton: hasManage,
    buttonCount: buttons.length,
    textPreview: (banner.innerText || '').slice(0, 200)
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
    const text = (target.innerText || target.textContent || '').trim();
    if (REJECT_RE.test(text)) reportConsent('reject');
    else if (ACCEPT_RE.test(text)) reportConsent('accept');
    else if (MANAGE_RE.test(text)) reportConsent('manage');
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
