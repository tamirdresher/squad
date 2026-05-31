# Squad Decisions

**Last Updated:** 2026-05-31T14:03:06.842+03:00

## Active Decisions

---

### 2026-05-31T14:03:06.842+03:00: Data — State-Backend Regression Triage: v0.9.4 → v0.9.6-insider.3

**By:** Data (Squad Framework Expert)

# State-Backend Regression Triage: v0.9.4 → v0.9.6-insider.3

**By:** Data (Squad Framework Expert)  
**Date:** 2026-05-31T14:09:11Z  
**Scope:** `packages/squad-sdk/src/state-backend.ts`, `packages/squad-cli/src/cli/shell/index.ts`, coordinator template  
**Baseline note:** Tag `v0.9.6-insider.2` does not exist. Triage uses `v0.9.4` as the prior stable baseline. `v0.9.6-insider.3` is tagged on `origin/feature/coordinator-as-agent` commit `ce326d56`.

---

## Bug A — CRITICAL (P0): Permission contract broken on Copilot CLI v1.0.54+

**File:** `packages/squad-cli/src/cli/shell/index.ts`  
**Status:** Not fixed in insider.3. Fix available in `origin/squad/1191-fix-cli-permission-contract`.

**What breaks:** The `approveAllPermissions` handler returns `{ kind: 'approved' }`. The Copilot CLI changed its permission contract at v1.0.54 to require `{ kind: 'approve-once' }` instead. When the Squad CLI runs with Copilot CLI v1.0.54+, every spawned agent operation that triggers a permission check (tool calls, file writes, git ops) gets an unrecognized `kind` value and hangs or errors. This silently blocks all state writes — history appends, decision drops, notes writes — even when the underlying backend is working perfectly.

**Root cause:**
```typescript
// insider.3 (broken on Copilot CLI v1.0.54+)
const approveAllPermissions: SquadPermissionHandler = () => ({ kind: 'approved' });

// Fix
const approveAllPermissions: SquadPermissionHandler = () => ({ kind: 'approve-once' });
```

**Impact:** All agent operations fail silently or stall when running against Copilot CLI v1.0.54+. This includes: task spawns, state reads/writes via MCP tools, git operations triggered by agents. This is a cross-cutting failure — every backend is affected, because the failure is pre-backend.

**Recommendation:** Apply the one-line fix from `origin/squad/1191-fix-cli-permission-contract` immediately before any insider.3 user testing on current Copilot CLI versions.

---

## Bug B — HIGH (P1): `resolveStateBackend` throws hard error on explicit backend failure

**File:** `packages/squad-sdk/src/state-backend.ts`, function `resolveStateBackend()`  
**Status:** Present in insider.3. Softened in `origin/bradygaster/squad-p1-coordinator-bugs`.

**What breaks:** When `stateBackend` is explicitly set to `'orphan'` or `'two-layer'` in `.squad/config.json` and the backend initialization fails (e.g., `requireGitRepository()` throws because the directory is not a git repo, or the orphan branch cannot be created due to a dirty working tree), insider.3 rethrows the error instead of falling back gracefully to `'local'`.

**Root cause:**
```typescript
// insider.3 — throws when backend is explicitly configured and fails
const explicitBackend = cliOverride !== undefined || configBackend !== undefined;
const chosen = normalizeBackendType(cliOverride ?? configBackend ?? 'local');
try {
  return createBackend(chosen, squadDir, repoRoot);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (explicitBackend && chosen !== 'local') {
    throw new Error(`State backend '${chosen}' failed: ${msg}`); // ← hard throw
  }
  // ...fallback only for default/implicit choices
}
```

Also in `createBackend()`:
```typescript
case 'orphan':
  requireGitRepository(repoRoot); // ← throws if not a git repo
  return new OrphanBranchBackend(repoRoot);
case 'two-layer':
  requireGitRepository(repoRoot); // ← throws if not a git repo
  return new TwoLayerBackend(repoRoot);
```

