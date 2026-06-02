# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Durable Tasks, DTD, distributed systems, Squad/agent orchestration, Azure-hosted AI workflows
- **Created:** 2026-05-14T09:22:24.987+05:30

## B'Elanna — Core Mission

B'Elanna owns durable/distributed workflow thinking for Squad-related agent systems. Her work connects Durable Tasks/DTD concepts to AI agents, long-running orchestration, and cloud runtimes.

## Key Learnings (Active)

- **2026-06-02:** Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations
- Durable workflow designs must cover retries, deduplication, compensation, restart behavior explicitly
- Eight reliability invariants (claim-before-act, terminal states, stale lease TTL, duplicate immunity, ground truth derivation, cancellation respect, idempotent guards, concurrency cap) are non-negotiable
- Periodic ephemeral with bounded latency is more resilient than continuous long-lived sandboxes

## Squad.Agents.AI — .NET CI & Build (Most Recent)

PR #3 baseline: targets `net10.0`, Version `0.1.0-preview`, MIT license. Key pins: `Microsoft.Agents.AI.GitHub.Copilot` `1.7.0-preview.260526.1`, `Microsoft.Extensions.AI` `10.6.0`. No central package management yet. XML-doc warnings present but no `TreatWarningsAsErrors` policy. No NuGet audit or package validation gates in CI yet (GitHub workflow targets Node/npm, not dotnet/NuGet).

**See full baseline in history-archive.md**

## 2026-06-02T10:50:37Z — SquadAgentOptions Modification Alert (Auth Expansion)

Data is implementing auth-mode expansion (Decision cleared). Implementation will modify `SquadAgentOptions`. B'Elanna's .NET CI gate on PR #3 will gate compatibility.

---
**Last Updated:** 2026-06-02T10:50:37Z  
**Archive:** `.squad/agents/belanna/history-archive.md` (comprehensive baseline)
