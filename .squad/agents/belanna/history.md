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

## 2026-05-17T09:05:10.003+05:30 — ADC Squad Runner Demo Reliability Invariants Finalized

**Eight Invariants Documented and Approved:**
1. **Claim before act** — Apply `squad:processing` label before work; verify label applied before proceeding
2. **Terminal state is permanent** — `squad:done` label written before sandbox exit; stale-lease sweep re-queues if never set
3. **Stale lease TTL enforced** — Every scan checks for `squad:processing` > 30 min old; unconditionally clear and re-queue
4. **Duplicate events have no effect** — Model B (periodic) ignores event delivery; re-derives ground truth from GitHub per scan
5. **Ground truth from GitHub only** — No in-memory/in-sandbox state trusted across invocations; fresh API query on startup
6. **Cancellation respected** — Before posting writes, re-check issue still open and labeled; exit cleanly if cancelled
7. **Idempotent guards on writes** — Before comment/PR/label, pre-read to detect if already applied; no duplicate writes
8. **Concurrency cap per scan** — Claim max N issues per cycle to bound compute and prevent backlog floods

**State Persistence:** GitHub labels + `.squad/.schedule-state.json` provide sufficient MVP durability for periodic ephemeral model (sandbox suspend/resume cycles).

**Deferred Concerns:** Multi-step orchestration (Plan → Implement → Review → PR) and Durable Functions coordination deferred until workflow complexity exceeds single-stage triage processing.

