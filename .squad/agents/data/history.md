# Data — Agent History

**Last Updated:** 2026-06-09 06:16:01Z

**Archive:** See \history-archive.md\ for all prior rounds. See \history-summary.md\ for consolidated learnings.

---


## Round - 2026-06-09T10:03:36+03:00 - PR #1148 Review (reasoningEffort threading)

### Learnings

- **Squad resolveModel pattern (config/models.ts:1057)** has 5 explicit layers: 0a per-agent persistent -> 0b global persistent -> 1 session directive -> 2 charter -> 3 task-aware -> 4 default. New `resolveReasoningEffort` mirrors this with 4 active layers (no task-aware) + undefined default. When reviewing new config-resolution code, always diff against this canonical shape.
- **Two `resolveModel` functions exist**: one in `config/models.ts` (the new 5-layer resolver) and one in `agents/model-selector.ts` (the older one). `AgentLifecycleManager` uses the model-selector version and therefore does NOT consult `.squad/config.json` model layers in the lifecycle spawn path. Reasoning-effort wiring inherits the same gap — Layer 0a/0b only apply when callers explicitly call the new resolver. When auditing config-layer claims, trace from the resolver back to actual call sites; do not assume documented layers reach production.
- **Charter `## Model` section parsing** uses regex `\*\*Reasoning Effort:\*\*\s*(.+)` with `.toLowerCase()` and a Set lookup against `VALID_REASONING_EFFORTS`. `auto` is a sentinel meaning "not set" — handled in 3 places (parser, compileCharterFull override gate, resolveReasoningEffort isValid). Future field additions should follow the same trio of normalization sites.
- **Type duplication smell**: same string union (`low|medium|high|xhigh`) now lives in three places — `SquadReasoningEffort` (adapter/types.ts:751), `ValidReasoningEffort` (config/models.ts), and inlined in `builders/types.ts`. The PR didn't consolidate. Watch for this on future enum additions.
- **clampReasoningEffort edge case**: when requested effort is BELOW model's supported minimum, it clamps UP, not returning undefined. This can silently raise cost when a user picks `low` on a model that only supports `high`. Useful to remember when reviewing other capability-clamping code.
- **`FanOutDependencies` backwards-compat pattern**: making the new resolver function optional and falling back to a simpler inline `override || charter.field` is the established way to add new resolution layers without breaking existing fan-out callers.
- **Template propagation**: same 27-line block lives in 5 squad.agent.md.template copies. This duplication is pre-existing, not introduced by this PR — but it means any agent-charter convention change is a 5-file edit. Worth a future cleanup.
