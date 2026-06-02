# SKILL: squad-agent-template-sync

**Tier:** `.squad/skills/` (team-earned — highest precedence)  
**Use when:** Making any change to `.github/agents/squad.agent.md`

---

## The Invariant

`.github/agents/squad.agent.md` and `.squad/templates/squad.agent.md.template` are **structural twins**.

Every content change to the coordinator prompt MUST be mirrored in the template **in the same response** (same set of edits). The template ships to client projects via `squad upgrade`. If the two files drift, upgraded projects get inconsistent behavior and the diff will be invisible to reviewers who only look at the live prompt.

---

## How to Edit Both Files

1. Identify the line range in each file (they differ because the template has Jinja blocks that `squad.agent.md` renders without). View both before editing.
2. Make ALL edits to both files **in a single response** — one `edit` call per site per file. Do not split across turns.
3. After editing, confirm both files show the same net line-delta in `git diff --stat`.

---

## Warning: Jinja Conditionals

The template contains `{% if %}` / `{% endif %}` blocks that wrap entire sections. When replacing a multi-line block inside the template:

- Use a **narrow `old_str`** — one that begins with a distinctive line inside the block and does NOT include the surrounding `{% endif %}` tag or the start of the next `{% if %}` block.
- If your `old_str` accidentally spans a `{% endif %}` boundary, the next conditional block's opening tag will be deleted silently — and the template will render incorrectly for every backend variant except the one at the top.

**Safe pattern:**
```
old_str: "  ## State Protocol — Git Notes\n  ... (just the inner content lines) ..."
```

**Dangerous pattern (do NOT do this):**
```
old_str: "  ## State Protocol — Git Notes\n  ...\n  {% endif %}\n  {% if STATE_BACKEND == 'two-layer' %}\n  ## State Protocol — Two-Layer ..."
```

---

## Verification Checklist

After editing both files, verify:

- [ ] `git diff --stat HEAD` shows identical line-delta for both files in the changed sections
- [ ] Both files have the same content at the routing section (`Check project skill directories ...`)
- [ ] Both files have the same content at the State Protocol skills parenthetical
- [ ] Both files have the same content at the spawn template skill-check line
- [ ] The template still has all `{% if %}` / `{% endif %}` pairs balanced (grep for `{% if` vs `{% endif %}` counts)

---

## Background

This pattern was reinforced during the `skill-discovery-paths` workstream (2026-06-02). An accidental broad `old_str` deleted the orphan-branch `{% if STATE_BACKEND == "orphan" %}` block. The error was caught and restored in the same session, but cost an extra edit round-trip and left the `{% if STATE_BACKEND == "two-layer" %}` tag missing until a subsequent sync-verification pass.

Reference: `.squad/workstreams/active/skill-discovery-paths/decisions/inbox/data-skill-discovery-implementation.md`
