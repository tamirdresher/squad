# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI security audit, credential handling, threat models, security conditions
- **Created:** 2026-06-02T10:45:00Z

## Worf — Core Mission

Worf (Security & Reliability Reviewer) owns security audits, threat modeling, credential handling verification, pre-existing vulnerability discovery, and implementation security gates. Security reviewer for Squad.Agents.AI auth expansion.

---

**[Historical entries 2026-06-02 (Auth Review, PR #3 audit, Workstreams review, MCP migration review) archived to .squad/agents/worf/history-archive.md on 2026-06-03T03:55:03Z]**

---

## 2026-06-03 Security Review Summary

**MCP Merge Helper (2026-06-02T23:18:09+03:00):** APPROVED WITH CONDITIONS (2 conditions to Geordi). Temp-then-rename atomic write pattern verified; conflict policy tested; fsync tradeoff documented. Extracted reusable pattern: "Atomic JSON Write Checklist" → .squad/skills/atomic-json-write-checklist/SKILL.md. PR #1208 opened after conditions applied.

**Skill-Discovery-Paths Learnings (2026-06-03):** Governance rules (LLM-prompt-only) ≠ enforcement (runtime gate). SHA-256 mirror invariant essential. Extracted security checklist for skill-directory scanners: denylist NUL/control chars/separators, NFKC homoglyph hardening, NTFS reparse points, explicit depth limit, whitespace trim, case normalization, Windows reserved names, personal-vs-project scope.

**Skill-Discovery-Paths Re-review (2026-06-03T03:55:03Z):** APPROVED — all 5 conditions verified (C-0 BLOCKING + C-1..C-4 recommended). Mirror SHA-256 invariant confirmed across all 5 upstream mirrors; tests (261/261) pass; block content matches verbatim. Picard's remediation was precise; design-author ownership yields tighter language.

**iter-9 --yolo --additional-mcp-config @.mcp.json Defaults (2026-06-03):** APPROVED_WITH_CONDITIONS (3 blocking, 2 recommended). Core finding: --yolo is correct; risk is passing ENTIRE .mcp.json instead of selective squad_state entry. Blocking: C-1 (existence check), C-2 (extract only squad_state entry, inline), C-3 (document as security-sensitive). Recommended: C-4 (exact version pin), C-5 (verify Ralph's loop). Handoff to Data (~18 LOC).

**Reusable Patterns Extracted:** Atomic JSON write checklist; "full file vs. selective load" distinction; .mcp.json security boundary; --yolo blast radius; folder-trust gate bypass; floating dist-tag supply chain risk.

**Full Reports:**
- MCP merge helper: .squad/workstreams/active/squad-agents-ai/decisions/inbox/worf-mcp-merge-helper-review.md
- iter-9 defaults: .squad/workstreams/active/squad-agents-ai/decisions/inbox/worf-iter9-yolo-defaults-security-review.md

---

**Last Updated:** 2026-06-03T21:05:00Z
**Archive:** .squad/agents/worf/history-archive.md (2026-06-02 and earlier entries)
