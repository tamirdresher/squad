# Worf Security & Reliability Review — Stale Lease Cleanup & Requeue

**By:** Worf  
**Date:** 2026-05-18T12:08:34.040+03:00  
**Status:** Mandatory guardrails — G20–G26  
**Requested by:** Tamir Dresher  
**Supersedes:** Nothing. Extends G13–G19 (worf-adc-runner-v2-directive-review.md).  
**Question answered:** Can a sandbox dying before completion create an orphan issue? What must be true before a stuck `squad:processing` issue is requeued?

---

## The Failure Scenario

An ADC sandbox is assigned to issue #N. It claims `squad:processing`, writes a lease, begins executing. Before it completes (or before it posts a PR), the sandbox crashes, is preempted, or the Azure Function instance is recycled. The lease expires. The next scan cycle finds a `squad:processing` issue whose lease TTL has elapsed.

**Answer to "does this create orphan issues?":** Yes, without the guardrails below. Orphaning occurs when the label is cleared but no new claim is written, or when a new sandbox starts work on a branch that already has partial commits from the crashed sandbox.

---

## Required Pre-Conditions for Requeue (All Must Be True)

Before a stuck `squad:processing` issue is cleared and returned to the work queue, ALL of the following must hold:

| # | Condition | Rationale |
|---|-----------|-----------|
| **P1** | `expires_at < now()` in `.squad/.lease-store.json` for this issue's lease entry | TTL is 10 minutes (not 30 — per G13 for 5-min cycles). Unexpired lease = sandbox is still running. Do not interrupt it. |
| **P2** | No PR is open for the issue's branch (`squad/issue-<N>`) | If a PR exists, the sandbox completed its work before crashing. The correct recovery is `phase → pr_open`, NOT requeue. Requeue would discard finished work. |
| **P3** | The sandbox recorded in the lease (`sandbox_id`) is confirmed stopped or non-responsive via ADC SDK | Clearing the lease while the original sandbox is still executing means two sandboxes will write to the same branch. This is a data-corruption vector. |
| **P4** | The updated lease-store (with the stale entry removed) is committed and pushed to git BEFORE the `squad:processing` label is removed from GitHub | Git history is the audit log. If the Function crashes between lease-delete and label-remove, the next scan sees an expired lease for an issue that has no label — it knows to check git history. The reverse ordering loses the audit trail. |
| **P5** | `attempt` counter in the expiring lease is read and incremented in the replacement lease | Tracks how many times this issue has been recovered. Required for G25 (stuck-issue escalation). |

---

## Required Labels, Comments, and Audit Trail on Recovery

Every stale-lease recovery event MUST produce the following artifacts before the issue is returned to the queue:

### Labels (ordered operations)

1. **Do NOT remove `squad:processing` first.** Write the lease-store commit first (P4).
2. Remove `squad:processing` label.
3. If `attempt < 3`: re-apply `squad:agent:<name>` label (restores issue to TRIAGED state for re-pickup).
4. If `attempt >= 3`: apply `squad:stuck` label instead of `squad:agent:<name>`. Do NOT return to queue. Escalate per G25.

### GitHub Comment (mandatory)

Post a comment on the issue at the moment of lease expiry sweep:

```
🔁 **Squad Recovery** — Sandbox lease expired

- **Sandbox:** `<sandbox_id>`
- **Phase at expiry:** `<claimed | working>`
- **Lease claimed at:** `<ISO-8601>`
- **Lease expired at:** `<ISO-8601>`
- **Attempt:** <N> of 3
- **Branch state:** <"no commits beyond main" | "partial commits present — new sandbox will continue from branch tip">
- **Action:** <"Issue returned to queue for reassignment" | "Escalated: squad:stuck applied, human review required">
```

This comment is non-optional. It creates the human-readable audit trail independent of git log and GitHub label history.

### Git Audit Trail

The lease-store commit message for a recovery event must include:

```
chore(lease): recover issue #<N> — stale lease expired [attempt <N>]

Sandbox <id> lease expired at <ISO-8601>.
Phase at expiry: <phase>.
PR found: <yes|no>.
Action: <requeue|pr_open|escalate>.
```

---

## Preventing Duplicate Destructive Work After Recovery

### G20 — Verify sandbox is stopped before requeue (new)

The stale-lease sweep MUST call `ADC SDK: getSandboxStatus(sandboxId)` before clearing the lease. If the sandbox status is anything other than `stopped`, `crashed`, or `unknown` (i.e., it is `running` or `suspended`), do NOT clear the lease. Log a warning, extend the TTL by one cycle (5 minutes), and check again next scan. A "slow" sandbox must be given one grace extension before being considered stale.

This prevents the race where: sandbox is slow but alive → sweep declares it dead → second sandbox is assigned → two sandboxes push to `squad/issue-<N>` branch → force-push conflict or silent overwrite.

### G21 — Branch state inspection before requeue (new)

Before assigning a new sandbox to a recovered issue, inspect the `squad/issue-<N>` branch via GitHub API (`GET /repos/{owner}/{repo}/git/refs/heads/squad/issue-{N}`):

