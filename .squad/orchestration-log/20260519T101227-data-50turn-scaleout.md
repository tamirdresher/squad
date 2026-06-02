# Data — 50-Turn Substitute-Harness Scale-Out

**Date:** 2026-05-19T10:12:27Z  
**Agent:** Data  
**Directive:** Run 50-turn substitute A/B scale-out under Worf conditionally approved gate (2026-05-19T10:12:27Z)

## Status
COMPLETE

## Summary
- Ran 50-turn substitute A/B scale-out (100 total rows)
- Constraint compliance: 1 repo, 2 variants (`no-memory`, `memory`), exactly 50 paired turns
- All R-1–R-5 retained and evidenced; forbidden rejection (2 turns), supersession (2 turns)
- Recall: A/no-memory 50/50 success, 0 recall; B/memory 50/50 success, 9 recall
- Zero failures, timeouts, silence events, hang escalations
- Token proxy: 26,419 tokens; $0 cost
- Artifact root: `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\scaleout-50turn-20260519T101227\`
- Decision merged: `.squad/decisions.md` (2026-05-19T10:12:27Z entry)

## Constraints Satisfied
✅ 1 repo, 2 variants, 50 paired turns  
✅ Byte-identical prompts across A/B  
✅ Forbidden rejection passing both variants  
✅ Supersession forward-link exercised  
✅ Prompt tags: `[ALWAYS]`, `[ON-DEMAND]`, `[ARCHIVE]`, `[NEVER]`  
✅ R-1–R-5 all retained  
✅ `realCopilotCliE2E: false` in all output
