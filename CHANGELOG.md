# Changelog

All notable changes to the ConsentTheater extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.0] — 2026-09-05

### Highlights

A dependency and data release. Bumps `@consenttheater/playbill`
0.6.0 → 0.7.0 — the catalogue grew to 10,599 entries (4,208 cookies +
6,391 domains, 3,003 companies) with 3 new consent cookies and 1 consent
domain — and refreshes all dev dependencies except `typescript`
(held at 6.0.3).

### Changed

- **Bumped `@consenttheater/playbill` to 0.7.0.** New consent cookies:
  SureCookie session identifier (`surecookie_session_id`, Brainstorm
  Force) and WebToffee GDPR Cookie Consent state (`wt_consent`), both
  reported by Pasi R. — thanks for the report and support. Zest CMP
  per-category consent state (`zest_consent`). New consent domain:
  `geo.cookiezest.com` (Zest geo jurisdiction API). Record counts in
  Settings and all exports are read from the installed Playbill at
  runtime, so they update automatically.
- **Dependency refresh.** All devDependencies bumped to current
  (vite 8.2.2, eslint 10.10.0, typescript-eslint 8.69.0, addons-linter
  10.10.0, @types/node 26.4.1, sharp 0.35.4, among others). `typescript`
  intentionally held at 6.0.3 — 7.x is the native (Go) port and is not
  yet supported by `typescript-eslint`. `vitest` held at 4.x (5.0 is a
  major). Full verify loop green: typecheck, lint, 16/16 tests,
  Chrome + Firefox builds, both store validators.

## [0.6.0] — 2026-07-10

### Highlights

A feature release. Bumps `@consenttheater/playbill` 0.5.0 → 0.6.0 (schema v3
— 4,109 cookies, 6,087 domains, 3,000 companies), adds a HAR sanitizer
toggle for safe export sharing, surfaces Playbill version + record counts
in every export format, and introduces report-page localisation for five
languages (English, Spanish, French, German, Italian).

### Added

- **Report page localisation (EN / ES / FR / DE / IT).** The PDF / print
  report page now has a language dropdown in the toolbar. Default is
  English; selecting a language re-renders the entire report — title,
  section headings, table headers, legend, footer, banner status labels
  — in the chosen language. Only the report page is translated; the
  sidebar UI stays English. Strings live in `src/ui/i18n/report.ts`.
- **HAR Sanitizer toggle in Settings.** New On/Off setting (default On,
  under the Playbill Database card, before appearance options). When on,
  HAR exports redact sensitive header values — Cookie and Set-Cookie
  values are replaced with `[redacted]` while cookie names are preserved
  for audit (e.g. `_ga=[redacted]`); Authorization, Proxy-Authorization,
  X-API-Key, X-Auth-Token, and X-Access-Token values are fully redacted.
  When off, exports the raw HAR as captured. Applied as a pure
  `sanitizeHarLog()` pass before `JSON.stringify` in both LiveView and
  TestView export paths.
- **Playbill version + record counts in report exports.** The `Report`
  type now carries a `playbill` block (packageVersion, schemaVersion,
  cookies / domains / companies / total counts) populated by
  `buildReport` and `buildLiveReport`. The PrintReport PDF footer and
  the TestView text-export now show the catalogue version, schema
  version, and entry counts with a link to
  `codeberg.org/ConsentTheater/playbill`. The HAR `creator.comment`
  field also includes the Playbill version and codeberg link.

### Fixed

- **Settings now shows the *installed* Playbill version, not the declared
  range.** The build injected `__PLAYBILL_VERSION__` from the `^x.y.z`
  range in `devDependencies` (with `^` stripped), so the version froze at
  the range floor even after npm resolved a newer in-range build into
  `node_modules`. `build.js` now reads the version straight from the
  installed package's own `package.json`, so it always reflects what's
  actually bundled.
- **Burden chip no longer breaks across lines in PDF exports.**
  `required_strict` was rendered with a regular space, letting it wrap
  mid-label in printed/PDF output. The underscore is now replaced with a
  non-breaking space (`\u00a0`).
