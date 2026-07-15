# Contributing

Thanks for considering a contribution. This is a small project — the process is lightweight.

## How to contribute

1. **Check existing issues** on [Codeberg](https://codeberg.org/ConsentTheater/extension/issues) first. If your idea or bug isn't listed, open one.
2. **Fork the repo** on Codeberg (or use the GitHub mirror — but Codeberg is canonical).
3. **Create a branch** from `main`: `git checkout -b fix-banner-detection` — keep branch names short and descriptive.
4. **Make your change.** Touch only what the task needs. No drive-by refactors.
5. **Verify locally:**
   ```sh
   npm install
   npm run validate
   ```
   This runs lint + test + validate:chrome + validate:firefox. Must pass.
6. **Load unpacked and test:**
   - Chrome: `dist/chrome/` via `chrome://extensions/` → Load unpacked
   - Firefox: `dist/firefox/manifest.json` via `about:debugging` → Load Temporary Add-on
7. **Open a pull request** to `main`. Use the PR template — it has the checklist and CLA acceptance line.
8. **Wait for review.** A maintainer will look at it. We're volunteers, so it may take a day or two.

## What we accept

- Bug fixes — especially site-specific banner detection or cookie capture issues.
- Accessibility improvements.
- New language translations for the report page.
- UI polish for the sidebar.

## What we don't accept

- New browser permissions without justification. Every permission needs a reason.
- Inline `<script>` or `onclick=` handlers — MV3 CSP forbids them.
- Third-party scripts, analytics, or anything that phones home. The extension makes zero outbound requests during normal use.
- Dependency additions without justification — keep the bundle small.

## Code style

- TypeScript + Vite. Follow the patterns already in the file you're editing.
- Tailwind classes for styling. Use design tokens, not raw colors.
- No comments explaining *what* the code does — the code should say that. Comments only for *why*, when it's non-obvious.
- Keep diffs small. One PR per concern.

## Tracker catalogue changes

Tracker data (cookies, domains, companies) lives in the
[playbill](https://codeberg.org/ConsentTheater/playbill) repository, not here.
If a tracker is missing or misclassified, open the PR there.

## CLA

External contributions require the [CLA](./CLA.md).

Copy this line into the PR description:

```text
I have read and agree to the CLA.
```

No signature bot — that line in the PR body is the acceptance. Maintainers will not merge without it.

## Project facts

- License of this repo: AGPL-3.0-or-later
- Contact: developer@consenttheater.org
- Primary forge: Codeberg (`codeberg.org/ConsentTheater/extension`)
- GitHub mirror: `github.com/ConsentTheater/extension` (read-only mirror — issues and PRs are auto-closed, use Codeberg)