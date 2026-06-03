# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Azure Developer CLI, AKS, Azure Container Apps, Aspire/observability, containers, Squad/agent workloads
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Geordi owns Azure platform and operational concerns for Squad and AI-agent runtimes.

## Learnings

2026-06-02: Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations (per user directive).

- Tamir explicitly wants coverage for ADC, AKS, ACA, Azure as a whole, and distributed systems that integrate AI and agents.
- Platform proposals should include diagnostics and observability, not just deployment steps.

## Major Workstreams (Archived)

**Status:** 270 lines of history across 5 major workstreams archived to `.squad/agents/geordi/history-archive.md`:

1. **Real Copilot CLI YOLO Harness Repair** (2026-05-19) — Process runner replacement, fail-closed checks, artifact guarantees.
2. **Session Store Isolation Plan** (2026-05-19) — Per-repo profile roots, environment override strategy, minimal validation sequence.
3. **ADC External Trigger Research** (2026-05-14) — ScheduledTask CRDs, ADC sandbox API, telemetry pipeline.
4. **ADC Event Bus Deep Inspection** (2026-05-14) — Redis XADD/XREADGROUP event stream, consumer groups, at-least-once delivery.
5. **Squad-to-ADC Event Adapter Pattern** (2026-05-14) — External listener layer, event transformation, decoupled integration.

---
**Last Updated:** 2026-06-02T11:23:51Z  
**Archive:** `.squad/agents/geordi/history-archive.md`

## Learnings (2025 — Worf Conditions A/B, commit 77186501)

- **EACCES/EISDIR failure mode on dual-write mirrors**: filesystem-mirror writes (legacy dual-write to a non-canonical path like `.copilot/mcp-config.json`) must NEVER crash the primary operation. The canonical write is the source of truth; the mirror is by definition non-critical. Always wrap in try/catch and downgrade thrown errors to warnings. See `packages/squad-sdk/src/config/init.ts:1346-1382`.
- **JSON round-trip as defense-in-depth**: even when `JSON.stringify` is theoretically sound for plain objects, a `JSON.parse(serialized)` call before write costs <1ms and immunizes against future refactors that introduce custom `toJSON` methods or non-stringify-safe values. Critical when the downstream consumer (Copilot CLI 1.0.58) silently drops malformed JSON with no warning -- per Seven's precedence research. See `packages/squad-sdk/src/upgrade/migrate-mcp-config.ts:355-364`.
- **vitest pattern for cross-platform fs-permission tests**: use `it.skipIf(process.platform === 'win32')` when the failure mode requires POSIX `chmod`-based read-only directory simulation. NTFS ACLs don't honor `chmod` bits the same way. Acceptable to leave Windows uncovered when the underlying bug is platform-agnostic and POSIX coverage proves the fix.