**Impact:** Any user who has `"stateBackend": "orphan"` or `"two-layer"` in their config and runs `squad` in a non-git directory, or when the orphan branch cannot be created (dirty tree, branch name conflict), gets a hard fatal error rather than a degraded-but-working local backend. Especially dangerous in CI environments or when squad is invoked from a temp directory.

**Recommendation:** Adopt the p1 branch fix: remove `requireGitRepository()` guard and the `explicitBackend` throw, always fall back to `'local'` on backend failure.

---

## Bug C — HIGH (P1): `git-notes` config silently migrates to `two-layer`, creating unexpected orphan branch

**File:** `packages/squad-sdk/src/state-backend.ts`, function `normalizeBackendType()`  
**Status:** Behavior present in insider.3; no user warning is emitted.

**What breaks:** Users who had `"stateBackend": "git-notes"` in their config are silently migrated to `"two-layer"`. The `two-layer` backend creates an orphan branch named `squad-state` in the user's repository. Users who never opted into orphan-branch state management will suddenly find a new branch created in their repo without any prompt or warning.

**Root cause:**
```typescript
function normalizeBackendType(type: string): StateBackendType {
  if (type === 'worktree') return 'local';
  if (type === 'git-notes') return 'two-layer'; // ← silent migration, no warning
  return type as StateBackendType;
}
```

**Impact:**
- New `squad-state` orphan branch appears in remote tracking after next push
- If working tree is dirty when `two-layer` initializes, the orphan branch creation may fail (caught by Bug B above, producing a hard error)
- Users who rely on git-notes-only semantics (no orphan) lose that guarantee; reads now always go to orphan (which may be empty on first migration)

**Recommendation:** Emit a `console.warn()` when `git-notes` is normalized to `two-layer`, informing the user of the migration. Better: expose an explicit migration guide in `squad upgrade` output.

---

## Bug D — MEDIUM (P2): Coordinator template references stale backend names

**File:** `packages/squad-sdk/src/` (compiled into coordinator `squad.agent.md` at insider.3)  
**Status:** Present in insider.3. Fixed in `origin/bradygaster/squad-p1-coordinator-bugs`.

**What breaks:** The coordinator's `squad.agent.md` template at insider.3 documents:
> Valid values: `"worktree"` (default), `"git-notes"`, `"orphan"`, `"two-layer"`

Both `"worktree"` (now `"local"`) and `"git-notes"` (removed as standalone type) are stale. Agents parsing this guidance will pass `STATE_BACKEND=worktree` or `STATE_BACKEND=git-notes` into spawn prompts, which do not match the new canonical type names. Templates with `{% if STATE_BACKEND == "git-notes" %}` blocks will never match, silently skipping git-notes post-work steps for users who think they're on that backend.

**Recommendation:** Update the coordinator template documentation to: `"local"` (default), `"orphan"`, `"two-layer"`. Remove `"worktree"` and `"git-notes"` from the valid values list. Already done in p1 branch.

---

## Bug E — MEDIUM (P2): Externalized state path resolution broken in runtime commands

**Status:** Not fixed in insider.3. Fix in progress in `origin/squad/949-fix-externalized-state-paths` (not merged).

**What breaks:** When `stateLocation` is set to `"external"` in config.json, the MCP state tools (`squad_state_read`, `squad_state_write`, etc. in `state-mcp.ts`) resolve state paths from the wrong root. The MCP command calls `resolveSquadState(startDir)` which may not honour the externalized path override, resulting in reads/writes going to the local `.squad/` directory instead of the configured external AppData path.

**Impact:** All state operations for users with externalized state silently read/write the wrong location. Externalized state is the recommended setup for satellite/linked repos.

**Recommendation:** Wait for or cherry-pick `origin/squad/949-fix-externalized-state-paths`.

---

## Bug F — LOW (P3): `StateBackendStorageAdapter.toRelative()` Windows path edge case

**File:** `packages/squad-sdk/src/state-backend.ts`, class `StateBackendStorageAdapter`  
**Status:** Present in insider.3; no fix branch found.