- **Branch does not exist:** New sandbox starts fresh. Safe.
- **Branch exists with commits not in `main`:** New sandbox MUST be instructed (via payload.json) to continue from the branch tip, NOT reset to `main`. The payload must include `"resumeBranch": true` and `"branchRef": "squad/issue-<N>"`. Starting fresh from `main` silently discards the partial work of the crashed sandbox.
- **Branch exists but is already in a merged PR:** This should have been caught by P2. If reached here, something is wrong — abort requeue, post comment, apply `squad:stuck`.

### G22 — No-requeue if `squad:done` is present (new)

Before any requeue operation, verify `squad:done` is NOT present on the issue. `squad:done` is terminal (B'Elanna label taxonomy). A `squad:done` issue with an expired lease is a sweep bug — it must be logged and the lease entry deleted without any label changes or requeue.

### G23 — Self-merge prevention after recovery (extends G18)

After a recovery, the new sandbox that eventually opens a PR MUST NOT merge that PR. This is already prohibited by G18. The additional requirement specific to recovery: the PR description MUST include the recovery history:

```
⚠️ This PR was created after sandbox recovery (attempt <N>). Original sandbox <id> did not complete.
```

This signals reviewers that the work may be partial or restarted, so they apply appropriate review scrutiny.

### G24 — Idempotent label removal (defensive)

The `squad:processing` label removal in the sweep must be wrapped in a try/catch that treats "label not found" (HTTP 404/422) as success, not failure. If the label was already removed by a prior sweep (Function at-least-once delivery), re-attempting the removal must not halt the sweep or produce a duplicate comment.

Similarly: if a comment with the exact recovery text (matching sandbox_id + claimed_at) already exists on the issue, skip posting the comment. Check last N comments before posting. Prevents duplicate audit spam on double-sweep.

### G25 — Stuck-issue escalation after 3 attempts (extends G19)

If `attempt >= 3` for any issue:
1. Apply `squad:stuck` label (new label — must be added to label taxonomy).
2. Do NOT re-apply `squad:agent:<name>`. Do NOT return to work queue.
3. Post comment tagging Picard (or the routing-rules-designated escalation contact): "Issue #N has failed recovery 3 times. Human review required before re-queuing."
4. Remove the lease entry from the lease-store.
5. The issue stays with `squad:processing` removed, `squad:stuck` applied, waiting for a human to manually clear `squad:stuck` and re-apply `squad:agent:<name>` to restart the cycle.

**Why 3 attempts?** Transient sandbox crashes are recoverable once or twice. Three consecutive failures indicate a structural problem with the issue (bad payload, infra failure, impossible task) that requires human judgment, not another automated retry.

### G26 — Requeue ordering is non-negotiable (new)

The exact sequence for stale-lease recovery is:

```
1. Check P1–P5 (all must pass)
2. Verify sandbox stopped (G20)
3. Inspect branch state (G21)
4. Increment attempt counter
5. IF attempt >= 3: GOTO escalation path (G25)
6. Build recovery payload (include resumeBranch if applicable)
7. Write updated lease-store (remove old entry, do NOT yet add new entry)
8. git commit && git push (P4 ordering guarantee)
9. Remove squad:processing label from GitHub
10. Post recovery comment on GitHub issue
11. Re-apply squad:agent:<name> label (issue returns to TRIAGED)
12. On next scan cycle: new sandbox will pick up from TRIAGED state normally
```

Steps 8 → 9 → 10 → 11 are strictly ordered. Any step that fails halts the sequence. The Function does not attempt to skip ahead. If step 8 fails (git push conflict), the sweep aborts for this issue and retries next cycle. If step 9 fails, the lease is already cleaned in git but the label remains — this is safe: the issue stays `squad:processing` and the next TTL check will find no lease entry and attempt recovery again.

---

## Label Taxonomy Addition

Add the following label to the Squad label taxonomy (B'Elanna's table, and `sync-squad-labels.yml`):

| Label | Meaning | Terminal? |
|-------|---------|-----------|
| `squad:stuck` | Issue failed automated recovery 3 times; human review required before re-queuing | **Yes (until manually cleared)** |

---

## Summary Verdict

| Scenario | Safe? | Required Action |
|----------|-------|-----------------|
| Sandbox dies, no PR, `attempt < 3` | ✅ Safe to requeue | G20–G26 full sequence |
| Sandbox dies, PR exists | ✅ Transition to `pr_open`, not requeue | P2 check |
| Sandbox dies, `attempt >= 3` | ⚠️ Escalate, do not requeue | G25 |
| Sandbox still running but slow | ⚠️ Extend TTL one grace cycle | G20 |
| `squad:done` present with expired lease | 🐛 Sweep bug | Delete lease, no label changes, log |
| Two sandboxes claim same issue | ❌ Must not occur | G13 (existing) + G20 |
| Recovery without branch inspection | ❌ Must not occur | G21 |
| Recovery without audit comment | ❌ Must not occur | Audit trail requirement |

---

*Worf has spoken. G20–G26 are non-negotiable. A sandbox dying before completion is recoverable — but only if the recovery sequence is executed in the exact order specified. Skipping branch inspection (G21) or sandbox-stopped verification (G20) converts a recoverable crash into a data-corruption event.*
