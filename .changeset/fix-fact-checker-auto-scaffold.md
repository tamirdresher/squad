---
"@bradygaster/squad-cli": patch
---

Fix #1222: Auto-scaffold Fact Checker agent during `squad init` and `squad cast`

The Fact Checker role was added in v0.10.0 (#789) with its catalog entry, charter template, skill, AGENT_TEMPLATES map entry, and template manifest entry — but it was never wired into the user-facing onboarding flow. Users running `squad init` got Scribe/Ralph/Rai but never saw Fact Checker as a default or cast option.

This change mirrors how Rai was wired:
- `init.ts` — adds `fact-checker` to the default `agents:` array passed to `sdkInitSquad()`
- `cast.ts` — adds `factCheckerMember()`, `factCheckerCharter()`, `hasFactChecker` branches in `castTeam()`, and the roster banner line

Result: `squad init` (with or without `cast`) now produces `.squad/agents/fact-checker/charter.md` alongside the existing always-on agents.