- **Settings icon alignment.** Icons in the Playbill Database, HAR
  Sanitizer, High Contrast, and Font Size cards now use `shrink-0` and
  `items-start` alignment for consistent spacing with multi-line labels.

### Changed

- **`@consenttheater/playbill` 0.5.0 → 0.6.0.** Schema v3 — 4,109
  cookies, 6,087 domains, 3,000 companies (10,196 merged signatures, up
  from 10,151). API surface unchanged; the extension picks up the new
  data automatically via `loadPlaybill('full')`.
- **Dev-dependency refresh.** Major bumps: TypeScript 5.9 → 6.0,
  `@types/node` 25 → 26, `@types/chrome` 0.1 → 0.2, `sharp` 0.34 → 0.35,
  `@radix-ui/react-slot` 1.2 → 1.3. Minor / patch bumps across
  `@radix-ui/react-*`, `@tailwindcss/vite`, `tailwindcss`, `vite`,
  `vitest` / `@vitest/ui`, `eslint`, `eslint-plugin-security`,
  `typescript-eslint`, `fs-extra`, `postcss`, `preact`, `esbuild`,
  `addons-linter`. TypeScript 7.0 is available but held back —
  `typescript-eslint` does not yet support the native Go port
  (tracked in `typescript-eslint#10940`).

## [0.5.0] — 2026-06-07

### Highlights

A data-refresh release. Bumps `@consenttheater/playbill` 0.4.0 → 0.5.0 —
the same matching API, materially more knowledge underneath. Settings
now shows **4,064 cookies / 6,087 domains / 2,998 companies (10,151
unique signatures)** — the size of the in-memory tracker map after
category merge, which is what the extension actually checks against on
every scan. No extension code changed beyond version bumps; the Settings
page reads `playbill.stats` over the wire from the background, so the
new totals appear automatically the moment the package is rebuilt.

### Changed

- **`@consenttheater/playbill` 0.4.0 → 0.5.0.** Continued data-quality
  work and broader coverage across the catalogue: merged signatures grow
  from 10,113 → 10,151 (cookies 4,028 → 4,064, domains 6,085 → 6,087,
  companies 2,992 → 2,998). API surface (`loadPlaybill`, `matchCookie`,
  `matchDomain`, `Playbill.stats`) unchanged; no extension-side code
  changes were required.
- **Dev-dependency refresh.** Patch / minor bumps for
  `@radix-ui/react-*`, `@types/chrome` 0.1.42 → 0.1.43,
  `@types/node` 25.9.1 → 25.9.2, `typescript-eslint` 8.60.0 → 8.60.1,
  `vite` 8.0.14 → 8.0.16, `vitest` / `@vitest/ui` 4.1.7 → 4.1.8. No
  runtime impact on the shipped extension.
- Source links in the extension UI now point to Codeberg — active
  development moved there; GitHub is a read-only mirror.
- Minimum Node version for building from source raised to 24.

### Notes

- The number of merged signatures (10,151) is smaller than the raw
  per-category total reported by Playbill's own README (~10,550), because
  some keys are categorised in two actor files and `loadPlaybill` does
  last-write-wins on merge. Settings shows the merged figure on purpose —
  that's what the matcher actually consults at runtime.

## [0.4.0] — 2026-05-09

### Highlights

A data-refresh release. Bumps `@consenttheater/playbill` 0.3.0 → 0.4.0 —
the same matching API, materially more knowledge underneath. Settings
now shows **4,028 cookies / 6,085 domains / 2,992 companies (10,113
unique signatures)** — the size of the in-memory tracker map after
category merge, which is what the extension actually checks against on
every scan. No extension code changed beyond version bumps; the Settings
page reads `playbill.stats` over the wire from the background, so the
new totals appear automatically the moment the package is rebuilt.

### Changed

