# ConsentTheater Privacy Policy

_Last updated: 2026-04-24_

ConsentTheater is a browser extension that audits web pages for GDPR-relevant
tracking behavior. It is built around a single rule: **nothing leaves your
browser**.

This document explains exactly what happens on your device, what we never do,
and why each browser permission is required.

## TL;DR

- We do not collect, transmit, sell, or share any personal data.
- We have no servers, no analytics, no telemetry, no accounts, no cloud sync.
- Scans are performed locally and on demand only — never in the background.
- Scan results live in memory and are cleared when the tab closes.
- The extension is fully open source under the AGPL-3.0-or-later license.

## What data the extension handles

When you click **Scan this page**, ConsentTheater inspects the page you
explicitly asked it to scan. During that scan it processes, _entirely on your
device_:

- **Cookies** for the scanned origin (to classify which are tracking cookies).
- **Outgoing network request URLs** for the scanned tab (to identify third-party
  tracker hosts).
- **Consent banner DOM text and button labels** on the scanned page (to detect
  dark-pattern banners and capture your Accept / Reject / Manage click).
- **localStorage, sessionStorage, IndexedDB** listings for the scanned origin
  (names and sizes only, not contents — and only so we can report which
  trackers stored data).

None of this leaves your browser. It is used to produce the on-screen report
and is discarded when you close the tab or close the sidebar.

## What data the extension stores

ConsentTheater writes a small amount of data to your browser's local
extension storage (`chrome.storage.local` / `browser.storage.local`). This
storage lives on your device, is scoped to the extension, and is not
synchronized to any cloud:

- Your **UI preferences** (theme, dark mode, high-contrast mode, language).
- The **Playbill tracker catalogue version** the extension is using (a single
  string like `0.1.3`, so the sidebar can display which version you have).

There are no identifiers, no scan history, no per-site data, and no timestamps
in this storage. Uninstalling the extension removes it.

## What data the extension does not collect

- No browsing history.
- No visited URLs.
- No IP address, user agent, or device fingerprint.
- No page contents beyond what is explicitly required for the scan above.
- No form data, passwords, cookies _you_ own (login sessions, carts, etc.),
  or anything bound to your identity on other sites.
- No telemetry, crash reports, or "anonymous usage statistics".
- No advertising identifiers.

## Network activity

The extension performs **zero** outbound network requests to ConsentTheater or
any third party during normal use.

The only bundled remote resource is the tracker catalogue
([`@consenttheater/playbill`](https://github.com/ConsentTheater/playbill)),
which is **bundled into the extension at build time**. No runtime fetch, no
CDN call, no update check initiated by the extension. Catalogue updates ship
through normal browser extension updates (Chrome Web Store, Firefox AMO).

## Permissions — why each one is requested

| Permission                    | Why it is needed                                                                 |
|-------------------------------|----------------------------------------------------------------------------------|
| `cookies`                     | Read and clear cookies for the scanned origin, so the scan starts from a clean slate and so the report can classify which cookies were set. |
| `storage`                     | Save your UI preferences (theme, language) in local extension storage.           |
| `tabs`                        | Know which tab you want to scan and re-sync the sidebar when you switch tabs.    |
| `activeTab`                   | Inspect the currently active tab when you click **Scan**.                        |
| `scripting`                   | Inject the banner-detection content script into the tab being scanned.           |
| `webRequest`                  | Observe outgoing requests during a scan to identify third-party tracker hosts.   |
| `webNavigation`               | Know when the scanned tab finishes reloading, so the scan can capture pre-consent requests reliably. |
| `browsingData`                | Clear `localStorage`, `sessionStorage`, `IndexedDB`, `cacheStorage`, and service workers for the scanned origin before the scan reloads the page — this is how we measure the _first visit_ state a real user would see. |
| `sidePanel` (Chrome only)     | Open the ConsentTheater sidebar from the toolbar icon.                           |
| `<all_urls>` (host access)    | Required for the above APIs to cover any site you might want to scan. The content script is only active on the tab where you click **Scan**. |

No permission is used for any purpose other than the ones listed above.

## Scan model — why it is on demand

ConsentTheater does **not** passively analyze every page you visit, even though
its host permission covers all URLs. The scan pipeline only runs when you
click **Scan this page**. This is a deliberate product decision:

- Your normal browsing is never observed.
- A scan requires wiping cookies and storage for the origin and reloading the
  tab — something we would never do without an explicit action from you.
- There is no passive "recent activity" log to leak.

## Data retention

- Scan reports live in the extension's service worker memory for the lifetime
  of the tab. They are cleared when the tab closes or when the service worker
  is evicted by the browser.
- There is nothing to export, no "delete my data" request to fulfill — because
  there is no account, no cloud, and no server-side copy.

## Open source

The full source code, manifest, and build pipeline are published under
**AGPL-3.0-or-later** at
[github.com/ConsentTheater/extension](https://github.com/ConsentTheater/extension).
The tracker catalogue is published separately under the same license at
[github.com/ConsentTheater/playbill](https://github.com/ConsentTheater/playbill).
You can verify every claim in this document by reading the code.

## Children

ConsentTheater is a general-purpose privacy tool and is not directed at
children under 13. We do not knowingly collect information from anyone,
including children.

## Changes to this policy

Substantive changes to this policy will be noted in the extension's
[CHANGELOG](https://github.com/ConsentTheater/extension/releases) and in
the commit history of this file.

## Contact

- Email: **developer@consenttheater.org**
- Issues: [github.com/ConsentTheater/extension/issues](https://github.com/ConsentTheater/extension/issues)
- Website: [consenttheater.org](https://consenttheater.org)
