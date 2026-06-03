# SKILL: Migration Blast-Radius Audit

**Owner:** Data (Squad Framework Expert)
**Created:** 2026-06-02T22:22:40+03:00
**When to use:** Any time an upstream contract changes (path, flag name, env var, MCP schema, API signature) and you need to scope the migration before implementation. The pattern: enumerate every reference, classify by type, estimate effort, recommend rollout strategy, surface Policy Gates.

## Inputs you need

1. **The old contract value(s)** — e.g., `.copilot/mcp-config.json`, `--additional-mcp-config`.
2. **The new contract value** (or "TBD — needs Seven to verify").
3. **All repos in scope** — usually both this repo (`squad-squad`) AND any upstream framework repo (`squad`).
4. **Repo memory hits** for Policy Gates affecting touched files.

## Procedure

### Step 1 — Inventory with grep across all repos in scope

```
# In parallel, grep each repo for old contract + variants:
grep -n "<old_value>|<variant1>|<variant2>" -r <repo_root>
```

Capture file path + line number for every hit. If output exceeds 50 KB, save to a temp file and post-process with PowerShell `Where-Object` to exclude `*-archive.md`, `files/validation/**`, `files/research/**`, `decisions/archive/**`, `agents/*/history-archive.md`.

### Step 2 — Classify each hit into exactly one bucket

| Bucket | Definition | Action |
|---|---|---|
| **CODE** | Source file that executes the contract (read/write/spawn) | Must change |
| **TEMPLATE** | File installed into user repos by `squad init`/`squad upgrade` | Must change; check for mirror copies (squad has 3–4 mirror dirs) |
| **DOC (live)** | README, skill, docs site page describing the contract to users | Should change |
| **DOC (historical)** | `decisions.md`, `decisions-archive.md`, `history-archive.md`, `files/validation/**` | **DO NOT TOUCH** — append-only |
| **TEST** | Fixture or assertion referencing the old contract | Must change (or supplement with additive new-path tests during deprecation window) |
| **OUT-OF-SCOPE** | External system contract (e.g., ADC sandbox file paths, third-party tool config) | DO NOT TOUCH; file separate tracking issue |

### Step 3 — Build the audit table

Columns: `# | File | Repo | Type | Line(s) | Current usage | Migration action`. One row per file (collapse multi-line refs into one row with all line numbers in the Line(s) column). Include subtotals by repo and by type.

### Step 4 — Estimate effort per repo

- **SMALL:** < 1 day, no breaking change.
- **MEDIUM:** refactor + tests, no breaking change.
- **LARGE:** template format change + user upgrade story + migration helper.

Justify each estimate in one line.

### Step 5 — Identify breaking-change risks

Table with columns: `Risk | Likelihood (LOW/MED/HIGH) | Mitigation`. Always include:
- Pre-existing user files with custom content (preserve via merge, never overwrite).
- Cross-version interop (does the framework still need to work for users on the old contract?).
- Critical-path state (e.g., `squad_state` MCP pin) — flag for Worf safety review.

### Step 6 — Recommend rollout strategy

Pick ONE of:
- **Rip and replace** — only if zero deployed users on the old contract.
- **Additive (support both) for one release** — default; safe.
- **Deprecate and warn** — when noisy warnings are acceptable AND auto-migration is impossible.

State why the other two are rejected.

### Step 7 — Policy Gates

Check repo memory for any file you're touching. Common ones in this codebase:
- `packages/squad-cli/src/cli/core/templates.ts` → requires `.changeset/{slug}.md` entry.
- Any template content change → recommend a changeset even if not strictly gated.

Distinguish: "Policy Gate triggered" (you MUST add the changeset) vs "changeset recommended" (good practice but not gated).

### Step 8 — Open questions

Surface anything you need from Lead (Picard), Historian (Seven), or Safety (Worf) BEFORE implementation. Don't guess; ask.

### Step 9 — Stale-session concern (Data-specific)

If governance files (`.squad/decisions.md`, charters, rosters) reference the old contract in append-only history, call it out. In-flight agents reading older sections may keep writing to the old contract until they see the new decision. Confirm the rollout strategy handles that gracefully.

## Output format

A single `.squad/decisions/inbox/{agent-slug}-{topic}.md` file containing all 9 sections. Plain text, no fluff. Reference exact file paths + line numbers throughout.

## Anti-patterns to avoid

- ❌ Rewriting `.squad/decisions.md` historical entries — they're append-only.
- ❌ Touching `.squad/skills/agentdevcompute/**` for Copilot-CLI changes — that's a separate ADC contract.
- ❌ Assuming a planned-but-unshipped fix exists. Always verify with `Get-ChildItem` / `Test-Path` before counting it in the blast radius. (Lesson learned: the "10 spawn sites" `copilot-invocation.ts` was a plan in COMBINED-FIX-BRANCH-MANIFEST, never landed.)
- ❌ Triggering Policy Gates you don't need to trigger — read the actual diff, not the file's neighborhood.
- ❌ Implementing the migration in the same spawn as the audit. Audit-only.

## Example

See `.squad/decisions/inbox/data-mcp-config-migration-audit.md` (this skill's first use, 2026-06-02).
