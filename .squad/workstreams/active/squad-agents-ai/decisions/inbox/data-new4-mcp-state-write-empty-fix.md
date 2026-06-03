# Decision: Guard Against Undefined Content in squad_state_write/append (NEW-4)

**Date:** 2026-06-03  
**Author:** Data  
**Bug:** NEW-4 (from B'Elanna TWO-LAYER-VALIDATION-ITER9.md)  
**Branch:** `squad/state-backend-upgrade-fixes` (tamirdresher/squad)  
**Commit:** `debd05c4`  
**Status:** IMPLEMENTED AND PUSHED

---

## Problem

`squad_state_write` via MCP tool layer wrote empty content to the orphan branch (blob SHA `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`) while direct `OrphanBranchBackend.write()` worked correctly.

## Root Cause

`parseObject()` in `state-mcp.ts` casts MCP arguments to `Record<string,unknown>` with no runtime type validation. When the MCP payload omits `content`, `args.content === undefined` at runtime. This propagates through `StateBackendStorageAdapter.writeSync()` → `OrphanBranchBackend.write()` → `gitExecWithInput(['hash-object', '-w', '--stdin'], undefined, cwd)`. Node.js `execFileSync` with `input: undefined` sends zero bytes to git stdin → git hashes empty input → empty blob.

## Decision

Add runtime content guards in `stateWrite` and `stateAppend` handlers that check for `null`/`undefined`/non-string `content` and return a structured failure result before reaching the backend. Do NOT coerce to `""` — that would mask the caller error.

```typescript
if ((args as unknown as Record<string, unknown>)['content'] == null ||
    typeof (args as unknown as Record<string, unknown>)['content'] !== 'string') {
  return {
    textResultForLlm: 'Failed to write state: content is required and must be a string',
    resultType: 'failure' as const,
    error: 'content is required',
  };
}
```

## Alternatives Considered

- **Fix `parseObject()` to validate schema**: Would need JSON schema validation injected into the MCP dispatch layer. More invasive; would require changes to `state-mcp.ts`. Better long-term but larger scope.
- **Fix `gitExecWithInput` to guard `undefined`**: Defense-in-depth, but would silently succeed writing empty content on `null`/`""` — not correct behavior.
- **Return failure at adapter layer**: `StateBackendStorageAdapter.writeSync()` could guard, but the error message would be less context-rich for the LLM caller.

## Chosen Approach Rationale

The `stateWrite`/`stateAppend` handlers already own argument validation logic (`normalizeStateToolKey`, `validateMutableStateToolKey`). Adding a content guard at this layer is consistent with the existing pattern, minimally invasive, and produces a clear, LLM-readable error message.

## Files Changed

| File | Change |
|------|--------|
| `packages/squad-sdk/src/tools/index.ts` | +16 lines: content guard in `stateWrite` and `stateAppend` handlers |
| `test/state-backend.test.ts` | +51 lines: 3 regression tests covering undefined-write, valid-write, undefined-append |

## Test Results

- ✅ `squad_state_write with undefined content returns failure, does not write empty blob (NEW-4)`
- ✅ `squad_state_write with valid content writes correct non-empty content (NEW-4)`
- ✅ `squad_state_append with undefined content returns failure, does not corrupt existing content (NEW-4)`
- Pre-existing failures unchanged: `allows only approved runtime state mutation paths`, `replays the failed two-layer flow`
