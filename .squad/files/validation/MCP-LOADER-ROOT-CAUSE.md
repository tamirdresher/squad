# MCP Tools Unavailable — Root Cause Analysis

**Date:** 2026-06-02T19:18:27.631+03:00
**Author:** Data
**Test environment:** `C:\Users\tamirdresher\squad-validation\tamir-squad-hq-dup-20260602T183202\` (post-upgrade two-layer state from data-14)

---

## Symptom recap

Across all 6 tarball validation runs in iteration 3, fresh-init / upgrade correctly pinned `squad_state` in `.copilot/mcp-config.json` to the local CLI version. But agents in subsequent `copilot --yolo --autopilot --agent squad -p ...` sessions reported "tool unavailable" when trying to call `squad_state_*`. Orphan branch did not grow across 4 continuity sessions on `tamir-squad-hq`.

Standalone `squad state-mcp` direct JSON-RPC handshake returned all 7 tools, so the server itself is healthy. The disconnect was between the committed launch spec and what actually starts when the MCP host (Copilot CLI) resolves it.

---

## Theories tested

### Theory 1 — Session reload required (Tamir)

> Copilot CLI loads MCP servers ONCE at session start; adding the entry to `.copilot/mcp-config.json` mid-session doesn't trigger reload. A fresh `copilot` invocation should pick them up.

**Test:** would have been a fresh-process `copilot --agent squad -p ...` against the dup post-upgrade.

**Verdict:** **Moot — never reached.** Theory 2 was confirmed first and explains the symptom completely; the fresh-session test cannot disprove Theory 2 because the same broken launch spec gets resolved every time.

**Note:** Theory 1 may still be partially true as a *separate* concern (Copilot CLI almost certainly does cache MCP catalog at session start), but it is **not** the cause of the orphan-stayed-empty symptom we observed.

### Theory 2 — Unresolvable npx version (Coordinator)

> The pinned version `0.9.6-preview.5` is the LOCAL tarball version, never published to npm. `npx -y @bradygaster/squad-cli@0.9.6-preview.5 state-mcp` ETARGETs at the registry, the server never starts, the MCP host registers zero tools.

**Test 1 — what versions are actually on npm:**

```
> npm view @bradygaster/squad-cli versions --json
[ ..., "0.9.4", "0.9.5-insider.1", "0.9.5-insider.2",
  "0.9.6-insider.1", "0.9.6-insider.2", "0.9.6-insider.3" ]

> npm view @bradygaster/squad-cli dist-tags --json
{ "preview": "0.8.17-preview", "latest": "0.9.4", "insider": "0.9.6-insider.3" }
```

`0.9.6-preview.5` is **not** on npm. Highest published version is `0.9.6-insider.3`. (The `preview` dist-tag is stale at `0.8.17-preview`, unrelated.)

**Test 2 — what happens when MCP host tries the committed spec:**

```
> npx -y @bradygaster/squad-cli@0.9.6-preview.5 state-mcp
npm error code ETARGET
npm error notarget No matching version found for @bradygaster/squad-cli@0.9.6-preview.5.
npm error notarget In most cases you or one of your dependencies are requesting
npm error notarget a package version that doesn't exist.
```

Process exits non-zero immediately. No JSON-RPC handshake ever happens.

**Test 3 — sanity: unpinned npx works:**

```
> '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npx -y @bradygaster/squad-cli state-mcp
{"result":{"tools":[ squad_decide, squad_state_read, squad_state_write,
  squad_state_append, squad_state_delete, squad_state_list, squad_state_health ]}, ...}
```

`@latest` (= `0.9.4`) resolves and serves all 7 tools correctly. So the server works fine; the problem is exclusively the **unresolvable version pin** baked into the config by `ensureSquadStateMcpPinned(dest, getPackageVersion())`.

**Verdict:** **CONFIRMED. Theory 2 is the root cause.**

---

## Root cause

`packages/squad-cli/src/cli/core/upgrade.ts:705` — `ensureSquadStateMcpPinned(dest, cliVersion)` unconditionally writes:

```json
{
  "command": "npx",
  "args": ["-y", "@bradygaster/squad-cli@<cliVersion>", "state-mcp"]
}
```

When `<cliVersion>` is a version that is **not published to the npm registry** (which is exactly the case for every locally-built tarball used by the iteration 3 validation runs — `0.9.6-preview.5`, and also for anyone running a self-built squad-cli for local development), npx fails with ETARGET and the MCP server never starts. The MCP host correctly reports the tools as unavailable.

This is **not** a Copilot CLI bug. The committed launch spec is invalid for the local environment.

The iter-3 Gap-2 fix (insert-or-update path) is still correct at the **config-shape** level (the entry is present, syntactically valid, with custom servers preserved). It is broken at the **launch-spec-content** level when the version pin can't be resolved.

---

## Recommended fix

**This is architectural — not a 5-20 line surgical patch — so it is documented for follow-up, not implemented in this iteration** per the prompt's escalation rule.

The launch spec written to `.copilot/mcp-config.json` is committed to source control and shared across machines. It must satisfy two competing constraints:

1. **Portability for collaborators** — other devs on other machines should be able to clone the repo, run `copilot`, and have `squad_state` start. → favours a published version pin.
2. **Local correctness for dev/tarball installs** — the local CLI running `squad init` / `squad upgrade` may be a build whose version doesn't exist on npm. → forbids a literal version pin to the running CLI's `getPackageVersion()`.

### Option A — Validate the pin against npm before writing (recommended)

In `ensureSquadStateMcpPinned`, before writing the pinned spec, check whether `cliVersion` is published. If not, fall back in this order:
1. `@bradygaster/squad-cli@insider` (dist-tag) — gets the latest published insider build, has `state-mcp` command.
2. `@bradygaster/squad-cli@latest` — last resort, may be stale.

Pros: solves the problem for both local-tarball and normal-install scenarios; portable committed config; no machine-specific absolute paths.
Cons: requires one network call to npm during init/upgrade (cacheable, ~200 ms). Need to gracefully handle offline init.

Implementation sketch (~30-40 LOC):

```ts
async function resolvePinnedSpec(cliVersion: string): Promise<string> {
  if (await npmVersionExists('@bradygaster/squad-cli', cliVersion)) {
    return `@bradygaster/squad-cli@${cliVersion}`;
  }
  // unpublished local build — fall back to a published dist-tag
  return `@bradygaster/squad-cli@insider`;
}

