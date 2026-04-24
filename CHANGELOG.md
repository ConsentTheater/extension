# Changelog

All notable changes to the ConsentTheater extension are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Removed the unsupported `background.service_worker` key from the Firefox manifest.
  Firefox MV3 uses `background.scripts` only, and the stray key produced an AMO
  validator warning. Chrome is unaffected (its manifest is merged from `chrome.json`).

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
