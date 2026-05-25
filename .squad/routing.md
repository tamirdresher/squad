# Work Routing

How to decide who handles what.

## Routing Table

| Work Type | Route To | Examples |
|-----------|----------|----------|
| Product direction, scope, architecture, reviewer gates | Picard | Roadmap decisions, feature decomposition, cross-agent handoffs, proposal review |
| Squad framework and Brady Squad repo expertise | Data | SDK/CLI internals, coordinator behavior, agent prompts, task spawning, templates |
| Durable Tasks, DTD, orchestration, distributed workflow reliability | B'Elanna | Durable orchestrations, sagas, retries, idempotency, state machines |
| Azure platform and cloud runtime | Geordi | ADC, AKS, ACA, Aspire/observability, Azure deployment, container runtime diagnostics |
| Research and cross-repo learning | Seven | Mining `tamresearch1`, `squad`, Clawpilot/m, specs, histories, prior decisions |
| Security, reliability, reviewer rejection | Worf | Secrets, cloud security, threat modeling, CI safety, rejection protocol |
| Blogs, posts, talks, Tamir voice | Troi | Blog drafts, LinkedIn posts, technical storytelling, humor/style matching |
| Session logging and decision merge | Scribe | Automatic after substantial work — never needs routing |
| Work queue and backlog monitoring | Ralph | GitHub issues, PR state, idle-watch, keep-working loop |

## Issue Routing

| Label | Action | Who |
|-------|--------|-----|
| `squad` | Triage: analyze issue, assign `squad:{member}` label | Picard |
| `squad:picard` | Pick up product/architecture/review work | Picard |
| `squad:data` | Pick up Squad framework/runtime work | Data |
| `squad:belanna` | Pick up Durable Tasks/DTD/distributed workflow work | B'Elanna |
| `squad:geordi` | Pick up Azure platform/runtime work | Geordi |
| `squad:seven` | Pick up research/cross-repo discovery work | Seven |
| `squad:worf` | Pick up security/reliability/review work | Worf |
| `squad:troi` | Pick up blog/post/voice-writing work | Troi |

## Rules

1. **Eager by default** — spawn all agents who could usefully start work, including anticipatory downstream work.
2. **Scribe always runs** after substantial work, always as `mode: "background"`. Never blocks.
3. **Quick facts → coordinator answers directly.** Don't spawn an agent for simple status checks.
4. **When two agents could handle it**, pick the one whose domain is the primary concern.
5. **"Team, ..." → fan-out.** Spawn all relevant agents in parallel as `mode: "background"`.
6. **Anticipate downstream work.** If a feature is being built, spawn reviewers/testers/researchers from requirements in parallel when useful.
7. **Issue-labeled work** — when a `squad:{member}` label is applied to an issue, route to that member. Picard handles all `squad` base-label triage.
8. **Content work** — Troi drafts, Worf/Crusher-equivalent safety review is Worf here, and Picard resolves publication tradeoffs.