async function npmVersionExists(pkg: string, version: string): Promise<boolean> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${pkg}/${version}`,
                            { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch { return false; /* offline → assume exists, don't block init */ }
}
```

### Option B — Always pin to a dist-tag, never to an exact version

Replace the literal version with `@bradygaster/squad-cli@insider` (or `@latest`) unconditionally.

Pros: 3-line change. No network call.
Cons: loses the original Gap-2 intent of pinning to a known-good version. Drift between agents and MCP server possible. Same launch spec gets re-installed on every cold-start (slow). The original `MCP-BRIDGE-BROKEN` problem (stale `latest` lacking the `state-mcp` command) could recur if the `insider` tag ever advances ahead of the user's installed CLI in a breaking way.

### Option C — Prefer locally-installed binary, fall back to npx

If `squad` is resolvable on the user's PATH (which it must be — they just ran `squad upgrade`), write:

```json
{ "command": "squad", "args": ["state-mcp"] }
```

…otherwise the current npx-pin spec.

Pros: bypasses npm registry entirely; matches the version the user actually has installed.
Cons: not portable across machines (other devs cloning the repo may not have `squad` on PATH); on Windows the shell may need `.cmd` suffix depending on MCP host spawn mode; not a single launch spec usable by all collaborators.

### Recommendation

**Option A.** It preserves the Gap-2 contract for normal installs and gracefully degrades for local-tarball / pre-release CLIs. The single network call at init/upgrade time is acceptable. Estimated total change: ~40 LOC in `upgrade.ts` + a new test in `mcp-bridge-pinning.test.ts` mocking npm registry HEAD responses for both published and unpublished versions.

### Where it goes

This is **scoped to PR #1200** (or its successor): the buggy function `ensureSquadStateMcpPinned` lives on the `squad/state-backend-upgrade-fixes` branch, and was introduced as part of the iter-3 Gap-2 work. The fix belongs in the same PR or an immediate follow-up PR on the same branch family.

This is **not** a Copilot CLI bug. No upstream change required.

### Separately: documentation hint

In parallel, `squad init` and `squad upgrade` should print a one-liner if the resulting MCP entry uses a fallback dist-tag rather than the running CLI's version, so the operator knows the pin isn't exact:

> `ℹ Pinned squad_state MCP to @bradygaster/squad-cli@insider (running version 0.9.6-preview.5 is a local build, not on npm).`

---

## Validation re-test plan

After the fix lands and a new twin tarball is built:

1. Recreate dup: `gh repo create tamir-squad-hq-tarball-test-<new-ts> --private` from the live `tamir-squad-hq` snapshot.
2. Install fixed twin tarball into `C:\Users\tamirdresher\squad-validation\.npm-prefix-squadhq2\`.
3. Run `squad upgrade --state-backend two-layer` from the dup. Confirm exit 0.
4. **Verify the new launch spec resolves**: `cat .copilot/mcp-config.json` should show either:
   - `"args": ["-y", "@bradygaster/squad-cli@<published-version>", "state-mcp"]` (if Option A and the version is on npm), OR
   - `"args": ["-y", "@bradygaster/squad-cli@insider", "state-mcp"]` (if Option A fell back to dist-tag for local tarball).
5. Direct npx sanity: `npx -y <pinned-spec> state-mcp <<< '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` → must return 7 tools, no ETARGET.
6. Run the 4 continuity sessions from `TARBALL-FULL-tamir-squad-hq.md` Phase 3.5 verbatim:
   - "what did the team work on most recently?"
   - "Lead, summarize the squad's current focus"
   - "Tester, propose 2 follow-up validation tasks"
   - "Lead, decide which follow-up is highest priority"
7. **Pass criteria**:
   - `git log squad-state --oneline | wc -l` returns **>= 3** (the iter-3 baseline was 2; at least one new state-write commit must appear).
   - Scribe does NOT print the "STATE_BACKEND is two-layer but the `squad_state_*` runtime tools aren't available" halt.
   - Working-tree `.squad/decisions.md` is NOT modified by sessions (pre-commit hook would block it anyway; the success signal is that it doesn't need to).
8. Re-run on at least one of the simpler repos too (e.g., `multiplayer-sudoku`) to confirm the fix is not specific to the worst-case profile.
