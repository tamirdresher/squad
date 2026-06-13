---
id: belanna-round5-revalidation
author: belanna
role: durable-systems-engineer
date: 2026-06-04
status: proposed
tags: [round-5, revalidation, p0, two-layer, promote-notes, enobufs]
workstream: squad-agents-ai
---

# Decision: Round 5 P0 fixes in scope (A3, B1, B2) are confirmed closed

## Context

Round 4 surfaced three critical issues that landed Round 5 fixes:
- **A3** — `TwoLayerBackend.promoteNotes` had zero production callers (dead code).
- **B1** — `squad notes promote` (or equivalent SDK call) crashed with
  ENOBUFS on commit graphs ≥ 30k commits because `execFileSync` used the
  default 1 MiB stdout buffer.
- **B2** — Scribe-style orphan read (`git show squad-state:.squad/decisions.md`)
  crashed with ENOBUFS once `decisions.md` exceeded ~1 MB, for the same
  reason.

Round 5 commits in `squad/state-backend-upgrade-fixes` (head 98b69ae0):
- abd37ea8 — `GIT_MAX_BUFFER = 256 MiB` applied to all SDK `execFileSync`
  git calls.
- c71ea2c1 — `squad notes promote [--ref X] [--all] [--dry-run]` CLI.
- 7e3e8a4d — `NotesPromoteCapability` registered in Ralph's
  `createDefaultRegistry()`, housekeeping phase, throttled to every 5 rounds.

## Decision

**A3, B1, and B2 are closed in production code paths.** PR #1200 (head
98b69ae0) ships the fixes for all three. No reproduction of the Round-4
failures observed; the new code surfaces are exercised end-to-end and behave
per spec.

## Evidence (full reports in `.squad/files/validation/ROUND-5-REVALIDATION-BELANNA.md`)

- A3 CLI: dry-run + 4 promote scenarios across 2 refs verified;
  promote/archive/skip semantics correct; idempotent on second run.
- A3 Ralph: capability preflight + execute verified at rounds 1, 2, 5;
  throttling and idempotency both correct; phase=`housekeeping`.
- B1: 30001-commit graph promoted in 5.28s, exit 0, no ENOBUFS.
- B2: 2.33 MB orphan `decisions.md` written and read in <1s round-trip,
  content byte-exact, no ENOBUFS.

## Consequences

- Two-layer backend is the supported production state backend going forward.
- Long-running squads should expect `promoteNotes` to run automatically every
  5 Ralph rounds via the new capability — no manual CLI invocation needed.
- The 256 MiB `GIT_MAX_BUFFER` ceiling caps memory at a level above any
  realistic squad payload while still bounding runaway commands.

## Non-goals / not in this decision

- B4 (CAS update-ref) — owned by Worf this round; revalidation pending his report.
- F1 (upgrade leak) — Picard validated; not in my scope.
- A full multi-round `squad watch` loop smoke test — covered by direct
  capability invocation; can be hardened later if value warrants.

## Follow-ups (low priority)

1. Surface `squad notes` in top-level `squad --help` output for discoverability.
2. (Optional) Add an `--archived-once` flag or skip behavior so idempotent
  `archive` operations don't recount the same notes every run. Today it's a
  noop in object storage (same blob hash) but produces noisy `archived=N`
  lines in heartbeat summaries.
