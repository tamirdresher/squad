# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI research & architecture, SDK auth modes, extension-point design, MAF samples
- **Created:** 2026-06-02T09:00:00Z

## Data — Core Mission

Data owns Squad Framework expertise, SDK/CLI research, auth-mode inventory, extension-point design evaluation, and proposal-first research workflow. Lead researcher for Squad.Agents.AI auth expansion.

## 2026-06-02 — Squad.Agents.AI Auth Expansion Proposal (CLEARED)

**Verdict:** PROPOSAL (Decision merged to `.squad/decisions.md`)

**Research Outcome:**
- 11-auth-mode inventory (5 pass-through, 2 awkward, 4 blocked) from Copilot SDK auth surface
- Gap analysis: 4 modes currently supported; 5 modes blocked (BYOK + UseLoggedInUser)
- 3 extension-point candidates evaluated; Candidate 1 (configure delegate `Action<CopilotClientOptions>`) recommended
- 8 invariants (F1–F8) identified for routing protection; convention-only enforcement proposed
- Open questions for Picard (BYOK scope, naming) and Worf (security gates) answered via reviewer gates
- Migration risk: LOW (all changes additive to unpublished v0.1-preview)

**Next:** Data will implement; Picard and Worf will gate implementation PR.

---
**Last Updated:** 2026-06-02T10:50:37Z  
**Archive:** `.squad/agents/data/history-archive.md` (detailed research notes)
