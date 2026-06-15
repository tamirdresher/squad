# Data — Agent History

**Last Updated:** 2026-06-09 06:16:01Z

**Archive:** See \history-archive.md\ for all prior rounds. See \history-summary.md\ for consolidated learnings.

---


## Round - 2026-06-15T18:22:41+03:00 - CI Investigation: bradygaster/squad Repo [ws:squad-agents-ai]

### Investigation Scope
Analyzed CI health of upstream bradygaster/squad repo following 4 consecutive workflow failures on dependabot PRs (all same-root-cause).

### Learnings

- **Dependabot PRs as regression detectors**: Dependabot dependency-update PRs are excellent natural test harnesses for detecting silent base-branch (dev/main) regressions. They run full CI/CD without introducing any new code, so any failure is inherited from the base branch. The 4 consecutive identical failures (all in docs-build.test.ts) were NOT caused by the dependency changes themselves — they revealed a pre-existing broken docs file on dev.
- **Documentation as CI bottleneck**: In bradygaster/squad, the docs validation layer (`test/docs-build.test.ts`) is the primary failure vector for currently-blocked merges, not SDK tests or build failures. Two specific checks fail: (1) markdown fence count parity validation (must be even; skill-security-scanner.md has 1 unclosed fence), (2) code block content validation (requires >1 line; skill-security-scanner.md has empty blocks). Fixing one malformed docs file unblocks all 4 dependent PRs.
- **Markdown validation as gates**: Squad's docs validation is strict: every .md file in the repo must have properly paired code fences (``` counts) and non-empty code blocks. This is enforced at test-suite level before any dependency updates can merge. When reviewing docs file changes or skills documentation, always verify fence count is even and code blocks are populated. Single-fence errors silently propagate to all dependent PRs.
- **Deterministic vs. flaky failures**: The 4 failures show 100% replication (no timeout, no intermittent passes on rerun). This is not a flaky environmental issue. Flaky CI typically shows 60–90% failure rate on rerun; deterministic failures are always-fail. For future bradygaster/squad investigations, prioritize deterministic failures (fix immediately; blocks merges) over sporadic ones (usually environmental/infrastructure).
- **Policy gates as safeguards**: Even when test suite fails, the separate Policy Gates job (changelog validation, prerelease version checks, npm publish scope enforcement) continues to pass. These gates are effective at catching non-code violations and don't cascade into false positives from unrelated test failures — good pattern to preserve.
- **CI inheritance chain**: Dependabot PR tests inherit all base-branch files (including .md docs), so a single broken skill documentation file on dev blocks all downstream PRs. When unblocking a stalled PR queue, always check if root cause is base-branch-only (not PR-specific). This reduces time-to-fix significantly (trivial file edit vs. debugging PR logic).

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
**CROSS-AGENT NOTE (2026-06-15, Scribe):** File-path error in CI investigation — initially claimed docs/skills/skill-security-scanner.md; actual path is docs/src/content/docs/features/skill-security-scanner.md (verified by coordinator). LESSON: Double-check file paths before reporting findings; use ind or ls -r to verify existence before committing to investigation.
