# ADC / Squad Runner — Reliability Design
> **Owner:** B'Elanna (Durable Systems Engineer)  
> **Status:** MVP — Periodic Ephemeral Model  
> **Last updated:** 2026-05-17

This document captures the reliability invariants, state-machine, failure modes, and implementation guidance for the ADC Squad periodic ephemeral runner.  
Geordi owns the ADC/Azure implementation; B'Elanna owns everything in this file.

---

## 1. Mental Model: Ground Truth Lives in GitHub

Every invocation of the runner treats GitHub as the single source of truth.  
**No in-sandbox or in-memory state is trusted across restarts.**  
The sandbox may be killed, evicted, or suspended at any moment.  
The only durable stores are:

| Store | What lives there |
|-------|-----------------|
| GitHub issue **labels** | Lease state (`squad:processing`), terminal state (`squad:done`), queue marker (`squad:queued`) |
| GitHub issue **comments** | Agent output (idempotent — check before writing) |
| `.squad/.schedule-state.json` (git-committed) | Last-run timestamps, claim log, scan metadata |

---

## 2. Issue State Machine

```
OPEN (unlabeled)
     │
     │  scan: claim (apply squad:processing + timestamp comment)
     ▼
squad:processing
     │
     │  agent completes successfully
     ├──────────────────────────────► squad:done  (terminal)
     │
     │  agent crashes / TTL expires (>30 min in processing)
     └──────────────────────────────► OPEN (unlabeled)  ← stale-lease sweep re-queues
```

**No issue may leave the processing state without an explicit label transition.**  
If the runner exits without writing `squad:done`, the stale-lease sweep on the next cycle reclaims the issue.

---

## 3. Reliability Invariants (Non-Negotiable)

| ID | Invariant | Mechanism |
|----|-----------|-----------|
| I-1 | **Claim before act** | Apply `squad:processing` label + timestamp comment *before* spawning agent; verify label applied via re-read |
| I-2 | **Terminal state is permanent** | Write `squad:done` label *before* sandbox exits or state is persisted |
| I-3 | **Stale lease TTL enforced** | Every scan startup: find issues with `squad:processing` older than **30 min**; remove label, re-queue unconditionally |
| I-4 | **Duplicate scans have no effect** | Re-derive issue list fresh from GitHub per scan; periodic model ignores event delivery entirely |
| I-5 | **No cross-invocation in-memory state** | Fresh GitHub API query on every sandbox resume; `.schedule-state.json` is metadata-only |
| I-6 | **Cancellation check before writes** | Before posting comment/label/PR: re-check issue is still open and still labeled `squad:processing`; abort cleanly if not |
| I-7 | **Idempotent writes** | Before writing any comment/label, pre-read to detect duplicate; skip if already present |
| I-8 | **Concurrency cap per scan** | Claim at most **N=3** issues per cycle (configurable); prevents backlog floods and cost blowout |

---

## 4. Lease Protocol (Step-by-Step)

### 4.1 Claim Phase
```
1. Query GitHub: issues with label 'squad:queued' OR (open, no squad:* labels)
2. Enforce I-8: slice to first N
3. FOR EACH issue:
   a. POST label 'squad:processing'           ← must succeed before proceeding
   b. POST comment: "🔒 [squad] Claimed at <ISO-8601 UTC> by run <run-id>"
   c. Re-read issue labels to verify 'squad:processing' is present
   d. If label absent (race lost): skip issue, continue
```

### 4.2 Execution Phase
```
4. Invoke agent with issue payload written to a temp FILE (never interpolated into shell)
5. Enforce execution timeout: kill after 30 min (I-G5 from Worf)
6. On agent output: apply I-7 — check before posting any comment or PR
7. Before final write: apply I-6 — re-check issue state
```

### 4.3 Completion Phase
```
8. POST label 'squad:done'
9. Remove label 'squad:processing'
10. Update '.squad/.schedule-state.json':
    { "lastRun": "<ISO-8601>", "claimed": [<issue-numbers>], "runId": "<uuid>" }
11. git add / git commit -m "chore: squad scan <runId>" / git push
```

### 4.4 Stale Lease Sweep (runs at startup, before claim phase)
```
0. Query: issues with label 'squad:processing'
0a. For each: parse timestamp from claim comment
0b. If age > 30 min:
    - Remove 'squad:processing'
    - POST comment: "⚠️ [squad] Stale lease cleared at <now>. Re-queuing."
    - Optionally apply 'squad:queued' for explicit re-queue
```

---

## 5. Retry & Timeout Behaviour

