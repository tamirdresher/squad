# Skill: Reviewing Squad SDK Config-Layering PRs

When reviewing a PR that adds a new per-agent configuration field (model, reasoning effort, tools, budget, etc.) and threads it through the spawning pipeline, run this checklist.

## Why this skill exists

Squad's config resolution has a documented N-layer hierarchy (per-agent persistent → global persistent → session/spawn override → charter → default). New fields are expected to follow the same shape as `resolveModel` (`packages/squad-sdk/src/config/models.ts`). Several pieces have to line up — resolver, charter parser, builder validator, lifecycle wiring, fan-out wiring, session-config field, and tests — and PRs frequently get one or two of them subtly wrong.

## Checklist

### 1. Resolver parity
- [ ] Compare the new `resolve{Field}()` against `resolveModel()` in `packages/squad-sdk/src/config/models.ts`.
- [ ] Same layer order? Same handling of `null`/`undefined`/sentinel values (`auto`)?
- [ ] Same `StorageProvider` injection seam for tests?

### 2. Charter parser
- [ ] Regex tolerates: missing field, invalid value, mixed case, leading/trailing whitespace, sentinel `auto`.
- [ ] Normalization (toLowerCase + Set lookup) matches `VALID_*` array.
- [ ] Has tests for each of: present, missing, invalid, sentinel.

### 3. Builder validation (`packages/squad-sdk/src/builders/index.ts`)
- [ ] `defineAgent` and `defineDefaults` both validate the new field.
- [ ] Uses `assertStringUnion` (or equivalent) against the canonical `VALID_*` constant — not an inline duplicate.

### 4. Lifecycle wiring (`packages/squad-sdk/src/agents/lifecycle.ts`)
- [ ] **Critical gap to check**: does `spawnAgent` actually call the new resolver, or only honor Layer 1+2?
- [ ] If the resolver is bypassed here, persistent config layers (0a/0b) silently don't apply in this spawn path. Flag it. (Note: this gap already exists for `resolveModel` — confirm whether the PR perpetuates it intentionally.)
- [ ] Field reaches `SquadSessionConfig` via spread (`...(value ? { field: value } : {})`) so undefined doesn't pollute the request.

### 5. Fan-out wiring (`packages/squad-sdk/src/coordinator/fan-out.ts`)
- [ ] New resolver dep added to `FanOutDependencies` as **optional** (backwards compat).
- [ ] Fallback path when caller doesn't supply the dep: usually `override || charter.field || undefined`.
- [ ] Validation re-applied at the spawn site (defense in depth).

### 6. Type discipline
- [ ] Single canonical union (e.g. `SquadReasoningEffort` in `adapter/types.ts`).
- [ ] No duplicate inline `'a' | 'b' | 'c'` unions in `builders/types.ts` or elsewhere.
- [ ] `schema.ts` types narrowed to the union (not bare `string`) where possible.

### 7. Clamping / capability checks
- [ ] If the field is clamped against model capability, confirm behavior at both extremes:
  - Requested ABOVE max → caps DOWN (expected)
  - Requested BELOW min → does it clamp UP, or return undefined? Either is defensible; document which.
- [ ] Unknown model / empty capability array → returns undefined.

### 8. SDK session-config field
- [ ] The new field exists in `SquadSessionConfig` (`packages/squad-sdk/src/adapter/types.ts`).
- [ ] Confirm it actually reaches the underlying Copilot SDK request (grep the adapter).

### 9. Test coverage signal
- [ ] Tests exist for: each layer wins over the layer below it, invalid input falls through, sentinel acts as not-set, clamping edge cases, round-trip persistence.
- [ ] Bonus: fan-out test asserts the field appears in the `createSession` call args.

### 10. Templates
- [ ] If a new charter field is introduced, check ALL `squad.agent.md.template` copies (currently 5: `.github/agents/`, `.squad-templates/`, `packages/squad-cli/templates/`, `packages/squad-sdk/templates/`, root `templates/`).
- [ ] Same 1-line addition repeated everywhere = copy-paste smell but expected given existing repo structure.

## Anti-patterns to flag

- **Resolver exists but spawn paths don't call it.** Means documented hierarchy is fiction.
- **`auto` sentinel handled in only some of the three sites** (parser / compileCharterFull / resolver). Causes "auto" to leak into session config.
- **Duplicated string unions across modules** instead of importing the canonical type.
- **Bare `string` in `schema.ts`** for fields that should be enums.
- **Validation only at one boundary** (e.g. builder validates but parser doesn't, or vice versa).

## Reference PR

PR bradygaster/squad #1148 — `feat(sdk): thread reasoningEffort through agent spawning pipeline`. Mirrors the model-resolution pattern; demonstrates both the canonical structure and the lifecycle-wiring gap noted above.
