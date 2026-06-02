---
updated_at: 2026-06-02T15:52:21+03:00
focus: "PR #3 Round 2 — ConfigureCopilotClient delegate (auth-mode expansion)"
blocked_on: "Finalising invariant contract + Worf's 8 security guards before Data implements"
next_action: "Data implements ConfigureCopilotClient delegate in SquadAgentOptions; Picard + Worf gate the implementation PR"
active_agents: [data, picard, worf]
---

## Current State

PR #3 Round 1 cleanup is landed on `feature/squad-agents-ai` in `tamirdresher/squad` at commit `88424b79`. That commit covers: XML docs on all public types, `cliArgs` end-to-end proof + comment, multi-named connection strings (`AddSquadAgent("research")` reads `ConnectionStrings:squad-research`), public hygiene scrub (no internal `.squad/` references in any public-facing text), and 22 passing tests. B'Elanna added a `.NET CI gate` (`squad-agents-ai-ci.yml`) and a `release pipeline` (`squad-agents-ai-release.yml` — branch-driven, `dev` → prerelease, `main` → stable). Data completed the docs pass: package README, XML docs, root README mention, CHANGELOG, `.csproj` metadata, LICENSE packaging.

Round 2 design is complete. Picard's APPROVE_WITH_CONDITIONS (6 conditions) and Worf's APPROVE_WITH_CONDITIONS (8 security guards) are recorded in decisions.md. The recommended extension point is `Action<CopilotClientOptions> ConfigureCopilotClient` on `SquadAgentOptions` — covers all client-level customisation with zero framework overhead. BYOK (`Provider`, `Model`) deferred to v0.2 (SessionConfig seam).

## Open Threads

- **R2 implementation** (Data): ConfigureCopilotClient delegate + 8 invariant guards from Worf → not started; waiting for any final Tamir clarification on open questions from the proposal.
- **Worf APPROVE_WITH_CONDITIONS guards**: 8 guards enumerated; Data to verify each compiles with implementation.
- **v0.1 publish readiness**: blocked on R2 implementation (NuGet key + `dev` branch creation are maintainer steps post-implementation).
- **Auth-mode open questions for Tamir**: BYOK scope (v0.1 vs v0.2), `ConfigureCopilotClient` naming, type-exposure policy — captured in decisions.md. No answer required before R2 starts.

## Recently Completed

- PR #3 R1 cleanup commit `88424b79` landed (2026-06-02)
- .NET CI gate added by B'Elanna (2026-06-02)
- Release pipeline + Dependabot added by B'Elanna (2026-06-02)
- Docs pass (7 items) completed by Data (2026-06-02)
- Auth expansion proposal written by Data; APPROVE_WITH_CONDITIONS from Picard + Worf (2026-06-02)
- Workstream bootstrapped — squad-agents-ai is now the first active workstream (2026-06-02)
