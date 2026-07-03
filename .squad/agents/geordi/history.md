# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Azure Developer CLI, AKS, Azure Container Apps, Aspire/observability, containers, Squad/agent workloads
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Geordi owns Azure platform and operational concerns for Squad and AI-agent runtimes.

## Learnings

2026-06-02: Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations (per user directive).

- Tamir explicitly wants coverage for ADC, AKS, ACA, Azure as a whole, and distributed systems that integrate AI and agents.
- Platform proposals should include diagnostics and observability, not just deployment steps.

## Major Workstreams (Archived)

**Status:** 270 lines of history across 5 major workstreams archived to `.squad/agents/geordi/history-archive.md`:

1. **Real Copilot CLI YOLO Harness Repair** (2026-05-19) — Process runner replacement, fail-closed checks, artifact guarantees.
2. **Session Store Isolation Plan** (2026-05-19) — Per-repo profile roots, environment override strategy, minimal validation sequence.
3. **ADC External Trigger Research** (2026-05-14) — ScheduledTask CRDs, ADC sandbox API, telemetry pipeline.
4. **ADC Event Bus Deep Inspection** (2026-05-14) — Redis XADD/XREADGROUP event stream, consumer groups, at-least-once delivery.
5. **Squad-to-ADC Event Adapter Pattern** (2026-05-14) — External listener layer, event transformation, decoupled integration.

---
## 2026-07-03 — JavaScript Extensions Windows CI Failure: Environment Drift Diagnosis

**Dispatch:** Coordinator assigned Geordi to diagnose JavaScript Extensions Windows CI failure surface and identify external vs. internal drift causes.

**CI Failure Characteristics:**
- Intermittent failures on `windows-latest` runners only; Ubuntu + macOS CI passes cleanly
- npm build/test stages affected; nx/turbo monorepo caching sensitive to platform differences

**Root Cause Analysis (Ranked by Likelihood):**
- **HIGH:** Node.js version floating (no major pin; auto-upgrade on windows-latest; monorepo shim behavior differs LTS ↔ latest)
- **HIGH:** Corepack enabled without lock (bun/pnpm versions floating per run; differs from dev machine pins)
- **HIGH:** Package lock disabled (npm ci bypassed; lock regenerated per run causing mismatch)
- **MEDIUM:** Windows-latest image updates (monthly runner VM updates; filesystem symlink/case-sensitivity differs from Ubuntu)
- **MEDIUM:** nx/turbo cache invalidation on Node version changes (newer Node invalidates cache entries committed on LTS)

**Recommendations to Upstream:**
1. Pin Node LTS version in CI workflows
2. Restore npm ci behavior (disable package lock regeneration on Windows)
3. Lock corepack versions explicitly
4. Verify monorepo build consistency across pinned versions
5. Document Windows CI expectations (case sensitivity, path length, symlinks)

**Verdict:** External environment drift confirmed. No code regression identified. No code fix required; environment mitigation needed in upstream bradygaster/squad CI configuration.

**Decision log:** Merged to `.squad/decisions.md` entry 2026-07-03T09:20:04.467+03:00 (JS Extensions Windows CI failure analysis).

---

**Last Updated:** 2026-07-03T09:20:04.467+03:00  
**Archive:** `.squad/agents/geordi/history-archive.md`

## Learnings (2025 — Worf Conditions A/B, commit 77186501)

- **EACCES/EISDIR failure mode on dual-write mirrors**: filesystem-mirror writes (legacy dual-write to a non-canonical path like `.copilot/mcp-config.json`) must NEVER crash the primary operation. The canonical write is the source of truth; the mirror is by definition non-critical. Always wrap in try/catch and downgrade thrown errors to warnings. See `packages/squad-sdk/src/config/init.ts:1346-1382`.
- **JSON round-trip as defense-in-depth**: even when `JSON.stringify` is theoretically sound for plain objects, a `JSON.parse(serialized)` call before write costs <1ms and immunizes against future refactors that introduce custom `toJSON` methods or non-stringify-safe values. Critical when the downstream consumer (Copilot CLI 1.0.58) silently drops malformed JSON with no warning -- per Seven's precedence research. See `packages/squad-sdk/src/upgrade/migrate-mcp-config.ts:355-364`.
- **vitest pattern for cross-platform fs-permission tests**: use `it.skipIf(process.platform === 'win32')` when the failure mode requires POSIX `chmod`-based read-only directory simulation. NTFS ACLs don't honor `chmod` bits the same way. Acceptable to leave Windows uncovered when the underlying bug is platform-agnostic and POSIX coverage proves the fix.


