# Skill — Atomic JSON Write Checklist

**Owner:** Worf (Security & Reliability Reviewer)
**Created:** 2026-06-02T23:18:09+03:00
**Trigger:** Reviewing or writing any helper that mutates a JSON config file that another process (CLI, daemon, IDE) reads concurrently or trusts to be well-formed.

When a downstream consumer **silently fails closed** on malformed JSON (Copilot CLI 1.0.58 silently drops all workspace MCP servers — Seven §c), a half-written or wrong-rooted JSON file is not a "small bug" — it's a silent feature kill with no diagnostic. Use this checklist for every JSON-write helper.

---

## The 9 questions to ask of any JSON-write helper

### Read-side (input validation)
1. **Does it `JSON.parse` the existing file before overwrite?** If the file is malformed on disk, refuse to overwrite by default (or hide that behavior behind `--force`). Overwriting masks a pre-existing user typo.
2. **Does it validate the parsed root is the expected shape (object, not array/null/scalar)?** `typeof x === 'object' && x !== null && !Array.isArray(x)` — a `null` literal parses fine and will spread-merge silently into garbage.
3. **Does it tolerate / trim empty files?** Empty file should map to "empty config", not a parse error.

### Merge-side (semantics)
4. **Is the equivalence comparator over the right field subset?** Compare runtime-meaningful fields only (e.g. `command`/`args`/`env` for MCP). Don't compare metadata that the consumer rewrites (`source`, `sourcePath`, etc.) — you'll fight noise into conflicts.
5. **On conflict, does it preserve the target and warn, not silently overwrite?** Default to least-surprise. If a `--force` exists, log loudly what was discarded.
6. **Does the test suite cover BOTH branches (equivalent → no-op + conflict → preserve+warn) separately?** A single "merge works" test is not sufficient.

### Write-side (atomicity)
7. **Is the temp file in the SAME directory as the target?** Cross-filesystem renames are not atomic (POSIX EXDEV, Windows MOVEFILE_COPY_ALLOWED degrades). `dirname(target)` is the only safe parent.
8. **Is there cleanup of the temp file on write failure?** Try/finally or try/catch with `unlinkSync(tempPath)` swallowed.
9. **(Power-loss tier) Is `fsync` called between write and rename?** Usually no — CLI tooling tradeoff. Document the choice in the helper's docstring so the next reviewer doesn't relitigate.

### Bonus (caller-side, often missed)
- **Is the call wrapped in try/catch at the call site?** Even an atomic helper throws on EACCES/EROFS. If the helper is called during `init`, an unwrapped exception crashes the whole init.
- **Does the surrounding script gate the success path on the helper's return status, not just absence of throw?** E.g. `if (result.status === 'malformed') warn(...)` — silent statuses are designed; honor them.

---

## Anti-patterns spotted in the wild

- `writeFileSync(target, JSON.stringify(...))` directly to the target path — no atomicity, half-writes possible on any process kill.
- `JSON.parse` without the array/null guard — `parsed.mcpServers ?? {}` happily destructures a parsed `null` and then writes a config-shaped wrapper around nothing.
- "We serialize from a controlled in-memory object so the output is always valid JSON" — strictly true for `JSON.stringify` (it throws on circulars), but adding `JSON.parse(serialized)` as belt-and-braces is one line and costs <1ms. Cheap insurance against future refactors that might pipe untrusted values in.
- Logging server names AND args/env at info level — server names are usually safe; `args`/`env` frequently embed tokens (auth headers, API keys). Log names only at info; gate full bodies behind `--debug`.

---

## Reference implementation

`packages/squad-sdk/src/upgrade/migrate-mcp-config.ts` in `bradygaster/squad` (branch `feat/mcp-json-migration`, commit `3207f075`) is a clean example of points 1–8. Point 9 (fsync) is deliberately omitted with rationale in the docstring. Reviewed and approved by Worf on 2026-06-02.

---

## When NOT to use this checklist

- Read-only config helpers (no write path) — no atomicity story needed.
- One-shot fresh-file writers where the target is guaranteed not to exist (`writeFileSync` with `flag: 'wx'` is sufficient).
- In-memory-only config (test fixtures, `MemoryStorageProvider`). The temp+rename path matters only when `node:fs` is the storage backend.
