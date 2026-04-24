<!--
Thanks for contributing! Please make sure your PR meets the checklist below.
If anything doesn't apply, leave it unchecked or delete the line.
-->

## What does this PR do?

<!-- A short description of the change. Why is it needed? What does it change? -->

## Type of change

- [ ] Bug fix (extension misbehaves on a specific site or browser)
- [ ] New feature (sidebar view, scan improvement, settings option)
- [ ] UI / accessibility improvement
- [ ] Scan model change (background logic, webRequest, cookie capture, risk scoring glue)
- [ ] Manifest / permission change (Chrome or Firefox)
- [ ] Build / tooling / CI
- [ ] Documentation
- [ ] Refactor / internal cleanup
- [ ] Dependency update

## Checklist

- [ ] `npm run validate` passes locally (lint + test + validate:chrome + validate:firefox)
- [ ] Loaded unpacked in Chrome (`dist/chrome/`) and the change was verified end-to-end
- [ ] Loaded as temporary add-on in Firefox (`dist/firefox/manifest.json`) and verified there too
- [ ] No new inline `<script>` or `onclick=` handlers (MV3 CSP)
- [ ] No new permission requests unless strictly required (and justified below)
- [ ] Sidebar works at `min-width: 280px` and when resized wider (fluid layout preserved)

## Tracker catalogue changes

Tracker data (cookies, domains, companies) lives in
[`@consenttheater/playbill`](https://github.com/ConsentTheater/playbill),
**not in this repo**. If the change is about a specific tracker being
missed or misclassified, open the PR there.

## Screenshots / recordings

<!-- For UI changes, attach before/after screenshots or a short clip. -->

## Related issue

<!-- Link the issue this PR fixes, if any. "Fixes #123" auto-closes on merge. -->
Fixes #
