/**
 * Cross-browser API accessor. Uses `browser` (Firefox) when present, falls back to `chrome`.
 * Safe to import from UI, background, and content contexts.
 */
declare const browser: typeof chrome | undefined;

export const browserAPI: typeof chrome = (() => {
  if (typeof browser !== 'undefined' && (browser as typeof chrome | undefined)?.runtime) {
    return browser as typeof chrome;
  }
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    return chrome;
  }
  throw new Error('ConsentTheater: no browser extension API available');
})();
