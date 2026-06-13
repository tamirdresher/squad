# Round 4 — Phase B (B3 + B4) — Reliability & Concurrency Findings — Worf

**Reviewer:** Worf (Security & Reliability)
**Round:** 4
**Phase:** B3 (deleteDir recursion) + B4 (concurrent git-notes writer race)
**Subject:** `@bradygaster/squad-{sdk,cli}@0.9.6-preview.21` — two-layer state backend
**HOME `mcp-config.json` SHA256 (before & after):** `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` ✓ (matches invariant — no host tampering)
**Sandboxes:** `C:\Users\tamirdresher\squad-validation\round4\sandbox-W-B3`, `…\sandbox-W-B4` (cleaned at end)

---

## TL;DR

| Concern | Verdict | Severity | Ship-blocking? |
|---|---|---|---|
| **E** — `deleteDir()` leaks nested subtrees | **CONFIRMED** for `local` (crashes + leaks 5/6) and `git-notes` (silent leak 4/6); accidentally safe for `orphan` (0/6) | HIGH | YES for the local backend (throws partway); HIGH for two-layer because git-notes layer answers reads with stale data |
| **A** — concurrent git-notes writers silently lose data | **CONFIRMED, CATASTROPHIC** | CRITICAL | YES — must not promote two-layer to default until CAS lands |

Two-layer is **not** safe to enable as the default backend until both are fixed. The orphan layer's apparent correctness on B3 is an implementation accident (name-based tree filtering in `removeFromTree`) and provides no defence on B4.

---

## B3 — `deleteDir()` recursion

### Method
`test-b3-multi.mjs` instantiates each backend directly, writes the same 6 nested keys (depths 1–4 under `agents/foo/...`), then calls `StateBackendStorageAdapter.deleteDirSync('.squad/agents/foo')` and probes every key with `backend.read(...)`. Each backend gets its own clean storage namespace; we do NOT short-circuit through TwoLayerBackend so we can attribute leakage per layer.

### Results

| Backend | Leaked / total | `deleteDirSync` threw? | Severity |
|---|---|---|---|
| `local` (WorktreeBackend) | **5/6** | YES — `StorageError: delete failed for "history": EPERM` (unlink on directory) | HIGH — aborts loop, partial fs state |
| `git-notes` (GitNotesBackend) | **4/6** | no | HIGH — silent, all nested keys survive |
| `orphan` (OrphanBranchBackend) | 0/6 | no | OK (incidental — see root cause) |

Raw evidence: `sandbox-W-B3/result-B3-evidence.txt` (lines 1–60 capture all three backends).

Key transcript excerpt (git-notes):
```
AFTER list("agents/foo"): ["history","skills"]
  GONE    agents/foo/charter.md
  GONE    agents/foo/history.md
  LEAK    agents/foo/history/2026/06/04.md => "..."
  LEAK    agents/foo/history/2026/06/05.md => "..."
  LEAK    agents/foo/skills/skill-a.md => "..."
  LEAK    agents/foo/skills/skill-b/SKILL.md => "..."
```

### Root cause
`StateBackendStorageAdapter.deleteDir(rel)` lists one level via `backend.list(rel)` and calls `backend.delete(rel + '/' + entry)` for each child. It assumes `backend.delete` itself recurses. It does not — at least not uniformly:

- **local:** `WorktreeBackend.delete → storage.deleteSync → fs.unlinkSync`. On Windows, `unlinkSync` of a directory throws `EPERM` and the `deleteDir` for-loop is aborted; surviving entries (`history.md`, `skills/*`, the rest of `history/*`) remain on disk.
- **git-notes:** Blob keys are full path strings. `delete('agents/foo/history')` looks up the literal key `agents/foo/history` (which doesn't exist — only `agents/foo/history.md` and `agents/foo/history/2026/06/04.md` do), returns `false`, and every `agents/foo/history/*` key survives in the JSON blob. List still synthesises a `history` directory entry from the surviving keys.
- **orphan:** `removeFromTree` filters mktree entries by leaf-name match without distinguishing `blob` from `tree`, so a single `delete` with leaf name `history` strips the whole subtree. This is *correct by accident* — flip a single conditional in that filter and the bug returns.

### Two-layer impact
`TwoLayerBackend` writes to both layers but reads from git-notes first. Therefore even though the orphan layer would self-clean, consumers reading after a `deleteDir` see the **git-notes** view, which still contains every leaked nested key. Two-layer is leaky end-to-end.

### Fix sketch
1. **Adapter:** make `deleteDir` recursive — for each entry, call `list(entry)`; if non-empty, recurse first, otherwise call `delete`. This makes every `backend.delete` call target a leaf, which all three backends already handle correctly.
2. **Belt & suspenders:** harden each backend's `delete`:
   - `WorktreeBackend.delete` → detect `isDirectorySync` and use `fs.rmSync(full, {recursive: true, force: true})`.
   - `GitNotesBackend.delete` → also delete every blob key whose path starts with `rel + '/'`.
3. **Test:** add the `test-b3-multi.mjs` matrix to the SDK's contract test suite so any future regression in `removeFromTree` is caught.

---

## B4 — Concurrent git-notes writer race

### Method
`writer.mjs` spawns sequentially per process and calls `GitNotesBackend.write('writers/<id>/<seq>', payload)` `M` times. PowerShell harness `run-harness.ps1` spawns `N` writer processes with `Start-Process … -PassThru -NoNewWindow`, then `Wait-Process` on the array. After all processes exit, `reader.mjs` walks `list('writers')` recursively and counts persisted leaves. Three configurations were run after clearing prior `writers/` state.

### Results

| Run | Writers × Writes | Attempted | Writer-reported OK | Writer errors | Persisted | **Lost** | Loss % | Duration | All exit 0? |
|---|---|---:|---:|---:|---:|---:|---:|---:|:---:|
| 1 | 2 × 10  | 20  | 20  | 0 | **10** | 10 | **50.0 %** | 3.5 s  | ✓ |
| 2 | 5 × 20  | 100 | 100 | 0 | **22** | 78 | **78.0 %** | 9.3 s  | ✓ |
| 3 | 10 × 10 | 100 | 100 | 0 | **14** | 86 | **86.0 %** | 10.2 s | ✓ |

Raw evidence: `sandbox-W-B4/result-B4-evidence.txt`.

### Root cause
`GitNotesBackend.write` is a classic unprotected read-modify-write:

```js
const blob = this.loadBlob();          // git notes show <root>
blob[normalizeKey(key)] = content;     // in-memory mutation
this.saveBlob(blob);                   // git notes add -f --file - <root>  (unconditional overwrite)
```

There is no CAS, no advisory lock, no retry-on-stale, no validation that the note OID we wrote on top of is the one we read from. Two writers reading the same anchor blob each save their own version; the last save wins and every other writer's keys vanish — including keys that writer had successfully written in earlier iterations of the same process. Writers receive **no error**, exit code 0.

The `CircuitBreaker` around `write` does not help: it only opens on git invocation failures, which never happen here because `git notes add -f` always succeeds.

### Blast radius for the squad-agents-ai workflow
- **Any** consumer that runs >=2 squad agent processes concurrently against the same repo is exposed: parallel research delegations, parallel `task` sub-agents using shared state, multi-shell developer sessions, CI parallel jobs.
- Loss rate grows non-linearly with writer concurrency (50 % → 78 % → 86 %), so the failure mode worsens precisely when the system is under load — when symptoms are easiest to misattribute to user error.
- In the two-layer backend, writes hit the orphan layer **second**, so the orphan branch tends to be a superset of git-notes. But reads come from git-notes first, so consumers see the lossy view. A "self-repair" reconciliation pass that promotes orphan-only keys back into git-notes would mitigate but not eliminate loss (writer ordering against the orphan layer has its own race).

### Fix sketch
1. **CAS write loop in `GitNotesBackend.saveBlob`:**
   - Capture the current `refs/notes/squad` OID before `loadBlob` returns.
   - Stage the new note object (`git hash-object -w …`) and rebuild the notes tree.
   - Atomically swap with `git update-ref refs/notes/squad <new> <expected-old>`.
   - On stale-OID failure, re-read, replay our key mutation, retry with bounded attempts (e.g. 8) and 50–500 ms jittered backoff. Fail with a typed `ConcurrentNotesWriteError` after exhaustion.
2. **CircuitBreaker must propagate** `ConcurrentNotesWriteError` rather than swallow it; callers must be able to see the failure.
3. **Two-layer reconciliation** as a defence-in-depth: on read miss in git-notes, fall through to orphan and write-repair.
4. **Test:** the `run-harness.ps1` matrix above belongs in the SDK CI as a contract test gating any release that touches the notes backend.

---

## Reliability verdict

- **Concern E (deleteDir):** real, multi-backend, fixable with an adapter-level recursion change. Severity HIGH because data the user thinks they deleted survives reads.
- **Concern A (writer race):** real, catastrophic, structural. The git-notes backend in its current form cannot be the read path for any multi-writer workload.

**Two-layer must not be promoted to default in #1211** until:
1. `StateBackendStorageAdapter.deleteDir` is made recursive AND both backends harden their `delete` (B3 fix).
2. `GitNotesBackend.saveBlob` uses a CAS swap with bounded retry (B4 fix).
3. The two test harnesses produced here are landed as CI gates.

Until then, the supported configurations are: single-writer workflows (e.g. one `squad` process per repo), or sticking with the `orphan` backend (which has its own issues but does not exhibit B4-level silent loss because `mktree`+`update-ref` is at least atomic).

---

## Recommended acceptance criteria for PR #1211 (two-layer default)

1. `node test-b3-multi.mjs` reports `leaked: []` for all three backends and `threw: no` for all three.
2. `run-harness.ps1 -N 10 -M 10` reports `lost: 0` and `lossPct: 0`. Any non-zero loss is a regression.
3. Documented behaviour: explicit failure mode (typed error + non-zero exit) when CAS exhausts retries. No silent overwrite anywhere in the write path.
4. A `squad doctor` (or equivalent) check that detects orphan/git-notes layer divergence and surfaces it as a warning.

---

## Cleanup confirmation
- HOME `mcp-config.json` SHA256 unchanged: `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86`
- Sandboxes `sandbox-W-B3` and `sandbox-W-B4` removed after evidence files were captured.
