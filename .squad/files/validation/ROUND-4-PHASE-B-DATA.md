# Round 4 — Phase B (Data) — ENOBUFS Repro & Fix Proof

**Date:** 2026-06-04
**Agent:** Data (Squad Framework Expert)
**Scope:** B1 (promoteNotes huge commit graph) + B2 (scribe read huge orphan)
**Status:** Both bugs reproduced, both fixes proven locally with the same single patch.

---

## Headline

**B1 and B2 are the same root cause.** Both fail at `state-backend.js` line 37 in `gitExecWithRetry`, which calls `execFileSync` without a `maxBuffer` option. Node's default `maxBuffer` is 1 MB; any git command whose stdout exceeds that throws `ENOBUFS`. PR #1200's two-layer backend introduced two new code paths that routinely exceed 1 MB on large repos:

1. `promoteNotes()` runs `git rev-list HEAD` (entire commit history, ~42 bytes/commit).
2. `OrphanBranchBackend.read()` runs `git show <branch>:<path>` (entire stored blob).

A **single** two-line patch in the shared wrappers fixes both classes of failure and every other gitExec caller as well.

---

## B1 — promoteNotes ENOBUFS on huge commit graph

### Repro

- Sandbox: `C:\Users\tamirdresher\squad-validation\round4\sandbox-D-B1`
- Built a synthetic repo with 30,001 empty commits using `git fast-import` (took ~10 s vs. the ~50 min the loop approach would have taken).
- `git rev-list HEAD | wc -c` = **1,260,042 bytes** (1.20 MB).
- Installed `@bradygaster/squad-cli@0.9.6-preview.21` + `@bradygaster/squad-sdk@0.9.6-preview.21` from the fresh tarballs.
- `squad init --state-backend two-layer`, added one `git notes --ref=squad/test` entry on HEAD.
- Called `backend.promoteNotes('squad/test')` through a Node script.

### Error (unpatched)

```
GitExecError: git command failed: git rev-list HEAD — spawnSync git ENOBUFS
    at gitExecMaybeMissing (state-backend.js:160:15)
    at TwoLayerBackend.promoteNotes (state-backend.js:790:30)
```

Saved to `sandbox-D-B1/result-B1-before.txt`.

### Post-fix result

```
backend: two-layer
OK {"promoted":[],"archived":[],"skipped":1}
```

Saved to `sandbox-D-B1/result-B1-after.txt`. No ENOBUFS — call completes normally.

---

## B2 — Scribe read ENOBUFS on huge orphan decisions.md

### Repro

- Sandbox: `C:\Users\tamirdresher\squad-validation\round4\sandbox-D-B2\sandbox-D-B2-clone`
- Shallow clone of `tamirdresher_microsoft/tamir-squad-hq` (depth=10).
- Installed the same tarballs, ran `squad upgrade --state-backend two-layer`.
- Observed: the existing `decisions.md` stored on the `squad-state` orphan branch is **already 1,083,671 bytes** (`git cat-file -s squad-state:decisions.md`). No synthetic growth required — the bug is live in production data.
- Called `backend.read('decisions.md')` through a Node script (`b2-grow.mjs`).

### Error (unpatched)

```
GitExecError: git command failed: git show squad-state:decisions.md — spawnSync git ENOBUFS
    at gitExecMaybeMissing (state-backend.js:160:15)
    at OrphanBranchBackend.read (state-backend.js:373:29)
    at TwoLayerBackend.read (state-backend.js:697:28)
```

Saved to `sandbox-D-B2/sandbox-D-B2-clone/result-B2-before.txt`.

### Post-fix result

Read of the 1,071,536-byte blob succeeded. Script grew the content to 2.3 MB+ in memory and the subsequent `write` also worked (no ENOBUFS in `gitExecWithInputAndRetry` either, thanks to the same patch applied to the input wrapper).

Saved to `sandbox-D-B2/sandbox-D-B2-clone/result-B2-after.txt`.

---

## Combined fix — suggested diff for #1211 (or follow-up PR)

**File:** `packages/squad-sdk/src/state-backend.ts` (compiled to `dist/state-backend.js`).
**Functions:** `gitExecWithRetry` (around line 37) and `gitExecWithInputAndRetry` (around line 61).

```diff
 function gitExecWithRetry(args, cwd, trimOutput = true) {
     for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
         try {
-            const raw = execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
+            const raw = execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 });
             return trimOutput ? raw.trim() : raw;
         }
         ...
 }

 function gitExecWithInputAndRetry(args, cwd, input) {
     for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
         try {
-            return execFileSync('git', args, { cwd, input, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
+            return execFileSync('git', args, { cwd, input, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 }).trim();
         }
         ...
 }
```

**Why 256 MB?** Round number that comfortably covers:
- ~6 million commits in a `rev-list HEAD` (42 bytes/commit).
- A 256 MB orphan-stored decisions.md or any single state file (vastly larger than any realistic squad-state content).
- Still bounded — protects against infinite-growth scenarios that would deserve a different failure mode.

**Why centralize?** Every git command in the SDK goes through these two wrappers. Patching them once covers:
- `promoteNotes()` rev-list (B1).
- `OrphanBranchBackend.read()` `git show <branch>:<path>` (B2).
- `OrphanBranchBackend.list()` `ls-tree` (potential future hit on very wide trees).
- `OrphanBranchBackend.write()` `hash-object --stdin` (large blobs being written, e.g., scribe rewriting decisions.md).
- Any other current or future SDK git call.

Adding `maxBuffer` at individual callsites would be brittle and miss future regressions.

---

## Confidence assessment

| Scenario | Pre-fix | Post-fix | Confidence |
|---|---|---|---|
| Huge commit graph (>~25k commits) | ENOBUFS on `rev-list HEAD` | Works | **High** — proven on 30k synthetic commits |
| Huge orphan-stored file (>1 MB) | ENOBUFS on `git show` | Works | **High** — proven on real 1.08 MB blob from tamir-squad-hq |
| Huge orphan write (>1 MB blob) | Would ENOBUFS on `hash-object --stdin` output (the SHA is tiny but git can buffer warnings) | Works | **Medium** — fix applies, exercised indirectly when the post-fix script grew & wrote 2.3 MB |
| Very wide orphan tree (`ls-tree`) | Same risk if >1 MB | Works | **Medium** — fix applies generically, not exercised in this run |

**These two fixes do unlock the huge-repo and huge-orphan cases.** They do NOT address:
- The PromoteNotes `git notes show` argument-splitting bug visible incidentally in B2's after-output (a separate parsing issue where space-split args mishandle batches; out of scope here).
- B3 (`deleteDir` orphan leak — Worf's task).
- B4 (concurrent writer race — Worf's task).

---

## Safety confirmation

- **HOME mcp-config sha256 before:** `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86`
- **HOME mcp-config sha256 after:** `928760588EE047B9A96E7F85150907B97F369C1FDB088D4ED959D03D205D3A86` ✅ unchanged.
- No GitHub pushes performed.
- No new GitHub repos created.
- Only `sandbox-D-*` directories touched (B'Elanna's `sandbox-A*` and Worf's `sandbox-W-*` untouched).
- `gh auth` left at `tamirdresher_microsoft`.

## Cleanup

Sandbox deletion is deferred to the end of the joint Phase B effort (after Worf finishes B3/B4 so the team can inspect artifacts if needed). The two `sandbox-D-*` trees totalling ~250 MB will be removed in the final teardown step.