## 2026-06-06: PR #1195 Review Finding — Vitest Anti-Pattern Detected

Cross-agent notification from Scribe:
PR #1195 review (data + worf agents, 2026-06-06 08:38 UTC) identified a vitest anti-pattern in CI checks.

Finding: Top-level expect() calls in test files cause collection errors. Additionally, pre-existing backtick-or-true grep error masking pattern requires review for CI safety.

Action: Consider updating CI templates or adding checks to prevent top-level expect() anti-pattern. Review grep error masking impact on fault detection.

Source: .squad/decisions.md entry dated 2026-06-06; session log at .squad/log/2026-06-06T08-38-05Z-pr1195-review.md

## 2026-06-16: ink 6→7 keyboard API migration

**PR:** https://github.com/bradygaster/squad/pull/1350 (CI GREEN ✅)

### ink 7 breaking changes (squad CLI)

1. **`key.backspace`/`key.delete` swap** — squad CLI already checked both; no change needed.
2. **`key.meta` no longer fires on Escape** — added `|| key.escape` to the disabled-input guard.
3. **`useInput` wrapped in `reconciler.discreteUpdates()`** — state updates called _directly_ in the `useInput` callback flush synchronously; state updates inside `setTimeout` from the handler go through React's concurrent scheduler and are not guaranteed to render in the test window.

### Key lessons

- **Direct handler vs. timer**: For ink 7, any React state that needs to be visible in `lastFrame()` _immediately after_ a keypress must be set inside the `useInput` callback body (inside `discreteUpdates`), not deferred to a `setTimeout`.
- **setHistory must be synchronous**: History navigation tests (UP/DOWN arrow) depend on history state being committed before the next keypress. Moved `setHistory`/`setHistoryIndex(-1)` from the 10 ms paste-detection timer into the synchronous handler. Only `onSubmit` stays deferred for paste batching.
- **Windows lockfile de-hoisting**: Running `npm install` on Windows will de-hoist `@opentelemetry/*` packages that `test/aspire-integration.test.ts` imports from root. After `npm install` on Windows, restore the 27 hoisted `@opentelemetry/*` entries from the dev branch lockfile. CI uses `npm ci` which honors the lockfile strictly.
- **Workspace integrity gate**: CI checks that `@bradygaster/squad-sdk` is resolved via workspace `file:` link, not from the npm registry. Stale nested `packages/squad-cli/node_modules/@bradygaster/squad-sdk` registry entries must be removed before pushing.
- **Squad CI trigger**: `pull_request`-triggered workflows may require a push (force-push or new commit) to fire for outside collaborators; `pull_request_target` workflows always fire.

**Context:** squad CLI uses ink as its REPL/TUI renderer. PRs #1322 and #1335 (dependabot) bumped `ink` from 6.8.0 to 7.0.6. CI failed on `test/repl-ux.test.ts:1461` and `:1493`.

**Breaking changes encountered and adaptations:**

1. **`key.backspace` / `key.delete` semantics swapped** (ink 7 changelog: "Pressing Backspace now correctly sets `key.backspace` instead of `key.delete`")
   - *Impact*: None. The existing code already checked `key.backspace || key.delete` in every branch. No source change needed.

2. **`key.meta` no longer set on plain Escape** (ink 7 changelog: "`key.meta` is reserved for actual Alt/Meta modifier combinations")
   - *Impact*: The disabled-input guard `if (key.upArrow || key.downArrow || key.ctrl || key.meta) return` no longer caught Escape. Added `|| key.escape` to the condition.
   - For non-disabled input: `if (input && !key.ctrl && !key.meta)` — no change needed because ink 7 strips the ESC prefix from `input` (→ `''`) for the escape key; the `input &&` guard already blocks it.

