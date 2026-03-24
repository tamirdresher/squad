# Tiered Agent Memory Guide

> Addresses: bradygaster/squad#600  
> Production data from: tamirdresher/tamresearch1 (June 2025)

---

## The Problem: Token Bloat

Every Squad agent spawns with its full conversation history. In production, the top agents carry:

| Agent | Context Size | Old Noise % |
|-------|-------------|-------------|
| Picard | 74KB / 18,500 tokens | 96% |
| Scribe | 52KB / 13,000 tokens | 91% |
| Data   | 43KB / 10,700 tokens | 88% |
| Ralph  | 38KB / 9,500 tokens  | 85% |
| Worf   | 34KB / 8,500 tokens  | 82% |

82–96% of each agent's context is "old noise" — decisions that were made, tasks that completed, and conversations that ended weeks ago. This wastes tokens, increases spawn latency, and can cause agents to hallucinate stale context as current fact.

---

## The Solution: Three-Tier Memory Model

Instead of one monolithic context dump, memory is split into three tiers with different load policies:

```
┌─────────────────────────────────────────────────┐
│  🔥 Hot Tier (always loaded, ~2–4KB)            │
│  Current session context only                   │
├─────────────────────────────────────────────────┤
│  ❄️  Cold Tier (on-demand, ~8–12KB)              │
│  Summarized cross-session history               │
├─────────────────────────────────────────────────┤
│  📚 Wiki Tier (selective read, variable size)   │
│  Durable structured knowledge / ADRs            │
└─────────────────────────────────────────────────┘
```

**Result: 20–55% context reduction per spawn** with better relevance.

---

## Tier Details

### 🔥 Hot Tier
- What: Current task, active decisions, last 3–5 actions, current blockers
- Size: 2–4KB
- When: Always. Every spawn gets this.
- Managed by: Coordinator inlines it in the spawn prompt

### ❄️ Cold Tier
- What: Compressed summaries of past sessions (Scribe compresses ~10:1)
- Size: 8–12KB
- When: Load on demand — add `--include-cold` when task needs history
- Managed by: Scribe writes to `.squad/memory/cold/{agent}.md` at session end
- TTL: 30 days, then promoted to Wiki

### 📚 Wiki Tier
- What: ADRs, stable conventions, API contracts, agent charters
- Size: Variable
- When: Load on demand — add `--include-wiki` when task needs domain knowledge
- Managed by: Scribe writes to `.squad/memory/wiki/{topic}.md`
- TTL: Permanent (manual deprecation)

---

## Wiring Into a Coordinator

### Step 1: Hot Context — Always Include

In your coordinator's spawn logic, always prepend the hot context:

```markdown
## Memory Context
### Hot (current session)
Current task: {task}
Active decisions: {decisions}
Last actions: {recent_actions}
```

### Step 2: Cold — Add When Needed

When the task involves history (`resume`, `debug recurring`, `what did we try`):

```markdown
### Cold (summarized history)
{read .squad/memory/cold/{agent}.md}
```

### Step 3: Wiki — Add When Needed

When the task involves implementation or domain knowledge:

```markdown
### Wiki Reference
{read .squad/memory/wiki/{topic}.md}
```

### Step 4: Tell Scribe to Maintain Memory

At session end, call Scribe with:

```
scribe:summarize-session --agent={agent} --write-cold
```

Scribe compresses the session and writes the Cold summary. No manual work needed.

---

## File Layout

```
.squad/
  memory/
    hot/          ← Written by coordinator at spawn time (ephemeral)
      {agent}.md
    cold/         ← Written by Scribe at session end (30-day TTL)
      {agent}.md
    wiki/         ← Written by Scribe on demand (permanent)
      {topic}.md
  skills/
    tiered-memory/
      SKILL.md    ← Full skill reference
  templates/
    spawn-with-memory.md  ← Spawn template
```

---

## Rollout Checklist

- [ ] Update coordinator to inline hot context in all spawn prompts
- [ ] Update Scribe charter with `summarize-session` instruction
- [ ] Create `.squad/memory/` directory structure
- [ ] Migrate existing agent context files to cold tier (one-time)
- [ ] Add `--include-cold` / `--include-wiki` flag handling to coordinators
- [ ] Verify Scribe writes cold summary on session end

---

## References

- Skill definition: `skills/tiered-memory/SKILL.md`
- Spawn template: `templates/spawn-with-memory.md`
- Upstream issue: bradygaster/squad#600
- Production measurements: tamirdresher/tamresearch1 (June 2025)