- **`@consenttheater/playbill` 0.3.0 → 0.4.0.** Continued data-quality
  work on top of the cross-file collision report shipped in 0.3.0:
  remaining `COMPANY MISMATCH` cases narrowed (cookie collisions
  91, domain collisions 300 — down from 109 / 344 in 0.3.0), broader
  coverage across advertising / analytics / marketing categories. API
  surface (`loadPlaybill`, `matchCookie`, `matchDomain`, `Playbill.stats`)
  unchanged; no extension-side code changes were required.
- **Dev-dependency refresh.** Patch / minor bumps for
  `tailwindcss` 4.2 → 4.3, `@tailwindcss/vite` 4.2 → 4.3,
  `vite` 8.0.10 → 8.0.11, `eslint` 10.2 → 10.3,
  `typescript-eslint` 8.59.0 → 8.59.2, `addons-linter` 10.3 → 10.4,
  `postcss` 8.5.10 → 8.5.14, `fs-extra` 11.3.4 → 11.3.5,
  `@types/chrome` 0.1.40 → 0.1.42, `@types/node` 25.6.0 → 25.6.2,
  plus `archiver` 7 → 8 (release-zip script only — output format
  unchanged). No runtime impact on the shipped extension.

### Notes

- The number of merged signatures (10,113) is smaller than the raw
  per-category total reported by Playbill's own README (~10,500), because
  some keys (e.g. cookie `OTZ`, domain `bitbucket.org`) are categorised
  in two actor files and `loadPlaybill` does last-write-wins on merge.
  Settings shows the merged figure on purpose — that's what the matcher
  actually consults at runtime.

## [0.3.0] — 2026-05-01

### Highlights