3. **`useInput` handlers wrapped in `reconciler.discreteUpdates()`** (ink 7 internal change via `useEffectEvent`)
   - *Root cause of test failures*: State updates called **directly in the handler** are flushed synchronously; state updates inside a `setTimeout` from the handler are **not**. Under React 19 concurrent mode + Node.js scheduling, `setValue('')` inside a 10 ms debounce timer did not propagate to `lastFrame()` within the test's 50 ms wait window.
   - *Fix*: Introduced `pasteBufferRef` to accumulate text across consecutive `\r` keypresses. `setValue('')` (visual clear) is now called **synchronously** in the handler (inside `discreteUpdates`). Submit logic is still deferred to the 10 ms timer for paste detection — but no longer blocks the visual clear.

**patch-ink-rendering.mjs**: patches 1 and 2 emit informational warnings (patterns absent from ink 7's restructured build) but do not error. Patch 3 still verifies. Script left in place.

**Key diagnostic insight**: if `onSubmit` mock passes but `lastFrame()` fails → async render propagation issue, not key recognition. Fix must bring `setState` inside the synchronous `discreteUpdates` context.

**PR**: https://github.com/bradygaster/squad/pull/1350 (replaces #1322, #1335)

## 2026-06-18: Aspire 13.5-preview MessagePack CVE — override BLOCKED by CPM semantics

**Worktree:** `C:\Users\tamirdresher\source\repos\Aspire-1-terminal` on `experimental/with-terminal-13.5` (detached at 8aadd01f from `tamirdresher/Aspire-1`, a fork of `dotnet/aspire`).
**Goal:** unblock `dotnet restore` for the squad example AppHost, which fails with `NU1903` on `MessagePack 2.5.192` (CVE GHSA-hv8m-jj95-wg3x — high severity, first patched in `2.5.301`). MessagePack arrives transitively via `StreamJsonRpc 2.22.23` → `Aspire 13.5-preview.1.26311.2`.

**What I tried (and what stuck):**
1. Added `<PackageVersion Include="MessagePack" Version="2.5.301" />` + `MessagePack.Annotations 2.5.301` to the `<ItemGroup Label="Overrides">` block in the repo-root `Directory.Packages.props` (the task description said `examples\squad\Directory.Packages.props` but no such file exists; the actual file is at the repo root).
2. Bumped `Squad.Agents.AI 0.5.1-preview.8 → 0.5.1-preview.13` and `GitHub.Copilot.SDK 1.0.0 → 1.0.2` in the `Aspire Packages` block.

**Result:** `dotnet restore` STILL fails with the same NU1903 on MessagePack 2.5.192. The MessagePack PackageVersion override is present in `centralPackageVersions` of `obj/project.assets.json` but is NOT applied to the resolved dependency graph.

**Root cause (verified):** With Central Package Management, a `<PackageVersion>` entry only pins a version for projects that have a matching `<PackageReference>`. MessagePack is purely transitive — `grep -r 'PackageReference Include="MessagePack"'` returned zero hits across the repo. The existing `MongoDB.Driver` and `SharpCompress` "Overrides" in the same block work ONLY because those packages ARE directly referenced in `src\CommunityToolkit.Aspire.Hosting.MongoDB.Extensions\CommunityToolkit.Aspire.Hosting.MongoDB.Extensions.csproj`. The `Overrides` label is misleading; those are not transitive pins. The repo does NOT enable `CentralPackageTransitivePinningEnabled`.

**What WOULD unblock it (per coordinator decision):**
- **Option A (broad):** Add `<CentralPackageTransitivePinningEnabled>true</CentralPackageTransitivePinningEnabled>` to `Directory.Packages.props`. Promotes ALL central `PackageVersion` entries to transitive pins repo-wide. Risk: cascading version conflicts across the rest of the Aspire repo (which uses many transitives).
- **Option B (narrow, preferred):** Add `<PackageReference Include="MessagePack" />` (and `MessagePack.Annotations`) to the two failing projects: `examples\squad\CommunityToolkit.Aspire.Hosting.Squad.AppHost\CommunityToolkit.Aspire.Hosting.Squad.AppHost.csproj` and `src\CommunityToolkit.Aspire.Hosting.Squad\CommunityToolkit.Aspire.Hosting.Squad.csproj`. The CPM 2.5.301 entry then takes effect for those two projects only. Touches files the task said not to touch, so escalated.

**Escalated to coordinator** per task instruction "If either step fails, report the actual error verbatim and stop. Do not attempt deeper changes." Left the three edits in place — the SDK/Squad bumps DO take effect for the `ApiApp` project (which directly references them); the MessagePack entry is dormant until a companion change lands.

**Sticky lesson (also dropped at `.squad/decisions/inbox/geordi-aspire-13.5-messagepack-override.md`):** Stay on the `MessagePack 2.5.x` line (`2.5.301`) for StreamJsonRpc 2.22.x compatibility. The advisory also lists `MessagePack 3.0.214-rc.1 → 3.1.7` as vulnerable; first patched on the 3.x line is `3.1.7`, but StreamJsonRpc 2.22.x expects 2.5.x, so jumping to 3.x is not free.

### Addendum — 2026-06-18T15:53+03:00: Option B applied and verified ✅

Coordinator + Tamir approved Option B. Added a two-line `<PackageReference Include="MessagePack" />` + `MessagePack.Annotations` block (no `Version` attribute — CPM supplies `2.5.301`) with an inline comment pointing at GHSA-hv8m-jj95-wg3x to both:

- `examples\squad\CommunityToolkit.Aspire.Hosting.Squad.AppHost\CommunityToolkit.Aspire.Hosting.Squad.AppHost.csproj`
- `src\CommunityToolkit.Aspire.Hosting.Squad\CommunityToolkit.Aspire.Hosting.Squad.csproj`

**Verification (from `examples\squad\CommunityToolkit.Aspire.Hosting.Squad.AppHost`):**
- `dotnet restore --verbosity:minimal` → clean. No `NU1903`. Both projects restored in ~3.5 sec each.
- `dotnet build --no-restore --verbosity:minimal` → `Build succeeded. 0 Warning(s) 0 Error(s)`. All four projects compiled (`ServiceDefaults`, `ApiApp`, `Squad` hosting lib, `AppHost`).
- Spot-checked `obj\project.assets.json` for both edited projects — `MessagePack/2.5.301` and `MessagePack.Annotations/2.5.301` are the resolved entries in the dependency graph (not just present in `centralPackageVersions`). Override is now authoritative end-to-end.

**Confirms the CPM rule from the proposed decision:** a `<PackageVersion>` entry only pins transitives for projects that hold a matching `<PackageReference>` anchor — even a versionless one. The two-package anchor is the minimum-surface-area fix; no need for repo-wide `CentralPackageTransitivePinningEnabled`.

**Final worktree state (uncommitted, as instructed):**
```
 M Directory.Packages.props
 M examples/squad/CommunityToolkit.Aspire.Hosting.Squad.AppHost/CommunityToolkit.Aspire.Hosting.Squad.AppHost.csproj
 M src/CommunityToolkit.Aspire.Hosting.Squad/CommunityToolkit.Aspire.Hosting.Squad.csproj
```

Detached at `8aadd01f`, no other touched files, no untracked debris. Suggested commit one-liner (NOT executed): `git commit -am "Pin MessagePack 2.5.301 to fix GHSA-hv8m-jj95-wg3x (StreamJsonRpc transitive via Aspire 13.5-preview)"`.

**Cleanup checkpoint to remove once the Aspire 13.5 preview ships a StreamJsonRpc that picks MessagePack ≥ 2.5.301:** delete both `<PackageReference>` anchors and the corresponding override entries in `Directory.Packages.props`. The inline csproj comments call this out so the next person inheriting the branch sees it.

