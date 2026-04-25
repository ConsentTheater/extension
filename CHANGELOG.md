# Changelog

All notable changes to the ConsentTheater extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/ConsentTheater/extension/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ConsentTheater/extension/releases/tag/v0.1.0
