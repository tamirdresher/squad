# Data — Multi-Repo Substitute-Harness Scale-Out

**Date:** 2026-05-19T10:12:27Z  
**Agent:** Data  
**Directive:** Run multi-repo substitute A/B scale-out under Worf conditionally approved gate (3 repos, ≤150 turns)

## Status
COMPLETE

## Summary
- Ran multi-repo substitute A/B scale-out across 3 isolated fixtures
- Repos: `squad-fixture`, `node-typescript-fixture`, `python-fixture`
- Paired turns: 50 per repo × 3 repos = 150 total (300 rows)
- Cross-repo isolation verified: separate roots, memory stores, logs; no memory leakage
- Aggregate recall: A/no-memory 0/150, B/memory 27/150 (18% consistent)
- Forbidden rejection: 6 turns (2 per repo)
- Supersession: 6 turns (2 per repo); forward-link recall observed 3 times
- Zero failures, timeouts, silence events, hang escalations across all repos
- Token proxy: 106,665 tokens; $0 cost
- Artifact root: `C:\Users\tamirdresher\.copilot\session-state\e9c1993c-7118-476c-acb1-9616a7fecbe1\files\expanded-memory-ab\multirepo-scaleout-20260519T101227\`
- Decision merged: `.squad/decisions.md` (2026-05-19T10:12:27Z entry)

## Constraints Satisfied
✅ 3 fixture repos, no production repos  
✅ 2 variants per repo  
✅ 50 paired turns per repo; 150 total  
✅ Cross-repo isolation verified  
✅ R-1–R-5 all retained across repos  
✅ Forbidden rejection ≥1 per repo (6 total)  
✅ Supersession ≥1 per repo (6 total)  
✅ Workflow disabling, fixture isolation across repos  
✅ `realCopilotCliE2E: false` everywhere
