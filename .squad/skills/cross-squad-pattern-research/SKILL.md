# Cross-Squad Pattern Research

Use this skill when studying another squad/repo's operating pattern and proposing a local adoption path without polluting local team state.

## Steps

1. **Establish access first.** If the source repo requires a different GitHub identity, switch auth, verify, and record the restore step before reading.
2. **Start with authored process docs.** Read README, top-level docs, and any `.squad/` or equivalent process directories before scanning broadly.
3. **Read concrete examples.** Inspect at least two live instances of the pattern, not just templates.
4. **Separate documented contract from observed conformance.** Note if the template says one thing but live folders only partially follow it.
5. **Compare against local state.** Use local decisions, inbox, identity, routing, and agent histories as evidence for the gap.
6. **Preserve boundaries.** Do not modify the reference repo; avoid copying implementation unless requested.
7. **Restore auth.** Switch back to the original account and verify before writing local artifacts.
8. **Deliver a cited proposal.** Include knowns, unknowns, file/line citations, minimal adoption shape, migration plan, and explicit owner handoff.

## Output checklist

- Reference pattern summary with file/line citations.
- Local comparison table.
- Local buckets/tracks grounded in current decisions and histories.
- Minimal file-system and behavior proposal.
- Open questions requiring owner call.
- Single recommended next spawn if approved.
