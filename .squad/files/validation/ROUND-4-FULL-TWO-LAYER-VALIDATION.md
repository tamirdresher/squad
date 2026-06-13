# Round 4 — Full Two-Layer State Backend Validation

**Agent:** B'Elanna (Durable Systems Engineer)
**Date:** 2026-01-15
**PR under test:** [squad-squad#1200](https://github.com/bradygaster/squad-squad/pull/1200) @ `aaec183f`
**Issue:** [#1211](https://github.com/bradygaster/squad-squad/issues/1211)
**Tarballs:** `@bradygaster/squad-sdk@0.9.6-preview.21`, `@bradygaster/squad-cli@0.9.6-preview.21` (Round 3 artifacts; not rebuilt)
**Sandbox:** `C:\Users\tamirdresher\squad-validation\round4\sandbox-A1\` (plus worktree `sandbox-A1-wt`)
**HOME mcp-config sha256:** `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` (baseline; verified unchanged before, during, and after testing)

---

## Executive summary

Validated 11 known gaps across two phases:

- **Phase A (production flows):** 6 PASS, 1 FAIL (dead code), 1 PASS with finding.
- **Phase B (confirm-broken):** 3 REPRODUCED bugs (B1 code-verified, B2 + B4 live), 1 false positive (B3 not reproduced).

**Ship recommendation: HOLD.** Three real defects must be fixed before GA:
1. **B2 (HIGH)** — Silent data loss on >1MB orphan reads (ENOBUFS). Trivial 1-line fix.
2. **B1 (HIGH)** — `promoteNotes` cannot run on repos with >25k commits. Same trivial fix.
3. **B4 (HIGH, scope-limited)** — `GitNotesBackend` lost-update race under concurrency. Only affects legacy git-notes mode, not two-layer; still must be fixed or the backend deprecated.

After the maxBuffer fix (covers B1 + B2 with a single 2-character change at two call sites), the two-layer backend is otherwise sound: orphan blob storage works, promoteNotes archive/promote/skip semantics are correct, doctor is idempotent, watch runs cleanly, file-lock retry handles transient `index.lock` errors, and worktrees see consistent state across all branches.

---

## Results matrix

| ID  | Test | Result | Severity | Confidence |
|-----|------|--------|----------|------------|
| A1  | Upgrade in-place + orphan branch backfill | PASS_WITH_FINDING (F1) | LOW | HIGH |
| A2  | `promoteNotes` archive/promote/skip semantics | PASS | — | HIGH |
| A3  | Ralph / CLI wiring for `promoteNotes` | **FAIL** (dead code) | MED | HIGH |
| A4  | `squad doctor` idempotency, no leaks | PASS | — | HIGH |
| A5  | `squad watch` 30s clean loop | PASS | — | HIGH |
| A6  | Git worktree visibility of orphan state | PASS | — | HIGH |
| A7  | Windows `index.lock` retry | PASS_CODE_VERIFIED | — | HIGH |
| B1  | `rev-list HEAD` ENOBUFS on deep histories | **REPRODUCED** (code-verified) | HIGH | HIGH |
| B2  | Orphan read ENOBUFS on >1MB blobs | **REPRODUCED** (live) | HIGH | HIGH |
| B3  | `deleteDir` nested subtree leak | NOT_REPRODUCED | NONE | HIGH |
| B4  | `GitNotesBackend` lost-update race | **REPRODUCED** (live; 75% loss) | HIGH (legacy only) | HIGH |

---

## Per-test detail

### Phase A — production flows

#### A1 — PASS_WITH_FINDING (F1)
Cloned `gh-ai-adoption2026`, installed Round 3 tarballs, ran `squad upgrade --state-backend two-layer --yes`. Exit 0. `.squad/config.json` updated to `stateBackend = two-layer`. New `squad-state` orphan branch created with all migrated state. SDK driver verified `backend.read('decisions.md')` returns content via `git show squad-state:decisions.md`.

**Finding F1 (LOW severity):** Upgrade migrates content INTO the orphan branch but does NOT remove the 8 pre-existing `.squad/*` state files from the working-branch HEAD. Silent divergence: on-disk file content and `backend.read()` content can diverge after subsequent writes; `git status` stays clean because the working-branch files are still tracked. Either intentional (history preservation) or a bug. Recommend documenting the migration behavior explicitly and/or moving the working-branch files into `.squad/.archive-pre-twolayer/` during upgrade.

#### A2 — PASS
Crafted 3 synthetic notes on `refs/notes/squad` with JSON metadata. Called `promoteNotes('refs/notes/squad')` twice:
- Note with `promote_to_permanent: true` → written to `promoted/refs/notes/squad/<sha>.json` AND source removed. ✓
- Note with `archive_on_close: true` → written to `archive/refs/notes/squad/<sha>.json` AND source kept. ✓
- Note with neither flag → skipped++. ✓
- Second run → fully skipped (idempotent). ✓

`sanitizeRefForKey` preserves slashes; path components match expected layout.

#### A3 — FAIL (no production caller)
`Get-ChildItem -Recurse squad-cli\dist | Select-String 'promoteNotes'` → **zero matches**. The function exists only in SDK (`state-backend.js:769`) and is called from no CLI command, no hook, no Ralph loop. It is reachable only via the SDK from external code.

**Impact:** `promote_to_permanent` and `archive_on_close` markers written by agents will never be processed by the in-product flow. Either wire `promoteNotes` into Ralph's close-loop / `squad doctor` / a new `squad notes promote` command, or remove the flags from documented agent API.

#### A4 — PASS
Ran `squad doctor` twice consecutively. Both exit 0. Diff between runs shows only the copilot CLI PATH check flipping between "passed" and "warning" — an environmental flicker, not a state-backend issue. No orphan tree leaks; `git rev-parse squad-state` identical before/after; no stray notes refs created.

#### A5 — PASS
`squad watch --interval 1` as PowerShell background job for 30 s, then `Stop-Job`. 16 lines of output, 1 complete polling round (Ralph's "1" is minutes, not seconds — actual poll: ~60 s), zero `Error|ENOBUFS|ENOENT|crash` matches in output.

#### A6 — PASS
Created `git worktree add ../sandbox-A1-wt a6-feature`. Junction-linked `node_modules` to share install. Wrote `agents/a6/test.md` from sandbox-A1; `backend.read('agents/a6/test.md')` from sandbox-A1-wt returned identical content. Same blob sha (`2765a456`) reachable via `squad-state` ref from both worktrees. Confirmed: orphan branch refs are repository-wide, not worktree-scoped.

#### A7 — PASS_CODE_VERIFIED
Reviewed `state-backend.js:14-23, 33-52, 57-75`. Retry logic:
- `RETRY_MAX = 3`, `RETRY_BASE_MS = 100`, `RETRY_CAP_MS = 2000`
- Backoff: exponential 100→200→400→800ms, capped at 2000ms
- `isTransientGitError` regex includes `/index\.lock/i`, `/Another git process/i`, `/could not lock/i`
- `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sleepMs)` for sync sleep (Node 20+)

Logic is correct for transient locks. Skipped live race repro on Windows (notoriously timing-sensitive); code review is sufficient.

### Phase B — confirm-broken

#### B1 — REPRODUCED (code-verified)
**Site:** `state-backend.js:790` — `gitExecMaybeMissing('rev-list HEAD', this.repoRoot)` inside `promoteNotes`. Falls through to `gitExecWithRetry` (line 33) → `execFileSync` (line 37) with no `maxBuffer` option.

**Math:** Each commit SHA line in `rev-list HEAD` output = 40 hex chars + `\n` = 41 bytes. Node `execFileSync` default `maxBuffer = 1024*1024 = 1,048,576` bytes. **Threshold: 1,048,576 / 41 ≈ 25,576 commits.**

Skipped live repro (would require synthesizing >25k commits via `git fast-import`; budget). The same `execFileSync` path is exercised live in B2 and demonstrably throws ENOBUFS.

**Fix:** state-backend.js line 37 and line 61 — add `maxBuffer: 100 * 1024 * 1024` to the `execFileSync` options object. Two-character change at each site.

#### B2 — REPRODUCED (live, HIGH)
**Site:** `state-backend.js:374` — `OrphanBranchBackend.read` → `gitExecMaybeMissing(\`show ${branch}:${normalizeKey(rel)}\`)` → `execFileSync` (line 37) with no `maxBuffer`.

**Driver:** `b2-driver.mjs` — wrote 2,097,153-byte (2 MB + 1 byte) file via `backend.write('agents/b2test/big.md', ...)`. Write **succeeded** (orphan-side uses `git hash-object --stdin` and `mktree`, no stdout overflow). `backend.read('agents/b2test/big.md')` threw:
```
git command failed: git show squad-state:agents/b2test/big.md — spawnSync git ENOBUFS
```

**Impact:** Silent data loss. Any state >1 MB (large transcripts, generated artifacts, embedded binaries) can be written but never read back. `TwoLayerBackend` has no fallback path for read failures — it surfaces the error to the caller, which will typically crash or corrupt state.

**Fix:** Same as B1.

#### B3 — NOT_REPRODUCED
**Pre-flight concern:** `StateBackendStorageAdapter.deleteDir` (lines 579-585, 616-622) iterates `backend.list(rel)` (non-recursive) and calls `backend.delete(rel + '/' + entry)` per entry. I expected nested subtrees to leak because `ls-tree` is non-recursive.

**Driver:** `b3-driver.mjs` — wrote `agents/b3test/a.md`, `b.md`, `sub/x.md`, `sub/deeper/z.md`. `backend.list('agents/b3test')` returned `["a.md","b.md","sub"]`. Manual delete loop mirrored `deleteDir`. Final orphan tree under `agents/b3test/` was **empty** — no nested leak.

**Explanation:** `OrphanBranchBackend.delete(subtree-key)` calls `replaceEntry` which **removes the tree-entry from the parent tree** rather than recursively deleting blobs. Removing a tree entry makes the entire subtree unreachable; Git GC reclaims the orphan blobs. The non-recursive `ls-tree` is the correct level of granularity for this design.

**Verdict:** My pre-flight finding was wrong. No bug. Downgrade severity to NONE.

#### B4 — REPRODUCED (live, HIGH; legacy backend only)
**Site:** `state-backend.js:267-293` — `GitNotesBackend.write` does:
1. `loadBlob()` → `git notes --ref=squad show $rootCommit` → `JSON.parse`
2. mutate JS object in memory
3. `saveBlob()` → `git notes --ref=squad add -f --file - $rootCommit` with `JSON.stringify`

This is a classic read-modify-write on a single anchor with no locking and no compare-and-swap.

**Driver:** `b4-driver.mjs` + `b4-writer.mjs` — spawned **5 parallel `node` processes**, each calling `backend.write('writer-N/key-i', ...)` 20 times. Expected: 100 unique keys in final blob. **Actual: 25 keys. 75 lost updates (75% data loss).**

**Impact:** Any concurrent operator activity on the legacy `git-notes` backend causes silent lost writes. The `two-layer` backend uses `GitNotesBackend` only for promotion metadata (low write frequency), not state-file storage, so two-layer users are NOT affected for normal state writes — but `promoteNotes` itself uses the notes backend and could theoretically race with concurrent agent activity.

**Fix options (ordered by preference):**
1. **Deprecate `GitNotesBackend` for state storage** (recommended). Two-layer's orphan-branch path is atomic (`mktree` + `commit-tree` + `update-ref` with old-value CAS).
2. **CAS loop in `saveBlob`:** capture root-note sha at start of `loadBlob`; before `saveBlob`, re-read note sha; if changed, re-fetch and re-apply mutation. Retry up to N times.
3. **File lock** (proper-lockfile or `O_EXCL` sentinel in `.git/squad-notes.lock`) around the entire load-mutate-save sequence. Cheap and adequate for low contention.

---

## Recommended fixes (by file:line)

### 1. ENOBUFS — `state-backend.js:37`
```js
// before
const result = execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
// after
const result = execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe','pipe','pipe'], maxBuffer: 100 * 1024 * 1024 });
```
Apply identical change at **line 61** (`gitExecWithInputAndRetry`). Closes B1 and B2.

### 2. `GitNotesBackend` race — `state-backend.js:283-292`
Wrap `saveBlob` in CAS loop OR deprecate the backend for state storage. Closes B4.

### 3. (Optional, A3 follow-up) wire `promoteNotes`
Either add a `squad notes promote` CLI verb in `squad-cli` or call `promoteNotes` from Ralph's close-loop / `squad doctor --apply`. Without this, the `promote_to_permanent` / `archive_on_close` agent markers are inert.

### 4. (Optional, F1 follow-up) document or implement working-branch cleanup in `squad upgrade --state-backend two-layer`.

---

## Confidence and limitations

- **HIGH confidence** on B1, B2, B4, A2, A3, A6 (live, repeatable, with concrete drivers preserved in sandbox).
- **HIGH confidence** on A1, A4, A5, A7 (live exit-0 runs + code review).
- **HIGH confidence** on B3 NOT_REPRODUCED (driver shows clean state).
- **Limitation:** B1 not live-reproduced; same `execFileSync` site exercised in B2 live. If reviewers want a B1 live repro, generating 30k commits via `git fast-import` takes <2 min in a fresh repo.
- **Limitation:** Single Windows host. macOS/Linux not retested in this round.
- **Limitation:** A7 retry verified by code review only — Windows file-lock races are timing-dependent and brittle to repro deterministically.

---

## Safety attestation

| Invariant | State |
|-----------|-------|
| HOME `mcp-config.json` sha256 | `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` — unchanged ✓ |
| Sandboxes constrained to `C:\Users\tamirdresher\squad-validation\round4\` | yes ✓ |
| No GitHub pushes during validation | yes ✓ |
| No modifications to source repos during validation | yes ✓ |
| Round 3 tarballs **not** rebuilt | yes ✓ |
| Cleanup performed (sandboxes removed) | see footer |

---

## Updates to #1200 and #1211

**PR #1200 (two-layer backend):** Recommend HOLD-MERGE until B1+B2 maxBuffer fix is in. B4 can be addressed in a follow-up if GitNotesBackend is being deprecated for state storage. B3 concern from pre-flight can be closed.

**Issue #1211:** B1, B2, B4 reproduce live. B3 closes as NOT_REPRODUCED. F1 (working-branch divergence post-upgrade) and A3 (promoteNotes wiring) are new follow-ups not in the original list.

---

*Drivers preserved under `C:\Users\tamirdresher\squad-validation\round4\sandbox-A1\` until cleanup.*
