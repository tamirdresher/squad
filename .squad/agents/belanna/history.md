# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Durable Tasks, DTD, distributed systems, Squad/agent orchestration, Azure-hosted AI workflows
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

B'Elanna owns durable/distributed workflow thinking for Squad-related agent systems. Her work should connect Durable Tasks/DTD concepts to AI agents, long-running orchestration, and cloud runtimes.

## Learnings

- Tamir wants this team to work on distributed systems that integrate AI and agents, not only local prompt orchestration.
- Durable workflow designs must cover retries, deduplication, compensation, and restart behavior explicitly.
- ADC execution model requires explicit failure-mode taxonomy. Eight reliability invariants (claim-before-act, terminal states, stale lease TTL, duplicate immunity, ground truth derivation, cancellation respect, idempotent guards, concurrency cap) are non-negotiable. GitHub labels + `.squad/.schedule-state.json` provide sufficient MVP durability for periodic ephemeral model.
- Long-lived continuous loop sandboxes are unsuitable for cloud platforms: unbounded cost, no crash recovery story, violates ADC's ephemeral-by-design philosophy. Periodic ephemeral with bounded latency is more resilient.

