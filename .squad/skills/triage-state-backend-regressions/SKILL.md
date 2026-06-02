# Skill: Triage State-Backend Regressions

**Owner:** Data  
**Created:** 2026-05-31T14:09:11Z  
**Applies to:** Squad CLI/SDK releases; state-backend changes in `packages/squad-sdk/src/state-backend.ts`

---

## When to use this skill

Use when a Squad CLI release changes the state backend (new type, rename, new class, new method on `StateBackend` interface) and regression reports appear, or as a pre-release audit before tagging an insider/stable release.

---

## Step-by-step procedure

### 1. Establish baselines

```powershell
# List tags to confirm both baseline and target exist
git -C <squad-repo> tag --list "v*" | Sort-Object

# Confirm the target tag commit and branch
git -C <squad-repo> log -1 --oneline <target-tag>
git -C <squad-repo> branch -r --contains <target-tag>
```

**Key gotcha:** Insider tags are sometimes only on feature branches, not on `dev`. If a referenced tag (e.g., `v0.9.6-insider.2`) doesn't exist, use the nearest prior stable release as the baseline and document the discrepancy.

---

### 2. Diff `state-backend.ts`

```powershell
git -C <squad-repo> diff <baseline>..<target> -- packages/squad-sdk/src/state-backend.ts
```

Check for:
- **Type renames** in `StateBackendType` union — any removed or renamed value is a breaking config.json migration
- **New interface methods** on `StateBackend` — any existing class that implements the old interface without the new methods becomes a compile/runtime error
- **Error surface changes** — `execFileSync` instead of wrapper, try/catch structure changes
- **`resolveStateBackend()` fallback logic** — does an explicit backend config now throw instead of fall back?
- **`normalizeBackendType()`** — what do legacy names map to? Does the migration change behavior materially (e.g., no-orphan-branch → creates orphan-branch)?

---

### 3. Check the permission handler

```powershell
git -C <squad-repo> show <target>:packages/squad-cli/src/cli/shell/index.ts | Select-String "kind.*approv|approveAll"
```

The permission handler `kind` must match the Copilot CLI SDK contract:
- Copilot CLI **≤ v1.0.53**: `{ kind: 'approved' }`
- Copilot CLI **≥ v1.0.54**: `{ kind: 'approve-once' }`

A mismatch here silently breaks ALL agent operations — permission check happens before any backend code runs.

---

### 4. Survey in-flight fix branches

```powershell
git -C <squad-repo> branch -r | Select-String "state-backend|permission|coordinator-bugs|extern"
```

For each relevant branch, check if it's ahead of or behind the target tag:
```powershell
git -C <squad-repo> log --oneline <target>..<branch> | Select-Object -First 5
git -C <squad-repo> log --oneline <branch>..<target> | Select-Object -First 5
```

Branches to watch for state-backend work:
- `squad/864-state-backend-hardening` — retry + circuit-breaker
- `squad/949-fix-externalized-state-paths` — externalized path resolution
- `bradygaster/squad-p1-coordinator-bugs` — coordinator P1s + state fallback logic
- `squad/1191-fix-cli-permission-contract` / `copilot/bug-squad-cli-permission-issues` — permission kind

---

### 5. Check the coordinator template for stale backend documentation

```powershell
git -C <squad-repo> show <target>:.github/agents/squad.agent.md | Select-String "stateBackend|STATE_BACKEND|git-notes|worktree|two-layer|orphan"
```

Verify: the valid values documented in `"Resolve state backend:"` section match the actual `StateBackendType` union in `state-backend.ts`. Stale docs cause agents to pass wrong `STATE_BACKEND` values into spawn prompts, breaking `{% if STATE_BACKEND == "..." %}` template blocks.

---

### 6. Check `StateBackendStorageAdapter.toRelative()` for platform issues

```powershell
git -C <squad-repo> show <target>:packages/squad-sdk/src/state-backend.ts | Select-String -Context 5 "toRelative"
```

On Windows: verify that the prefix-stripping uses `path.resolve()` (case-folding, canonical form) on both sides, not `path.normalize()` alone. Mismatched case (e.g., `C:\` vs `c:\`) can cause the prefix-strip to fail and leak absolute paths into git notes refs.

---

### 7. Produce the bug report

For each bug found, record:
- **Severity** (P0/P1/P2/P3)
- **File and function**
- **Root cause** (minimal code snippet)
- **Impact** (who is affected, what breaks)
- **Fix branch** (if one exists)
- **Status** (fixed in target, not fixed, fix available but not merged)

Write to `.squad/decisions/inbox/{agent}-state-backend-{version}-triage.md`.

---

## Common bugs by category

| Category | Signal | Check |
|----------|--------|-------|
| Permission contract | All agent ops fail/hang; no state writes succeed | `shell/index.ts` `kind` value |
| Backend type rename | Config.json users silently switch backends | `StateBackendType`, `normalizeBackendType()` |
| No-fallback on explicit config | Hard error instead of graceful degradation | `resolveStateBackend()` throw logic |
| Stale coordinator docs | `STATE_BACKEND` template blocks never fire | `squad.agent.md` valid values list |
| Externalized path | State writes go to wrong directory | `state-mcp.ts` `resolveSquadState()` path |
| Windows path normalization | Absolute path leaks into git notes key | `StateBackendStorageAdapter.toRelative()` |

---

## Artifacts from first use

- Triage session: 2026-05-31, squad-squad repo, insider.3 investigation
- Decision doc: `.squad/decisions/inbox/data-state-backend-insider-triage.md`
- 7 bugs catalogued; Bug A (P0 permission contract) is the top-priority finding
- Git tag `v0.9.6-insider.2` confirmed absent — only `v0.9.6-insider.3` tagged
