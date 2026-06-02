# Evergreen / Global Decisions

**Scope:** Cross-cutting directives and architecture decisions that apply to ALL workstreams.

Agents route any directive marked `applies_to: all` here. Scribe merges from inbox to this file.

---

## Active Decisions

---

### 2026-06-02 — Public Hygiene Directive (Tamir)

**By:** Tamir Dresher  
**What:** No internal `.squad/` references, squad agent names, or internal process details in any public-facing text — PR descriptions, commit messages, NuGet READMEs, GitHub Releases, blog content, docs.

**Applies to:** All workstreams, all agents.

---

### 2026-06-02 — Workstreams Bootstrap (Data)

**By:** Data  
**What:** Workstream directory structure created under `.squad/workstreams/`. First workstream bootstrapped: `squad-agents-ai`. Picard's 7 conditions satisfied in this PR (conditions 1–6 in scope; condition 7 deferred to Worf).

**Schema:** `.squad/workstreams/active/{slug}/` contains `README.md`, `now.md`, `decisions.md`, and `decisions/inbox/`. `_template/` contains starter files for new workstreams. `evergreen/global/` is the cross-cutting decisions store.

---