A Firefox-stability + UX-polish release. The 0.2.0 launch surfaced a few
real-world bugs (toolbar icon doing nothing on Firefox, scan never
finishing, exports gated behind a clear-and-reload Test) and a couple of
gaps in the banner detector (shadow DOM, iframe-hosted CMPs, "I do not
agree" misclassified as Accept). Everything below is driven by reports
from sites users actually scanned: BBC, Spiegel, Demandbase (Ketch CMP),
plus the Firefox AMO listing once it went live.

### Added

- **Always-on export bar.** The Copy / PDF / HAR buttons are now visible
  and clickable from the moment the sidebar opens — no need to run Test
  first. Copy and PDF fall back to a "live snapshot" built from
  `chrome.cookies` + the live tracker map for the current tab; HAR still
  needs a Test (webRequest capture only arms during the scan window) and
  surfaces an in-sidebar toast when clicked without one. Lets users open
  the sidebar, click Accept on a banner manually, then export the
  resulting cookie state.
- **Live snapshot mode for the PDF report.** When the report is built
  from live data instead of a Test scan, the PDF page renders a
  paper-friendly snapshot — single "Cookies on this page" + "Third-party
  hosts contacted" tables, no before/after-consent split, with an amber
  callout up top explaining the difference and pointing the user at the
  Test button for a timeline-based report.
- **In-sidebar toast component.** Replaces native `alert()` calls with a
  card-styled message that sits just above the action bar, auto-dismisses
  after 5 s, can be dismissed manually with `×`, and stays accessible
  (solid surfaces, no transparency / blur, `role="status"`,
  `aria-live="polite"`).

### Fixed

- **Firefox toolbar icon was a no-op** on every build that shipped HAR.
  Root cause: the HAR recorder registered `webRequest.onSendHeaders` /
  `onHeadersReceived` with `'extraHeaders'` in `extraInfoSpec`, which is
  a Chrome-only value. Firefox throws synchronously inside
  `addListener()` when it sees an unknown spec value, which took the
  whole background script down before the
  `action.onClicked → sidebarAction.toggle()` wiring could register.
  Both registrations are now wrapped in try/catch and fall back to the
  Firefox-compatible spec (no `extraHeaders`). Chrome behaviour is
  unchanged; Firefox already surfaces Cookie / Set-Cookie / Authorization
  in webRequest events without the opt-in.
- **Firefox scan never reached the export bar.** Even after the toolbar
  was clickable, clicking Test cleared cookies + reloaded the tab, but
  the scan finalised silently and the buttons never lit up. Root cause:
  Firefox fires `tabs.onUpdated` with `changeInfo.url` on same-URL
  reloads (Chrome only fires it on real URL changes). Our
  `tabs.onUpdated` handler was clearing per-tab scan state on every
  url-change event — including the reload triggered by the scan itself.
  Now we only drop accumulated scan state when the new origin differs
  from the one we are scanning; same-origin reloads keep the in-flight
  state intact.
- **"I do not agree" was classified as Accept.** BBC's Reject button
  reads "I do not agree", which matched `\bagree\b` in `ACCEPT_RE`.
  Replaced the three independent regex tests with `classifyButton(text)`
  — reject > manage > accept precedence with negation patterns
  (`do/does/don't (not) agree/accept/allow`, `disagree`,
  "Continue without accepting", "Only essential / Strictly necessary",
  plus DE / FR / ES / IT / PT variants). Same precedence is used for the
  click-capture handler, so the recorded consent action now matches what
  the user actually clicked.
- **Iframe-hosted CMPs (Sourcepoint, Funding Choices, …)** were
  invisible to the banner detector — content script only ran on the top
  frame. Flipped both manifests to `all_frames: true`; storage and
  clear-all handlers stay top-frame-only via an `isTopFrame` guard at
  the top of `runtime.onMessage`.
- **Shadow-DOM-hosted banners** weren't reachable via
  `document.querySelector`. Added `walkRoots()` / `deepQuery()` /
  `deepQueryAll()` helpers that recurse into open shadow roots, and use
  them in both `findBannerBySelectors` and `findBannerByText`. Closed
  shadow roots remain inaccessible by spec — documented in code, not
  worked around.
- **Stricter heuristic fallback for unknown CMPs** — `findBannerByText`
  now requires (a) candidate ≤ 60 % of viewport height, (b) `position:
  fixed | sticky` (or `absolute` with a positive z-index), and (c) at
  least one child button-like element whose own text matches a CTA. Site
  headers / nav menus that happened to contain "manage" + "privacy" no
  longer false-trigger as banners; smallest matching candidate wins when
  several pass.

### Added — banner support

- **Ketch CMP** (used by Demandbase and others). Selectors:
  `#ketch-purposes-modal`, `#ketch-modal`, `[id^="ketch-"][role="dialog"]`,
  plus `ketch-modal` / `ketch-purposes` / `ketch-banner` /
  `ketch-experience` prefixes for `climbToCmpRoot`.
- More OneTrust child IDs (`#onetrust-consent-sdk`, `#onetrust-pc-sdk`),
  Cookiebot body container, Usercentrics CMP UI, Didomi host, CookieYes
  modal, Sourcepoint, TrustArc, Quantcast Choice, Klaro, Termly, Iubenda,
  Osano. Built off real scans, not guesses.

### Changed

- **`@consenttheater/playbill` 0.2.0 → 0.3.0.** Data-quality release
  driven by ten end-to-end scans of major B2B SaaS sites. Notable
  re-attributions: `_dd_s` → Datadog Browser SDK (was DataDome bot
  protection); `_gd_session` / `_gd_svisitor` / `_gd_visitor` → 6sense
  Visitor ID (was "Google Analytics Debug"). Tooling: `normalize.js` now
  reports cross-file collisions and explicitly flags `COMPANY MISMATCH`
  cases — surfaced 109 cookie + 344 domain collisions as a backlog. API
  surface unchanged; no extension code changes were required.
- **No more emoji in the Firefox toolbar title.** Both `action` and
  `sidebar_action` `default_title` are plain `"ConsentTheater"`, matching
  the Chrome manifest.

## [0.2.0] — 2026-04-26

### Breaking changes

This release reframes ConsentTheater around **observation**, not judgement —
in lockstep with `@consenttheater/playbill` 0.2.0.

#### Site-level verdict removed

The 0–100 compliance score and the "Compliant / At Risk / Non-Compliant /
Violating" risk bands are gone. Whether a site is compliant overall is a legal
question for a DPA, a court, or your DPO; the extension does not pretend to be
a regulator. The Scan view now lists the consent banner shape, the cookies set
before consent, and the requests fired before consent — the raw facts an
auditor needs.

#### `severity` → `consent_burden`

Tracker entries no longer carry `critical / high / medium / low` severities.
The new field is `consent_burden` with values `required_strict / required /
contested / minimal`, mirroring the Playbill data model. Same hierarchy,
honester labels.

| Old severity | New consent_burden | Meaning                                          |
|--------------|--------------------|--------------------------------------------------|
| `critical`   | `required_strict`  | Cross-site profiling, ad-tech, fingerprinting    |
| `high`       | `required`         | Standard analytics / marketing                   |
| `medium`     | `contested`        | Jurisdiction-dependent                           |
| `low`        | `minimal`          | Functional / security / strictly-necessary       |

### Removed
- `src/lib/risk-score.ts` and its `computeScore`, `bandForScore`,
  `SEVERITY_WEIGHTS`, `BANDS`, `Violation`, `ScoreResult` exports.
- `Verdict.tsx` and `ViolationList.tsx` UI components.
- `--band-compliant`, `--band-at-risk`, `--band-non-compliant`, `--band-violating`
  CSS color tokens.
- The `severity-weighted` toolbar badge — it now shows a green `✓` when nothing
  fired pre-consent and the pre-consent count in red otherwise.
- **`scripting` permission.** Chrome Web Store flagged this as requested-but-unused
  during review (rejection rationale: "Requesting but not using the following
  permission(s): scripting"). The content script is registered statically in
  the manifest's `content_scripts` block — `chrome.scripting.*` is never called
  at runtime, so the permission was dead weight.
- **`activeTab` permission.** Audited proactively after the `scripting` rejection
  (the policy says "Audit all other permissions"). `activeTab` grants temporary
  host access on user invocation, but the extension already declares
  `host_permissions: ["<all_urls>"]` for the tracker-classification pipeline,
  which makes `activeTab` a strict subset and therefore redundant. Removed from
  both Chrome and Firefox manifests; PRIVACY.md table updated to match.

### Added
- `src/lib/observations.ts` — minimal observation types (`ObservedCookie`,
  `ObservedRequest`, `ObservedBanner`) with `consent_burden` fields, no scorer.
- `Report.banner` field exposing the captured banner shape (Accept/Reject/Manage
  presence) for the Scan view.
- Per-company sort: pre-consent activity first, then by worst burden, then by
  name — so the entries that matter for an audit float to the top.
- **PDF / print export.** New `PDF` button on the Scan view opens the report in
  a full browser tab (`ui/report.html`) styled for paper. Use the browser's
  built-in Print → Save as PDF to export. No third-party PDF library, no extra
  bundle weight beyond the report layout itself. Tables are page-break-aware,
  print color is preserved for the burden chips, and the saved-PDF filename
  defaults to the scanned hostname.
- **HAR 1.2 export.** New `HAR` button next to PDF downloads the full network
  trace from the scan as a standard HAR file. Opens in Charles, HTTPToolkit,
  browser DevTools' Network panel ("Import HAR"), and any `har-cli` tooling.
  Captures method / URL / request headers / response headers / status / IP /
  approximate timings for every request — first-party included, not just
  trackers. Each entry carries a non-spec `_consent_theater` field with the
  Playbill match (company, service, category, consent_burden, before_consent)
  for auditors who want to filter the trace.

  Bodies (request `postData.text` and response `content.text`) are not captured
  — that needs `chrome.debugger`, which prompts the user on every scan; the UX
  cost was not worth it. The resulting HAR is still valid against the 1.2 spec.

  No new permissions: existing `webRequest` is enough. Listeners use
  `extraHeaders` to surface CORS / Set-Cookie / Authorization headers.
- Build-time `__EXTENSION_VERSION__` injection (alongside `__PLAYBILL_VERSION__`),
  used as the HAR `creator.version`.

### Fixed
- Removed the unsupported `background.service_worker` key from the Firefox manifest.
  Firefox MV3 uses `background.scripts` only, and the stray key produced an AMO
  validator warning. Chrome is unaffected (its manifest is merged from `chrome.json`).
- LiveView's **Test** button now triggers the full background scan pipeline via
  `runTest` (clear + reload + capture pre-consent state + finalise report)
  instead of a soft `clearAll + reload`. Previously the scan pipeline was
  unreachable from the UI, which meant the HAR recorder never armed and the
  Report was never produced — so the new PDF / HAR / Copy export buttons had
  no data to act on. They now appear in a sticky bottom bar once the scan
  finishes.

## [0.1.0] — 2026-04-24

Initial public release.

### Added
- Chrome MV3 extension using `chrome.sidePanel` opened from the toolbar action.
- Firefox MV3 extension using `sidebar_action` toggled from the toolbar action.
- On-demand scan pipeline: clears cookies, `localStorage`, `sessionStorage`,
  `IndexedDB`, `cacheStorage`, and service workers for the scanned origin, then
  reloads the tab and captures every tracker request that fires before the user
  resolves the consent banner.
- Background capture via `webRequest.onBeforeRequest` and `cookies.onChanged`
  against the `@consenttheater/playbill` catalogue — no monkey-patching of
  `fetch` / `XHR` in the content script.
- Content-script banner detector scoped to the top frame (Accept / Reject /
  Manage click resolution).
- Plain-language verdict: Compliant / At Risk / Non-Compliant / Violating,
  computed by `src/lib/risk-score.ts` with severity-weighted scoring.
- `data_leak` category handling — IP exfiltration to third parties (Google
  Fonts, Typekit, YouTube embeds) is surfaced as a separate violation class
  even when consent is given, in line with Austrian DPA 2022 and LG München
  rulings.
- Sidebar UI built with Preact + Tailwind v4 + shadcn-style components,
  live cookie / request / storage inspectors, settings panel, and history
  view for past scans.
- Cross-browser build pipeline (`scripts/build.js`) with per-target manifest
  merging and Vite-driven UI bundling.
- Bundled tracker catalogue (no runtime network calls) via
  `@consenttheater/playbill` v0.1.x.
- Store-ready packaging (`npm run release` → signed-ready zips for Chrome
  Web Store and Firefox AMO).
- CI (lint, typecheck, test, `validate:chrome`, `validate:firefox`,
  `build:all`, artifact upload).
- `PRIVACY.md` covering the on-device-only data model for store submission.

### Security
- Strict MV3 CSP: no inline `<script>` or `onclick=` handlers; enforced by
  `scripts/validate-chrome.js`.
- `eslint-plugin-security` rules in CI (unsafe regex, eval, pseudo-random,
  child-process detection).
- No network egress at runtime — nothing leaves the browser, no telemetry,
  no analytics, no accounts.

### Known issues
- The Firefox manifest carries a stray `background.service_worker` key that
  AMO flags as an unsupported-property warning. Non-blocking; fixed in the
  next release.
- Firefox AMO reports an `innerHTML` warning on the bundled UI; it originates
  from Preact's runtime implementation of `dangerouslySetInnerHTML` and does
  not reflect user-controlled input.

[Unreleased]: https://codeberg.org/ConsentTheater/extension/compare/v0.7.0...HEAD
[0.7.0]: https://codeberg.org/ConsentTheater/extension/releases/tag/v0.7.0
[0.6.0]: https://codeberg.org/ConsentTheater/extension/releases/tag/v0.6.0
[0.5.0]: https://codeberg.org/ConsentTheater/extension/releases/tag/v0.5.0
[0.4.0]: https://codeberg.org/ConsentTheater/extension/releases/tag/v0.4.0
[0.3.0]: https://codeberg.org/ConsentTheater/extension/releases/tag/v0.3.0
[0.2.0]: https://codeberg.org/ConsentTheater/extension/releases/tag/v0.2.0
[0.1.0]: https://codeberg.org/ConsentTheater/extension/releases/tag/v0.1.0
