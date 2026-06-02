---
updated_at: 2026-06-02T15:52:21+03:00
status: tombstone
redirects_to: .squad/workstreams/active/{slug}/now.md
---

# ⚠️ Tombstone — Redirected to Per-Workstream `now.md`

This file (`identity/now.md`) is no longer the live focus pointer. It is kept here so that any agent or script that reads it will receive this redirect rather than stale data.

**The live focus state now lives per workstream:**

```
.squad/workstreams/active/squad-agents-ai/now.md   ← current active workstream
```

To find the relevant `now.md` for your session, read `SQUAD_WORKSTREAM` from the environment and resolve:

```
.squad/workstreams/active/${SQUAD_WORKSTREAM}/now.md
```

If `SQUAD_WORKSTREAM` is unset, the coordinator will run Workstream Discovery (see `.github/agents/squad.agent.md` — Workstream Discovery section) to determine which workstream is active.

---

**Historical context (preserved for lineage):** As of 2026-06-02T12:04:38+03:00, the active focus was Squad.Agents.AI NuGet (PR #3 on `tamirdresher/squad`). That context is now captured in `.squad/workstreams/active/squad-agents-ai/now.md`.
