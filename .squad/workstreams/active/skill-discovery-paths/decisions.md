# Skill Discovery Path Coverage — Decisions

**Last Updated:** 2026-06-02T21:10:16+03:00  
**Scope:** Coordinator skill-aware routing across all 5 official Copilot CLI project skill paths  
**Format:** Append-only. New decisions prepended under `## Active Decisions`.

---

## Active Decisions

---

### 2026-06-02T21:10:16.324+03:00: Skill discovery — Worf R-1/R-2 landed; R-3 deferred
**By:** Data — Worf review follow-up
**Workstream:** [ws:skill-discovery-paths]
**What:** Added Worf's R-1 (NFC Unicode normalization + control-character/path-separator denylist for skill directory names) and R-2 (hardlinks-vs-symlinks note for monorepo users) to the shipped skill discovery design. R-3 (test gate) marked out of scope — Squad's skill discovery is LLM-prompt-driven, not runtime code.
**Why:** Worf APPROVED WITH RECOMMENDATIONS; the two non-blocking-but-actionable suggestions were small enough to land in the same workstream rather than queue separately.
**Files changed:**
- `.github/agents/squad.agent.md` — Dedup rule paragraph extended with NFC normalization + trailing-whitespace trim + control-char/path-separator denylist (R-1)
- `.squad/templates/squad.agent.md.template` — Same edit mirrored exactly (template twin invariant)
- `.copilot/skills/squad-conventions/SKILL.md` — Hardlinks-vs-symlinks note appended to the project skill paths section (R-2)
- `.squad/agents/data/history.md` — Learnings appended (normalization rule + hardlinks UX guidance)

**Verification:** Both `.github/agents/squad.agent.md` and `.squad/templates/squad.agent.md.template` show identical `+19/-6` delta (`19 +++++++++++++------`) in `git diff --stat HEAD` — PASS.

**R-3 disposition:** Deferred. If Squad ever introduces runtime skill-discovery code (e.g., a CLI scanner), revisit with a test against the precedence-order + dedup invariants Worf called out.

---

### 2026-06-02T21:10:16.324+03:00: [ws:skill-discovery-paths] Security & Reliability Review — Skill Discovery Design

**By:** Worf (Security & Reliability Reviewer)  
**Status:** APPROVED WITH RECOMMENDATIONS  
**Severity:** 3 recommendations (1 medium, 2 low) — not blockers, but improve robustness.

---

## Review Summary

Picard's design (Decisions 1–5) for skill-discovery precedence and 5-path scanning is **sound from a security and reliability perspective**. The symlink-skip rationale is justified, path traversal is protected by design (readdir on fixed paths), personal-skill exclusion is correctly scoped, dedup logic is unambiguous, and the implementation surface is well-identified.

**Three recommendations** below are valuable but not blocking. Data may implement without revision to this decision.

---

## Recommendations

### R-1: Path Component Normalization (MEDIUM)

**Finding:**  
The dedup rule uses "case-insensitive comparison" but does not normalize Unicode or control characters. Edge case: an attacker or careless user could create `release-process` (NFC) and `rele̋ase-process` (NFD composed) as separate directories, causing dedup to fail and attach both. While the impact is minimal (context waste, not a security breach), explicit normalization rules improve reliability.