**What breaks:** `toRelative()` computes the relative path by stripping the `squadDir` prefix via `path.normalize(absolute).slice(normalizedBase.length + 1)`. On Windows, if `absolute` uses a different-case drive letter (e.g., `C:\` vs `c:\`), `path.normalize()` preserves the original case. If the prefix-stripping condition fails (lengths don't align), the result could be an absolute path starting with `\`. Git notes refs with absolute paths would silently corrupt notes key names.

**Recommendation:** Use `path.resolve()` for both sides and perform a case-insensitive prefix check on Windows before slicing.

---

## Bug G — LOW (P3): State backend hardening not shipped

**Status:** `origin/squad/864-state-backend-hardening` not merged at insider.3.

**What's missing:** Retry logic, circuit-breaker, and startup verification for `OrphanBranchBackend` and `GitNotesBackend` are not in insider.3. Transient git failures (network timeout on a remote-tracking operation, lock file contention during concurrent write) will surface as hard errors rather than being retried.

**Recommendation:** Track separately; this is a reliability improvement, not a regression from v0.9.4.

---

## Summary Table

| Bug | Severity | Fixed in insider.3 | Fix branch |
|-----|----------|--------------------|-----------|
| A — Permission contract `approved` vs `approve-once` | **P0 CRITICAL** | ❌ | `squad/1191-fix-cli-permission-contract` |
| B — Hard throw on explicit backend failure | **P1 HIGH** | ❌ | `bradygaster/squad-p1-coordinator-bugs` |
| C — Silent `git-notes`→`two-layer` migration creates orphan | **P1 HIGH** | ❌ (warn needed) | No branch yet |
| D — Coordinator template documents stale backend names | **P2 MEDIUM** | ❌ | `bradygaster/squad-p1-coordinator-bugs` |
| E — Externalized state path resolution broken | **P2 MEDIUM** | ❌ | `squad/949-fix-externalized-state-paths` |
| F — `toRelative()` Windows path edge case | **P3 LOW** | ❌ | No branch yet |
| G — Backend hardening not shipped | **P3 LOW** | ❌ (new capability) | `squad/864-state-backend-hardening` |

## Positive Changes in insider.3

- **GitNotesBackend anchor**: HEAD→root commit fix prevents notes loss on branch switch — correct behavior
- **`normalizeBackendType()`**: Legacy name migration means existing `config.json` files are forward-compatible without a manual migration step
- **`TwoLayerBackend.write()`**: Notes writes are already best-effort with swallowed catch (even before p1 branch)
- **`StateBackendStorageAdapter`**: New adapter allows SDK `StorageProvider` consumers to use any git backend — good abstraction

## Next Steps

1. Immediately: cherry-pick Bug A fix (`squad/1191-fix-cli-permission-contract`) into insider.4
2. Priority: merge `bradygaster/squad-p1-coordinator-bugs` for Bug B + D fixes
3. Add user-visible warning for Bug C (`git-notes`→`two-layer` migration)
4. Track `squad/949-fix-externalized-state-paths` for insider.4 inclusion
5. Add test coverage: backend selection with `requireGitRepository` in non-git-dir context


---

### 2026-05-31T14:03:06.842+03:00: Seven — State-Backend Community Signal Report — Post-Insider.2 Release

**By:** Seven (Research & Integration Engineer)

# State-Backend Community Signal Report — Post-Insider.2 Release

**Date:** 2026-05-22  
**Author:** Seven (Research & Integration Engineer)  
**Assignment:** Surface dominant problem themes and root causes from state-backend issues reported after v0.9.6-insider.2 release  
**Scope:** GitHub issues, PRs, and release cycles for squad repo (bradygaster/squad)  

---

## Executive Summary

Three distinct problem clusters emerged after v0.9.6-insider.2 release (3–5 days post-release):

| Theme | Frequency | Severity | Status |
|-------|-----------|----------|--------|
| **Upgrade Pipeline Gaps** | 3 issues (#1190, #1185, #1098) | P1 (State Corruption) | In-flight fix (Tamir PR #1158 merged) |
| **Two-Layer State Backend Incomplete** | 4 issues (#1157, #1013, #1003, #810) | P1 (Architecture Gap) | Architectural fix merged; runtime wiring underway |
| **Coordinator State Resolution Inconsistency** | 2 issues (#1163, #1127) | P2 (UX/Logic) | Awaiting patch; backport in dual-root pilot |
| **Permission API Breaking Change** | 1 issue (#1191) | P1 (Blocker) | Urgent: Copilot CLI v1.0.54+ contract change |
| **State Destruction on Branch Switch** | 1 issue (#643) | P1 (Workaround: externalize) | Resolved via PR #797 (externalize command) |

---

## Theme 1: Upgrade Pipeline Gaps — Post-Upgrade State Corruption

### Issues
- **#1190** (tamirdresher, 1 day old): `bug: upgrade pipeline gaps — postinstall misses repo-local node_modules, two-layer hooks not installed, teamRoot not portable`
- **#1185** (ischrei, 3 days old): `squad upgrade --self --insider: misplaced templates, Rai not installed, --state-backend ignored`
- **#1098** (tamirdresher, 23 days old): `fix: pin SDK dependency to insider version`

### Root Causes & Findings

#### Finding 1.1: ESM Patch Misses Repo-Local node_modules
- `patch-esm-imports.mjs` hardcodes `SEARCH_ROOTS` relative to global install `__dirname`
- Does not resolve to `<repo>/node_modules`, leaving vscode-jsonrpc/session.js patches incomplete
- `squad doctor` flags failures; running `npm run postinstall` reports "already patched" (false negative)

**Fix:** Add `join(process.cwd(), 'node_modules')` to `SEARCH_ROOTS`; invoke patch from repo root post-install.

#### Finding 1.2: Two-Layer Hooks Missing After Upgrade
- `--state-backend` flag silently ignored during `squad upgrade`
- Upgrade from orphan backend to two-layer fails with "migration not supported" error
- `pre-commit` and `post-commit` hooks (required for two-layer) never installed
- `squad doctor` does NOT flag missing hooks despite `stateBackend=two-layer` configured

**Fix:** (a) `squad upgrade --state-backend <value>` should migrate properly, (b) `squad doctor` should cross-check hook presence for configured backend.

#### Finding 1.3: teamRoot Absolute Path Not Portable
- `squad upgrade` writes `teamRoot` as absolute path (e.g., `C:\Users\...\repo`)
- Same repo cloned to different path/machine breaks: `squad doctor` → "directory not found"
- `config.json` had duplicate `stateBackend` key (appended by upgrade, not merged)

**Fix:** Write `teamRoot: "."` by default; store machine-specific paths in `peers.<machineId>.teamRoot`. Use merge semantics in config write (not append).

### Evidence
- tamirdresher filed #1190 with comprehensive reproduction steps and manual workarounds
- ischrei filed #1185 from insider.2 → insider.3 upgrade; documented exact error messages
- Both issues reference each other; root cause chain is clear

### In-Flight Mitigation
- PR #1158 (tamirdresher, merged 6 days ago): "Route squad state through runtime tools" — addresses state API boundary (architectural fix, not pipeline fix)
- PR #1098: SDK dependency pin (not pipeline issue)

**Gap:** Upgrade pipeline itself (Finding 1.1–1.3) not yet fixed in code; patches in manual workaround only.

---

## Theme 2: Two-Layer State Backend Incomplete — Architectural Bypass

### Issues
- **#1157** (tamirdresher, 5 days old): `Two-layer state backend is bypassed by prompt-level manual git state choreography` ← **PRIMARY**
- **#1013** (tamirdresher, 1 month old): `feat: two-layer state backend (git-notes + orphan combined)`
- **#1003** (tamirdresher, 1 month old): `feat: wire state backends into all squad operations, not just watch`
- **#810** (1 month old): `feat(sdk): git-notes + orphan-branch state backends`

### Root Causes & Findings

#### Finding 2.1: Architectural Gap — Manual Prompt Choreography
- Two-layer backend (git-notes Layer 1 + orphan Branch Layer 2) exists at SDK level but is **bypassed** at orchestration layer
- Agent-facing prompts still contain manual `git notes`, `git checkout squad-state`, commit instructions
- Agents can still write mutable `.squad/` directly to active worktree or leave state in unsafe state
- Scribe and background agents confused config vs mutable state; repo can end up dirty/contaminated

**Example from #1157 reproduction:** Agents touched `.squad/` directly, ran git notes manually, left checkout/state branch unsafe.

#### Finding 2.2: Incomplete Wiring to All Operations
- State backend only wired to `watch` command (via `resolveStateBackend()` in watch/config.ts)
- `squad init`, agent history reads/writes, decisions, skills still use `FSStorageProvider` directly
- Setting `stateBackend: 'git-notes'` in config.json only affects watch — not broader squad lifecycle

**Design from #1003:** Phase 1 ✅ done (interface + docs), Phase 2–3 (migration to init/history/decisions/skills) still pending.

### Evidence
- tamirdresher filed #1157 as architectural proposal after reproducing session failure
- Issue references blog post describing two-layer design: `promote_to_permanent` and `archive_on_close` flags on notes distinguish rejection scenarios
- Ralph promotion logic designed but not yet wired
- PR #1158 directly addresses #1157 by adding runtime-owned state tools; merged 6 days ago

### In-Flight Fix
- **PR #1158** (tamirdresher, merged): "Route squad state through runtime tools"
  - Adds runtime-owned `state.read/write/append/delete/list/health` tools
  - Routes to configured storage provider; fails closed for unavailable backends
  - Updates prompts to stop manual git-notes choreography
  - Regression coverage: git-native state routing + .squad key normalization

**Gap:** PR #1158 addresses prompt-level choreography; does NOT fully wire all operations (init/history/decisions/skills per Phase 2–3 of #1003).

---

## Theme 3: Coordinator State Resolution Inconsistency — Logic Gap

### Issues
- **#1163** (ralarcon, 5 days old): `Coordinator TEAM_ROOT has inconsistent semantics between State & Team Root Resolution and Worktree Awareness` ← **PRIMARY**
- **#1127** (tamirdresher, ~15 days old): "Fix coordinator awareness of teamRoot"

### Root Causes & Findings

#### Finding 3.1: TEAM_ROOT Has Two Contradictory Definitions
- Section A (State & Team Root Resolution): TEAM_ROOT = `<repo>/.squad/`
- Section B (Worktree Awareness): TEAM_ROOT = `<repo>/` (repo root)
- Mode-Switch Check probes `{TEAM_ROOT}/team.md`, which fails under Section B semantics
- **Impact:** Worktrees without `.squad/` committed trigger false Init Mode entry

**Scenario:** Worktree of branch where `.squad/` is NOT committed → Section 4 default fails → Worktree Awareness resolves team root late → triggers Init Mode incorrectly.

#### Finding 3.2: teamRoot Path Semantics Over-Restrictive
- Current spec: teamRoot = absolute path to `.squad/` directory only
- Real-world usage: dual-root pilot uses relative path (`../cac-vniotsquad`) pointing at repo root containing its own `.squad/`
- Spec marks portable relative paths as out-of-spec; tooling (`squad link`, `squad init --mode remote`) accepts both shapes

**Fix:** Document both absolute and relative; both repo-root and .squad/-direct; resolution fallback: try `{teamRoot}/.squad/team.md`, else `{teamRoot}/team.md`.

#### Finding 3.3: Worktree Awareness Step 0 Lookup Ambiguous
- Step 0: "Check config.json overrides first" — but git root not yet resolved
- From subdirectory: lookup order undefined (CWD first? git root? walk up?)

**Fix:** Deterministic order: resolve git root first, then check `{gitRoot}/.squad/config.json`.

### Evidence
- ralarcon filed #1163 during dual-root pilot backport review
- Backport of #1132 verbatim; identified 3 inconsistencies in upstream prompt
- Filed to avoid divergence; offered to PR fix upstream

### In-Flight Fix
- **PR #1132** (merged 2026-05-19): "State & Team Root Resolution" — introduced inconsistencies
- No upstream patch yet; ralarcon willing to contribute

---

## Theme 4: Permission API Breaking Change — Copilot CLI Contract

### Issues
- **#1191** (jonlester, 1 day old): `[bug] squad-cli cannot access tools due to Copilot CLI (post-v1.0.54) permission contract change`

### Root Cause
- Copilot CLI v1.0.54+ changed expected `onPermissionRequest` handler return values
- Old contract: `{ kind: 'approved' }`
- New contract: `{ kind: 'approve-once' }` or other allowed values
- Squad code still returns `{ kind: 'approved' }` → ignored by new CLI
- Affects `approveAllPermissions` handler in packages/squad-cli/src/cli/shell/index.ts and type definitions

**Impact:** Squad CLI cannot grant tool access on new Copilot CLI versions; core functionality blocked.

### Evidence
- Filed by jonlester; assigned to tamirdresher, jonlester, bradygaster, Copilot
- References: Copilot SDK permission handler docs; code search for `approveAllPermissions`
- 1 day old = urgent signal post-insider.2

### Status
- No PR yet; urgent fix required
- Simple mapping: update return value and type definitions to match new contract

---

## Theme 5: State Destruction on Branch Switch — Resolved

### Issue
- **#643** (seligj95, 2 months old): `Squad state destroyed when .squad/ is gitignored and agents switch branches`

### Root Cause
- `.squad/` files untracked when gitignored (common for contributor workflows)
- Git doesn't preserve untracked files during branch switches
- Agents running `git checkout <branch>` (instead of `git worktree add`) destroy state

### Resolution
- **PR #797** (merged, tamirdresher comment Apr 12): Added `squad externalize` command
- Moves `.squad/` state outside working tree to platform-specific global directory
- Branch switches no longer destroy squad state (files not in working tree)
- Users activate via: `squad externalize` (move out) / `squad internalize` (move back)

**Status:** ✅ Resolved as of insider

---

## Root Cause Analysis & Gaps

### Dominant Pattern: Upgrade Pipeline Not Aligned with Feature Releases

**Finding:** Three separate systems were merged in v0.9.6-insider.2/insider.3 without coordinated upgrade flow:
1. Two-layer state backend (git-notes + orphan) ← architectural feature
2. State tool API (runtime-owned boundary) ← orchestration fix
3. ESM patch + hook installation + config portability ← infrastructure

**Gap:** No upgrade integration test ensuring all three work together post-upgrade. #1190 author (tamirdresher) manually identified gaps after upgrade.

### Secondary Pattern: Prompt-Level Choreography Not Retired

**Finding:** Architectural two-layer backend exists, but prompts still instruct agents on manual git operations.

**Addressed by:** PR #1158 (merged). Remaining gaps: Phase 2–3 of #1003 (init/history/decisions/skills migration).

### Tertiary Pattern: Coordinator State Resolution Not Unified

**Finding:** Two contradictory definitions of TEAM_ROOT in same prompt; ambiguous path semantics; undefined lookup order.

**Impact:** False Init Mode entry in valid worktree scenarios; not yet patched upstream.

---

## Tamir's Involvement & In-Flight Fixes

### Issues Filed by tamirdresher
- #1190 (upgrade pipeline gaps) — filed 1 day ago
- #1157 (two-layer architectural bypass) — filed 5 days ago
- #1013 (two-layer feature design) — filed 1 month ago
- #1003 (wire state backends globally) — filed 1 month ago

### PRs Authored/Owned by tamirdresher
- **#1158** (merged 6 days ago): "Route squad state through runtime tools" — DIRECTLY ADDRESSES #1157
- **#1145** (11 days old): "Add governed memory model, provider boundary"
- **#1161** (5 days old): "chore: add Dependabot configuration"
- **#1159** (6 days old): "bump OTel to 0.217 family"

### PR #1158 Details (Merged Fix)
- **Closes:** #1157 (primary fix for two-layer bypass)
- **Changes:** +2500 -1276 lines; 7 commits
- **Review Status:** ✅ Approved by bradygaster, serbrech commented
- **Scope:** Runtime state tools, fail-closed on unavailable backends, prompt updates, regression coverage

---

## Known Gaps & Next Steps

### Upgrade Pipeline (Theme 1)
- [ ] Fix ESM patch to include repo-local node_modules (Finding 1.1)
- [ ] Wire `--state-backend` migration in upgrade flow (Finding 1.2)
- [ ] Add portable teamRoot default + upgrade config merge semantics (Finding 1.3)
- [ ] Add integration test: upgrade from orphan → two-layer with all hooks + config verified

### State Backend Wiring (Theme 2)
- [x] Add runtime state tools (PR #1158 merged)
- [ ] Phase 2: Migrate `squad init` to use state backend
- [ ] Phase 2: Migrate agent history reads/writes to backend
- [ ] Phase 2: Migrate decisions inbox merge (Scribe) to backend
- [ ] Phase 3: Migrate skills, casting, remaining modules
- [ ] Phase 3: Add caching layer for git-notes
- [ ] Phase 3: Address concurrency (retry for git-notes, locking for orphan)

### Coordinator State Resolution (Theme 3)
- [ ] Unify TEAM_ROOT definition (repo root + STATE_ROOT for `.squad/`)
- [ ] Document path semantics: absolute/relative, repo-root/squad-direct
- [ ] Fix worktree awareness step ordering (git root first)
- [ ] Patch coordinator prompt upstream (ralarcon offered PR)

### Permission API (Theme 4)
- [ ] Update `approveAllPermissions` return value to match Copilot CLI v1.0.54+ contract
- [ ] Update type definitions (SquadPermissionRequestResult.kind)
- [ ] Test with post-v1.0.54 Copilot CLI

---

## Recommendations

### Immediate (Next 1–2 Days)
1. **Triage #1191:** Urgent permission API fix; ship in next insider/stable
2. **Validate #1158:** Merged PR; confirm regression tests pass and prompts updated correctly
3. **Create integration test:** Upgrade flow (orphan → two-layer) with all three systems verified

### Short Term (Week 1)
1. Patch coordinator state resolution (#1163, coordinate with ralarcon PR)
2. Fix upgrade pipeline gaps (#1190 Findings 1.1–1.3)
3. Confirm squad externalize works for gitignored workflows (#643 resolution)

### Medium Term (Weeks 2–4)
1. Phase 2 of state backend wiring (#1003): init, history, decisions
2. E2E test coverage: multi-session, multi-agent, state isolation
3. Performance: caching for git-notes, concurrency handling

---

## Related Artifacts

- PR #1158: Route squad state through runtime tools (MERGED — fixes #1157)
- PR #1004: feat: wire state backends into all squad operations (Phase 1 of #1003)
- PR #1132: State & Team Root Resolution (introduced #1163 inconsistencies)
- PR #797: Add squad externalize command (resolved #643)
- Blog: [Scaling AI Part 7B — Git Notes](https://www.tamirdresher.com/blog/2026/03/23/scaling-ai-part7b-git-notes) — two-layer architecture design

---

## Research Notes

### Search Keywords That Worked
- "state backend" → 33 issues (broad signal)
- "git-notes" → 38 issues (backend-specific)
- "two-layer" → 42 issues (architecture variant)
- "upgrade" + "state" → most recent action items
- "insider" (open only) → 10 issues (release-specific)

### Dominant Temporal Signal
- insider.2 released ~3 days before report date
- #1190, #1185 filed 1–3 days post-release
- Suggests rapid community feedback loop on state issues

### Process Quality
- tamirdresher active on issues (filed 4 majors, owns primary fix PR #1158)
- Community contributions (ischrei #1185, ralarcon #1163) high quality with clear reproducers
- Cross-issue referencing strong (issues link upstream/downstream correctly)



---
