---
updated_at: 2026-06-02T12:04:38.931+03:00
focus_area: Onboarding to Squad.Agents.AI NuGet work (continuation of tamresearch1 squad's lineage)
active_issues: [tamirdresher/squad#3]
---

# What We're Focused On

**Active mission:** Continue the **Squad.Agents.AI NuGet** track — originally driven by the tamresearch1 squad (same Star Trek casting, different repo). PR https://github.com/tamirdresher/squad/pull/3 is the authoritative artifact.

**🎯 Active execution (2026-06-02):** Adopt-with-attribution. Keep Reno's verified code; add the two missing pieces under squad-squad commits to close gaps + establish active maintainership:
- B'Elanna: add .NET CI workflow on the PR #3 branch
- Data: add routing integration test on the PR #3 branch
Boundary directive: clawpilotsquad owns clawpilot/repo m, NOT Squad.Agents.AI. Reno's prior commits stay (the work is real); ownership transfers via squad-squad commits going forward.

**Lineage to inherit:**
- Strategy pivoted 2026-05-28 (Decision 443) from MAF first-party `Microsoft.Agents.AI.Squad` to community NuGet `Squad.Agents.AI` shipped from `tamirdresher/squad` fork. EMU backstop strategy stood down.
- Source scaffold lives in `tamresearch1\.squad\research\maf-contribution-drafts\03-sample-pr-scaffold\`.
- Working demo: `C:\Users\tamirdresher\source\repos\squad-agent-framework-demo`.
- Authoritative decision history: `tamresearch1\.squad\decisions.md` (Decisions 437, 438, 439, 440, 443, 447, 602+).

**Ongoing:** Squad framework itself, agent runtime patterns, Durable Tasks/DTD, Azure integrations.