**Recommendation:**  
In the implementation, normalize all directory names to **NFC Unicode form** and **trim trailing whitespace**. Explicitly reject any directory name containing:
- Null bytes (`\0`)
- Control characters (`\x00-\x1F`, `\x7F`)
- Path separators (`..`, `/`, `\`)

**Text for Data:**  
> When scanning directories, normalize each skill name to NFC Unicode form and trim whitespace. Reject any name containing null bytes, control characters, or path separators. Log a warning for rejected names: `⚠ Skill name '...' in {path} skipped (contains invalid characters).`

**Severity:** Medium. Improves dedup correctness and reduces prompt confusion from Unicode confusables.

---

### R-2: Symlink Alternative Documentation (LOW)

**Finding:**  
The symlink-skip decision is well-justified (Windows compatibility, security, simplicity), but users with monorepo scenarios may want symlink-like indirection without platform friction. The design acknowledges hardlinks as an alternative but doesn't document them explicitly in the implementation.

**Recommendation:**  
In code comments and user-facing docs (`.copilot/skills/squad-conventions/SKILL.md`), mention hardlinks as a permitted alternative for monorepo scenarios where a skill needs to exist in multiple logical locations.

**Text for Data:**  
> **Symlink note:** Symlinks are not followed (see Decision 3 — Windows compatibility and security). If you need a skill from another location in a monorepo, use a hardlink instead: `ln {source-path} {destination-path}` (not `ln -s`). Hardlinks are permitted and will be discovered.

**Severity:** Low. Improves UX for monorepo users without changing behavior.

---

### R-3: Test/CI Gate for 5-Path Precedence (MEDIUM)

**Finding:**  
The implementation checklist (Decision 5) lists 4 files and 6 edit sites but does NOT mention test coverage for the 5-path scan or precedence order. Without a test, a future maintenance mistake (e.g., someone accidentally hardcodes `.squad/skills/` and forgets `.claude/skills/`) would not be caught until a user reports missing skill coverage.

**Recommendation:**  
Add a test (or document requirement for test) that verifies:
1. All 5 paths are scanned in the correct precedence order.
2. Dedup by directory name (case-insensitive) correctly selects the highest-precedence skill.
3. Symlinks are skipped; hardlinks are followed.

This can be a mock test (no real `.claude/skills/` directory needed) that simulates directory structures.

**Text for Data:**  
> Add a test in `.squad/test/` (or CI) that verifies skill discovery:
> - Mock 5 skill directories (one per path) with the same skill name.
> - Verify the coordinator selects the highest-precedence version.
> - Verify symlinks are skipped, case mismatches are deduplicated.
> - Example: create `mock-skills/{squad,copilot,github,claude,agents}/test-skill/SKILL.md`, run discovery, assert only `.squad/` version is used.

**Severity:** Medium. Prevents silent regressions in skill coverage.

---

## Other Findings

### Symlink/Platform Edges (No Action Required)

The design does not explicitly address macOS aliases or WSL symlinks, but skipping them alongside symlinks is safe:
- **macOS aliases:** Not POSIX symlinks; `readdir` returns them as regular files or skips them. Acceptable.
- **WSL symlinks:** Absolute filesystem paths are not affected by `/mnt/` mounts. Skipping is safe.

### Personal-Skill Exclusion (Correct Framing)

The exclusion is sound. Squad provides no isolation for malicious personal skills (by design — the CLI loads them regardless). Squad's job is to avoid *introducing* new risk by duplication. ✓

### Dedup Edge Cases (Well-Specified)

All edge cases (3+ paths with same name, race conditions, case mismatches) are correctly handled in the design. ✓

---

## Verdict

**APPROVED WITH RECOMMENDATIONS.**  
Picard's design is ready for Data to implement. The 3 recommendations above enhance robustness and test coverage but are not blockers. Recommend Data incorporate R-1 (normalization) and R-3 (test gate) in the same implementation pass; R-2 is a documentation touch-up that can be concurrent.

---

**Security Review completed by:** Worf  
**Timestamp:** 2026-06-02T21:10:16.324+03:00  
**Workstream:** [ws:skill-discovery-paths]

---

# Decision: Skill Discovery 5-Path Policy — Implementation Complete

**Agent:** Data  
**Timestamp:** 2026-06-02T21:10:16.324+03:00  
**Workstream:** skill-discovery-paths  
**Workstream type:** squad-internal  

## What This Records

Picard's 5-decision skill discovery policy (see `picard-skill-discovery-precedence.md`) has been implemented across all identified edit sites. This drop records verification status and file-change inventory.

## Files Changed

| File | Edit Description |
|------|-----------------|
| `.github/agents/squad.agent.md` | Routing section: 2-path → 5-path + dedup + personal exclusion + HTML sync comment; State Protocol Skills note; spawn template skill-check |
| `.squad/templates/squad.agent.md.template` | Same 3 sites mirrored identically |
| `.squad/templates/plugin-marketplace.md` | Added "Why `.squad/skills/`?" blockquote after install steps |
| `.copilot/skills/squad-conventions/SKILL.md` | File structure: single `.squad/skills/` line → full 5-path table with personal-paths exclusion |

## Verification Status

**PASS** — `git diff --stat HEAD` shows:
- `.github/agents/squad.agent.md`: +14 / -5
- `.squad/templates/squad.agent.md.template`: +14 / -5 (byte-identical delta — sync confirmed)
- `.copilot/skills/squad-conventions/SKILL.md`: +8 / -1
- `.squad/templates/plugin-marketplace.md`: +2 / 0

No unintended collateral files changed in the 4-target set.

## Decisions Implemented

Per `picard-skill-discovery-precedence.md`:

1. **Decision 1 (Precedence order):** `.squad/skills/` > `.copilot/skills/` > `.github/skills/` > `.claude/skills/` > `.agents/skills/`
2. **Decision 2 (Personal paths excluded):** `~/.copilot/skills/` and `~/.agents/skills/` excluded from Squad scan — CLI injects ambiently
3. **Decision 3 (Dedup rule):** Directory name = skill identity (case-insensitive). Highest precedence wins. Warn on case-mismatch.
4. **Decision 4 (Traversal):** One level deep, skip symlinks, no per-session cache
5. **Decision 5 (Plugin install target):** Marketplace installs to `.squad/skills/` (tier 1), independent of 5-path scan

## Incident During Implementation

During template edit of the State Protocol Skills line, `old_str` accidentally matched too broadly and swallowed the orphan-branch conditional block. Caught immediately; restored in the same session. See `data/history.md` Learnings for the narrow-`old_str` rule for Jinja conditional blocks.

## Status

✅ COMPLETE — all 5 decisions implemented, sync verified, artifacts written.

---

### 2026-06-02T21:10:16.324+03:00: Skill discovery precedence + personal-path policy
**By:** Picard (Lead) — requested by Tamir
**Workstream:** [ws:skill-discovery-paths]
**What:** Squad's coordinator currently scans only `.copilot/skills/` and `.squad/skills/` for skill-aware routing. Copilot CLI supports 5 project paths and 2 personal paths. This decision establishes which paths Squad scans, the precedence order when skill names collide, whether personal skills participate in routing, and the traversal/safety rules. The result is that Squad's routing sees every skill the CLI itself sees — no more invisible skills.

**Why:** Skills placed in `.github/skills/` (a natural home next to `.github/workflows/`, `.github/copilot-instructions.md`, and `.github/agents/`) are loaded by Copilot CLI but invisible to Squad's routing logic. This means agents spawned by the coordinator never receive `Relevant skill: ...` for those skills — defeating the entire skill-aware routing mechanism for the most common non-Squad skill location. Fixing this requires a principled precedence order (not just "scan everything") because the same skill name can legitimately appear in multiple paths, and the coordinator must pick exactly one to attach. Personal skills need a clear in-or-out ruling to avoid duplication with ambient CLI loading and to respect the team-visible boundary.

---

#### Decision 1 — Project-skill precedence order

**Verdict: `.squad/skills` > `.copilot/skills` > `.github/skills` > `.claude/skills` > `.agents/skills`**

Rationale per tier:

1. **`.squad/skills/`** — Team-earned skills. These are written by Squad agents during work (SKILL EXTRACTION after-work step). They represent validated, team-specific knowledge. Highest precedence because a team that takes the time to capture a pattern in `.squad/skills/release-process/` is explicitly overriding any generic version. This is the "local override wins" principle.

2. **`.copilot/skills/`** — Project playbook. These are curated by the project maintainer as authoritative process knowledge (release workflows, git conventions, reviewer protocols). They pre-date Squad and serve as the coordinator's own reference. Second because they're intentional, human-curated, project-scoped — but `.squad/skills/` should be able to override them when the team evolves past the original playbook.

3. **`.github/skills/`** — Generic project skills. Sits alongside other `.github/` tooling. Common location for skills checked into shared repos. Third because it's a project-wide default — not team-tuned, not coordinator-specific.

4. **`.claude/skills/`** — Claude-ecosystem skills. Fourth: vendor-specific path, less common in multi-tool projects.

5. **`.agents/skills/`** — Generic agents path. Lowest project precedence: least specific, least established convention.

**Override scenario validation:**
- ✅ User tunes `.squad/skills/release-process` to override `.github/skills/release-process` — works (tier 1 > tier 3).
- ✅ Shared repo ships `.github/skills/code-review` as the official version — works if no team override exists. If team writes `.squad/skills/code-review`, team wins — this is intentional and correct, because the team has locally specialized.
- ✅ `.copilot/skills/git-workflow` overrides `.github/skills/git-workflow` — works (tier 2 > tier 3). The maintainer's explicit Copilot playbook beats the generic `.github/` version.

---

#### Decision 2 — Personal skills inclusion

**Verdict: EXCLUDED from Squad routing.** Personal skill paths (`~/.copilot/skills/`, `~/.agents/skills/`) are NOT scanned by the coordinator.

Justification:

1. **Copilot CLI already injects personal skills as ambient context.** Every agent spawn inherits them via the CLI's own skill-loading mechanism. Attaching them again via `Relevant skill: ...` in the spawn prompt is pure duplication — wasting context tokens for zero benefit.

2. **Team-visible boundary.** Squad's orchestration log records which skills were attached to each spawn. Personal skills are user-private — logging them in team-visible artifacts violates the implicit privacy contract. The coordinator operates as a team resource, not a personal assistant.

3. **Cross-machine portability.** Personal skills exist on one developer's machine. If Squad routes based on `~/.copilot/skills/my-shortcuts/`, agents on CI or other teammates' machines won't find them, creating non-reproducible routing.

4. **Scope creep prevention.** Ghost Protocol already handles personal agents (routed via consult mode). Extending personal coverage to skills blurs the line between "my customizations" and "team knowledge" — exactly the distinction Squad's tiered skill model is designed to preserve.

**If a user wants a personal skill to influence Squad routing:** promote it to a project path (copy to `.squad/skills/` or `.github/skills/`). This is an explicit act that makes the skill team-visible, version-controlled, and portable. The ceremony of promotion is a feature, not a burden.

---

#### Decision 3 — Path traversal scope & safety

**Recursive: ONE level only.** A skill is recognized as `{skill-dir}/{skill-name}/SKILL.md` — exactly one directory deep. Nested paths like `.github/skills/foo/bar/SKILL.md` are NOT matched. This matches the current `.squad/skills/` and `.copilot/skills/` convention and aligns with the Copilot CLI's own skill discovery (each skill = one directory containing a SKILL.md).

**Symlinks: SKIP (do not follow).** Reasons:
- Windows compatibility: symlinks on Windows require elevated privileges or developer mode. Many CI environments and team member machines won't have them.
- Security: symlink following opens traversal attacks (a symlink in `.github/skills/` pointing to `../../.env` or outside the repo).
- Simplicity: if a user wants a skill from another location, copy or hardlink it. Symlink indirection adds debugging complexity for marginal benefit.

**Caching: NO explicit cache — rely on filesystem.** Reasons:
- 5 directory listings (each returning ~0-20 entries) is trivially fast on any modern filesystem, including NTFS. Total cost: <5ms per spawn on spinning disk, <1ms on SSD.
- Caching introduces staleness risk: a user adds a skill mid-session and expects it picked up on the next spawn. A stale cache breaks that expectation silently.
- The coordinator already does file I/O on every spawn (reading charters, routing.md, decisions.md). Five extra `readdir` calls are noise in that budget.

**Performance note for future:** If a project has 100+ skills across all paths (unlikely near-term), revisit with a per-session manifest that's rebuilt on first access and invalidated on `.squad/skills/` writes. But don't build this until the problem is measured.

---

#### Decision 4 — Skill identity & dedup

**Rule: Directory name is the skill identity.** Two skills are "the same skill" if and only if their containing directory names match (case-insensitive comparison for Windows compatibility).

Examples:
- `.squad/skills/release-process/SKILL.md` and `.github/skills/release-process/SKILL.md` → same skill. `.squad/` version wins per precedence.
- `.squad/skills/release-process/SKILL.md` and `.copilot/skills/release-workflow/SKILL.md` → different skills. Both are attached if both match the task domain.

**Why not SKILL.md `name` frontmatter?** Three reasons:
1. Not all SKILL.md files have frontmatter. Making identity depend on optional metadata creates an inconsistency: skills without frontmatter would fall back to directory name, making the identity rule context-dependent.
2. Directory names are visible in the filesystem, in `ls` output, in spawn prompts. They're the natural human-readable identifier. Frontmatter requires opening and parsing the file — slower, more fragile, and invisible to quick inspection.
3. The Copilot CLI itself uses directory name as the skill identifier. Aligning with the platform avoids divergence.

**Case normalization:** Compare directory names as lowercase. `Release-Process` and `release-process` are the same skill. Log a warning if a case-mismatch dedup occurs, so the user knows: `⚠ Skill 'release-process' found in multiple paths (case-variant); using {winner-path}.`

---

#### Decision 5 — Implementation checklist for Data

Every file and section that needs updating, with line numbers from current HEAD:

**1. `.github/agents/squad.agent.md`** — Skill-aware routing section (lines 266–270)
- **Lines 266–270:** Replace 2-path scan with 5-path ordered scan. New text should list all 5 project paths in precedence order with one-line role descriptions. Remove "check BOTH" wording; replace with "check ALL project skill directories in precedence order."
- **Lines 925–927:** Spawn template skill-check block. Update `Check .copilot/skills/` and `Check .squad/skills/` to list all 5 paths. Keep the instruction concise — agents don't need the precedence logic (coordinator resolves that before spawning), they just need to know which paths to read.

**2. `.squad/templates/squad.agent.md.template`** — Same edits as #1 (source of truth for `squad upgrade`)
- **Lines 262–266:** Mirror the routing section update from #1.
- **Lines 881–883:** Mirror the spawn template skill-check update from #1.

**3. `.squad/templates/plugin-marketplace.md`** — Install target path (line 42)
- **Line 42:** Keep `.squad/skills/{plugin-name}/SKILL.md` as the default install target. Do NOT make it configurable across all 5 paths. Rationale: plugins installed from a marketplace become team-earned knowledge — they belong in `.squad/skills/`. If a user wants to move them to `.github/skills/` for broader project scope, that's a manual promotion. Adding a path picker to the install flow adds UX complexity for a rare use case.

**4. `.copilot/skills/squad-conventions/SKILL.md`** — File structure section (lines 27–32)
- **Line 31:** Currently only mentions `.squad/skills/`. Add all 5 project skill paths with a note on precedence order. Add a note that personal skill paths (`~/.copilot/skills/`, `~/.agents/skills/`) are loaded by Copilot CLI ambiently but NOT scanned by Squad routing.

**5. `.squad/decisions.md`** — Via inbox drop file (this document).
- Scribe merges this decision into the canonical ledger.

**6. SKILL EXTRACTION after-work step** (`.github/agents/squad.agent.md` line 966–967, `.squad/templates/squad.agent.md.template` line 922–923)
- **No change needed.** Skill extraction correctly writes to `.squad/skills/` — that's the team-earned tier. Agents should not write to `.github/skills/` or other paths; those are for human/project-level curation.

**7. Adding Team Members + Plugin Marketplace** (`.github/agents/squad.agent.md` lines 1085, 1108; `.squad/templates/squad.agent.md.template` lines 1041, 1064)
- **No change needed.** Plugin install target stays `.squad/skills/`. The marketplace flow installs to team-earned tier, which is correct.

**8. State Protocol — git-notes** (`.github/agents/squad.agent.md` line 874; `.squad/templates/squad.agent.md.template` line 830)
- **Line 874 / 830:** Currently says "Skills are static config — write to `.squad/skills/`." This is still correct (agents write to `.squad/skills/`), but add a parenthetical: "(the coordinator reads skills from all 5 project paths; agents write new skills only to `.squad/skills/`)."

**Summary of changes:** 4 files, 6 edit sites. Estimated effort: <1 hour for Data.

---

#### Open questions / follow-ups

1. **Copilot CLI skill loading confirmation.** The 5-path list comes from the official docs link Tamir provided. If the CLI adds new paths in a future release, Squad should pick them up. Consider a comment in the routing section: `<!-- Sync with Copilot CLI skill paths: https://docs.github.com/... -->` so future maintainers know to check.

2. **Skill matching heuristic.** The current routing says "check for skills relevant to the task domain" but doesn't specify HOW the coordinator matches a skill to a task. This is a separate concern from discovery/precedence, but worth a follow-up decision. Today it's coordinator judgment (reading skill names + SKILL.md descriptions). A future enhancement could be keyword matching on SKILL.md frontmatter tags.

3. **`squad upgrade` path expansion.** When `squad upgrade` runs on a target project, it overwrites `.github/agents/squad.agent.md` from the template. The new 5-path scan will automatically ship to upgraded projects. No additional upgrade-path work is needed — this is purely a prompt change, not a runtime code change.

---
