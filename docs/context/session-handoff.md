# MapCSV Session Handoff

## Current State

MapCSV is launched and deployed. The current strategic focus is distribution, validation, and preserving development/product context between Codex chats.

CSV Reconcile Beta is feature-frozen for the current release. The previously approved Map CSV workflow remains unchanged.

## Recent Implementation

- Added Compare CSV: two local files, column mappings, composite keys, explicit key issues, exact field diffs, paginated results, CSV/standalone HTML exports, and local rule-only profiles. Parsing/comparison/export run in a browser Web Worker; datasets do not leave the browser. Duplicate keys and their counterparts are excluded, not guessed.
- Existing Map CSV logic, analytics, Cloudflare Worker, D1 and authentication are unchanged. No dependencies added. Compare sends no analytics events; D1's existing event allowlist was not changed.
- Verified 68 tests (40 Reconcile tests), lint, Worker typecheck and production build. Playwright covered both workflows at 1440/1100/390 px, exports/clipboard, profiles, issues, pagination, themes/reduced motion, and a 50,000-row pair. Built assets also passed, including explicitly quoted empty keys. Screenshots are in `output/playwright/reconcile/` and `output/playwright/reconcile-polish/` (local artifacts).
- Polished the Reconcile setup and results UX: explicit Before/After mapping, row-identifier terminology, preserved compare-field preferences, readable composite identifiers, difference-first defaults, a clear identical-files state, and mobile-friendly changed-field details.
- Completed approved UI polish: fixed mobile workflow overflow, added subtle transitions, and respected reduced-motion preferences. Playwright verified the workflow; product logic and privacy behavior are unchanged.

## Recent Context Work

- Added a concise project `AGENTS.md` for Codex routing.
- Added `docs/context/project-brief.md` for durable technical/project context.
- Connected the project to BuilderOS notes for high-level product context.

## Next Technical Actions

- Monitor the Compare Beta using privacy-safe product metadata and synthetic or locally held examples; do not collect CSV contents for research. See README for exact comparison semantics and limits.
- Keep implementation work focused and evidence-driven.
- Before changing analytics, verify the CSV privacy invariant end to end.
- Before broad UI changes, use the available frontend/UI Skills selectively.
- Run the relevant checks for the files changed.

## Not A Transcript

Keep this file short. Record only current implementation state, materially important recent changes, and next technical actions.
