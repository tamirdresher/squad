---
id: squad-agents-ai
name: Squad.Agents.AI NuGet
status: active
created: 2026-06-02
owner: Tamir Dresher
agents: [picard, data, worf, belanna, seven, scribe]
reviewers: [picard, worf]
scope: Squad.Agents.AI NuGet package — DI helpers, auth modes, SDK extensibility, release pipeline
related:
  - squad-cli-state-backend
public_surface: tamirdresher/squad (PR #3, feature/squad-agents-ai)
---

# Squad.Agents.AI Workstream

**Squad.Agents.AI** (`Squad.Agents.AI`, `v0.1.0-preview`) is a community NuGet package that wraps the GitHub Copilot SDK to make it easy to host a `SquadAgent` in a .NET application via dependency injection. It targets `net10.0`, ships four public types (`SquadAgent`, `SquadAgentOptions`, `SquadConnectionFactory`, `SquadServiceCollectionExtensions`), and is published from `tamirdresher/squad`. The package inherits strategic lineage from the tamresearch1 squad (Decision 443 pivot from MAF first-party to community NuGet) and PR #3 (`feature/squad-agents-ai`) is the authoritative source artifact. Security baseline is clear (Worf B1–B6 PASS). No blockers to v0.1 tag and publish.

**Current state (2026-06-02):** PR #3 Round 1 cleanup landed (`88424b79`) — XML docs, `cliArgs` fix, multi-named connections, public hygiene scrub. Round 2 (auth-mode expansion via `ConfigureCopilotClient` delegate) is in design, with Picard's APPROVE_WITH_CONDITIONS (6 conditions) recorded and Worf's APPROVE_WITH_CONDITIONS (8 guards) recorded. The seam boundary is: v0.1 = `CopilotClientOptions` layer, v0.2 = `SessionConfig` layer. CI (.NET gate, release pipeline, Dependabot) added by B'Elanna. Docs pass complete (Data). Next: Data implements Round 2 once invariant contract and security guards are finalised.
