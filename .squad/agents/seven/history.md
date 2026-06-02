# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Cross-repo Squad history, research repos, Squad SDK/CLI, Clawpilot/m, Azure agent systems
- **Created:** 2026-05-14T09:22:24.987+05:30

## Seven — Core Mission

Seven owns cross-repo learning & signal research. Key focus: state-backend community signal, memory research, ADC architecture validation, provenance documentation.

## Key Learnings (Active)

- **2026-06-02:** Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations
- Foundational Directives: Type safety (strict mode mandatory), hook-based governance, Node.js ≥20 ESM-only, append-only merge drivers for `.squad/decisions.md` and agent history files
- Routing Architecture: CLI-centric enforcement creates gaps on other platforms (VS Code); platform-neutral dispatch rules required with per-platform substitution mechanisms
- State-Backend: 5 dominant problem themes (upgrade gaps P1, two-layer incomplete P1, coordinator inconsistency P2, permission API breaking P1, state destruction on branch switch P1-resolved)
- Memory Research: E2E oracle + A/B value framework; real Copilot CLI E2E portfolio (smoke 40min + full 7.5-9hr); real subprocess, persistent memory, measurable delta distinguish from substitutes

## Cross-Repo Research Context

PR #3 Squad.Agents.AI provenance split identified: Data track (auth inventory), Reno implementation, Worf token hardening. Prior PoCs catalogued. Four files required per skill in marketplace: SKILL.md, manifest.json, plugin.json, README.md.

## 2026-06-02T10:50:37Z — 11-Mode Auth Inventory Research Context

Data authored 11-auth-mode inventory for Squad.Agents.AI expansion (Decision cleared, PASS_WITH_CONDITIONS). Inventory surfaces SDK auth surface consistency patterns; may inform future MAF/Copilot SDK research.

---
**Last Updated:** 2026-06-02T10:50:37Z  
**Archive:** `.squad/agents/seven/history-archive.md` (comprehensive baseline + state-backend triage)