| Scenario | Behaviour |
|----------|-----------|
| GitHub API transient failure (5xx / timeout) | Retry up to **3×** with exponential backoff: 2s, 4s, 8s |
| Label POST succeeds but re-read verification fails | Treat as race lost; do not retry claim; log and skip |
| Agent exits non-zero | Write comment with error summary; do NOT apply `squad:done`; let TTL sweep re-queue |
| Agent exceeds 30 min wall-clock | Kill process (SIGKILL); do NOT apply `squad:done`; TTL sweep handles re-queue |
| `git push` fails (diverged branch) | `git pull --rebase` once, retry push once; if still failing, log error, sandbox still suspends cleanly |
| Sandbox suspended mid-execution | Next cycle's stale-lease sweep sees >30 min `squad:processing`; re-queues |

---

## 6. Duplicate-Run Handling

The periodic model is **inherently idempotent** at the scan level because:

- Ground truth is re-derived from GitHub on every scan (I-5).
- A second concurrent scan that sees `squad:processing` will skip those issues (verification step in §4.1.c).
- GitHub label operations are atomic at the API level (last writer wins); the re-read verification catches races.

**Edge case — two concurrent scans both claim the same issue:**  
Both post `squad:processing`. GitHub does not deduplicate. The verification re-read (step 3c) catches this *most* of the time; in the worst case both proceed. Mitigation:
- Set `N=3` (I-8) to minimize overlap window.
- Use `run-id` in claim comments to detect double-claim; add a second 5s sleep + re-read if needed.
- Future: advisory lock via a dedicated GitHub issue comment "lock record" (optimistic concurrency).

---

## 7. State File Schema (`.squad/.schedule-state.json`)

```jsonc
{
  "schemaVersion": 1,
  "lastRun": "2026-05-17T09:00:00Z",       // ISO-8601 UTC
  "runId": "a1b2c3d4",                       // UUID, unique per scan
  "claimed": [42, 43],                       // issue numbers claimed this scan
  "completed": [42],                         // issue numbers where squad:done applied
  "staleLeasesCleared": [38],               // issue numbers where stale lease was cleared
  "scanDurationMs": 47200,
  "errors": []                               // structured error list if partial failure
}
```

**Rules:**
- Committed to git after every scan (commit message: `chore: squad scan <runId>`).
- Never trusted as source of truth for issue state; GitHub labels are authoritative.
- Used for telemetry, audit, and detecting back-to-back crash loops.

---

## 8. Security Guardrails (Worf-Mandated, Pre-MVP)

| ID | Guardrail | Implementation |
|----|-----------|----------------|
| G1 | No secret interpolation | Issue payloads written to files; paths passed to agent, never `${}` into shell |
| G2 | Idempotency enforced at write sites | §4.1c verification + §4.2 I-7 pre-read |
| G3 | Secrets from Key Vault only | No hardcoded tokens; `az keyvault secret show` or GitHub Actions secrets |
| G4 | Sandbox TTL | Auto-suspend policy: `enabled: true, idleTimeout: 30 min` on every sandbox |
| G5 | Execution timeout | Hard kill at 30 min; ADC auto-suspend as secondary safety net |

---

## 9. What the Demo Repo Must Demonstrate

The `adc-squad-runner-demo` implementation (owned by Geordi) must exercise all of the following to be considered complete:

- [ ] Stale lease sweep runs before claim phase (I-3)
- [ ] Claim includes timestamp comment and re-read verification (I-1)
- [ ] Agent invoked with payload as file, not inline env var (G1)
- [ ] `squad:done` written before sandbox suspension (I-2)
- [ ] `N=3` concurrency cap enforced (I-8)
- [ ] State file committed to git after each scan (§7)
- [ ] Exponential backoff on GitHub API failures (§5)
- [ ] Execution timeout kills agent at 30 min (G5)

---

## 10. Minimum README Invariants

The demo repo README must assert these explicitly:

> **Reliability properties this runner provides:**
> 1. Every claimed issue either reaches `squad:done` or is re-queued by the next scan. There is no silent loss.
> 2. No issue is processed twice concurrently (best-effort via label verification; see docs/reliability.md §6 for edge cases).
> 3. No agent output is posted twice (pre-read idempotency check before every write).
> 4. A crashed or suspended sandbox leaves the system in a recoverable state within one scan interval (max 15–60 min).
> 5. Issue payload never touches a shell interpolation site.

---

## References

- `.squad/decisions.md` — `2026-05-17T08:40:44` ADC-Squad Execution Model decision (full stakeholder sign-off)
- Worf security guardrails G1–G5 (embedded in that decision)
- Geordi: ADC API surface (`adc-api.js`, sandbox resume/suspend/execShell)
- Data: Squad SDK `LocalPollingProvider`, `schedule.json`, `CronTrigger`
