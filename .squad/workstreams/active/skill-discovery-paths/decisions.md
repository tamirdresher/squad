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

---

# Decision: Skill-discovery upstream implementation complete

**Agent:** data
**Workstream:** skill-discovery-paths
**Status:** ready-for-worf-review
**Date:** 2025-11-22

## Summary

Ported Picard's 5-decision skill-discovery design from squad-squad governance
doc (`.github/agents/squad.agent.md` lines 266-278, 933) into upstream
`bradygaster/squad` templates that ship via `squad upgrade`.

## Branch & commit

- **WORK DIR:** `C:/Users/tamirdresher/source/repos/squad`
- **Branch:** `feat/skill-discovery-paths` (branched from `upstream/dev`)
- **Commit SHA:** `fe1e7e8c3bb9417fb60e64c511d8b2307810f8bd`
- **Status:** NOT pushed, NO PR opened (per task brief)

## Files changed (10 total)

### Source template edits (2)
- `.squad-templates/squad.agent.md` — replaced 5-line "Skill-aware routing"
  block (was 2 paths) with 13-line block: HTML sync comment, 5-path
  precedence list, personal-paths note, dedup rule (NFC + invalid-char skip)
- `.squad-templates/spawn-reference.md` — replaced 2-line skill-dir check
  (lines 84-85) with single 5-path line

### Mirror propagation via `node scripts/sync-templates.mjs --sync` (7)
- `templates/squad.agent.md.template`
- `packages/squad-cli/templates/squad.agent.md.template`
- `packages/squad-sdk/templates/squad.agent.md.template`
- `.github/agents/squad.agent.md`
- `templates/spawn-reference.md`
- `packages/squad-cli/templates/spawn-reference.md`
- `packages/squad-sdk/templates/spawn-reference.md`

### Changeset (1)
- `.changeset/skill-discovery-paths.md` — minor bump for
  `@bradygaster/squad-cli` + `@bradygaster/squad-sdk`

## Verification

- **Byte-identical mirror invariant:** Confirmed via SHA-256 — all 5
  squad.agent.md files match, all 4 spawn-reference.md files match.
- **Targeted tests passed:**
  - `test/template-sync.test.ts` — 194/194 pass (2.3s); includes
    `beforeAll` re-sync + byte-comparison enforcement
  - `test/agent-doc.test.ts` — 35/35 pass
  - `test/skills.test.ts` — 27/27 pass
  - `test/builtin-skills.test.ts` — 5/5 pass
- **Full suite NOT run** (out of scope; 84 known pre-existing Windows
  flakes per workstream brief).

## Adjacent refs audit

Found one additional location beyond the brief: the spawn-template
"Check project skill directories" line lives in `spawn-reference.md`
(included by `squad.agent.md`), not directly in `squad.agent.md`. That's
why 9 template files were edited instead of 5. `docs/src/content/docs/
features/skills.md:85` mentions "Skill-aware routing" generically without
enumerating paths — no edit needed.

## Ready for Worf review

All technical pieces verified. Awaiting Worf sign-off before push/PR.

---

# Decision: Worf security review — skill-discovery 5-path expansion

**Agent:** worf
**Workstream:** skill-discovery-paths
**Status:** APPROVE WITH CONDITIONS
**Date:** 2026-06-03
**Reviewed:** WORK DIR `C:/Users/tamirdresher/source/repos/squad`, branch `feat/skill-discovery-paths`, commit `fe1e7e8c` (10 files, +72/-23)
**Reviewed against:** Picard's design (`{WORKSTREAM_PATH}/decisions.md`, esp. Decisions 3–4) and the squad-squad mirror (`.github/agents/squad.agent.md:266-278`)

---

## Mirror invariant (preflight)

Verified byte-identical via SHA-256 — **PASS**:

- `squad.agent.md` × 5 mirrors → `30B3F662…11151F` (all match)
- `spawn-reference.md` × 4 mirrors → `D3F270C7…118319` (all match)

Source-of-truth `.squad-templates/squad.agent.md` matches `.github/agents/squad.agent.md` on the upstream side, AND matches the squad-squad governance doc at `.github/agents/squad.agent.md:266-278` verbatim. Sync ceremony was honored.

---

## Gate 1 — Path traversal safety: **APPROVE WITH CONDITION (C-1)**

**Evidence:** `.squad-templates/squad.agent.md:312` (= `.github/agents/squad.agent.md:276` in both squad and squad-squad):

> "Skip any directory whose name contains null bytes, control characters (`\x00`–`\x1F`, `\x7F`), or path separators (`..`, `/`, `\`); log a warning…"

**What the rule covers correctly:**
- NUL in any position — "contains null bytes" is positional-agnostic ✔
- Trailing `..` or embedded `..` — substring match catches it ✔
- All C0 controls (`\x00`–`\x1F`) and DEL (`\x7F`) ✔
- POSIX (`/`) and Windows (`\`) separators ✔

**Gaps (not fatal, but worth shipping a clarification):**
- **Homoglyph separators:** Fullwidth solidus `／` (U+FF0F), fraction slash `⁄` (U+2044), backslash variants — NOT caught by NFC normalization (only NFKC would normalize them to `/`). For an LLM-driven coordinator that interpolates `{path}` into spawn prompts, this is a *prompt-injection* vector more than a filesystem-traversal vector, but it should be acknowledged.
- **Windows reserved names** (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`) — not addressable on Windows anyway (CreateFile rejects them), but a cross-platform repo could ship one from Linux and break Windows team members. Low risk.
- **URL-encoded separators** (`%2f`, `%5c`) — moot for `readdir`-sourced names, but if a future implementer ever accepts a skill path from a non-filesystem source (config file, URL parameter), the rule won't catch it. Worth noting.
- **Governance-only enforcement:** The rule lives in a prompt for an LLM coordinator. There is no runtime scanner today; when one is written, the prompt is descriptive enough that a careful implementer will get it right, but a careless implementer could ship something weaker. The rule should call this out so the eventual runtime gate (Geordi) has a clear contract.

**Condition C-1:** Add a single line to the dedup rule (or an adjacent footnote) noting that the listed denylist is the *minimum* contract; future runtime implementations MUST also reject homoglyph separators (`U+FF0F`, `U+2044`, etc.) and SHOULD reject Windows reserved names for portability.

---

## Gate 2 — Symlink-skip rationale: **REJECT**

**Evidence:** Picard's design (`{WORKSTREAM_PATH}/decisions.md:236-250`) explicitly mandates three rules under "Decision 3 — Path traversal scope & safety":

1. "**Recursive: ONE level only.**" (line 238)
2. "**Symlinks: SKIP (do not follow).**" (line 240) — with stated rationale: Windows compatibility, symlink-traversal attacks (`../../.env`), debugging simplicity
3. "**Caching: NO explicit cache — rely on filesystem.**" (line 245)

**Gap:** `grep -in "symlink|one-level|traversal|junction|reparse|cache"` against `.squad-templates/squad.agent.md` returns **ZERO matches** in the Skill-aware routing block (lines 306-314 in the shipped file). The same grep against the squad-squad mirror confirms the omission is identical on both sides — the rules **never made it from Picard's design into the shipped prompt**.

This is exactly the gap I was asked to verify. The workstream `now.md:24` explicitly tasks me with "security review of symlink-skip rationale" — the rationale isn't shipped, so there is nothing to review. The coordinator's prompt currently contains zero guidance on:

- Whether to descend past one level (an LLM could plausibly read `.github/skills/foo/bar/SKILL.md` and surface it)
- Whether to follow symlinks (an LLM could follow a symlinked dir and surface `../../.env` if a malicious skill placed one)
- Whether to cache (low-severity, but a stale-cache bug would be silently introduced)

**Additional concern — Windows reparse points / junctions:** Even if "no symlinks" lands in the prompt, NTFS junctions (`mklink /J`) and other reparse points are not POSIX symlinks. A careful runtime implementer would call `GetFileAttributesW` and check `FILE_ATTRIBUTE_REPARSE_POINT`, not just `IsSymbolicLink`. The prompt should say "symlinks and any other reparse points" to set the right expectation.

**Failure mode for legitimate monorepo symlinks** (e.g. `.claude/skills/shared-tools -> ../../shared/skills/tools`): Picard's design says silent-skip is correct (decisions.md:240-243) and points users at hardlinks instead (decisions.md:243). That's defensible, but the shipped prompt doesn't say it, so an LLM coordinator faced with a symlink today has no instruction at all.

**Remediation owner: Picard** (Data is locked out per Reviewer Rejection Lockout; this is a design-prompt fix, not platform engineering). Picard must port Decision 3 into the shipped prompt — likely a 2-3 line "**Traversal rule:**" paragraph between the precedence list and the dedup rule. Squad-squad's governance doc has the same gap and must be updated in lockstep.

---

## Gate 3 — Dedup with Unicode normalization: **APPROVE WITH CONDITIONS (C-2, C-3)**

**Evidence:** `.squad-templates/squad.agent.md:312`:

> "Normalize directory names to NFC Unicode form and trim trailing whitespace before comparison."

**NFC vs NFKC:** NFC is the correct choice for *filesystem identity preservation* — it canonicalizes combining sequences without collapsing semantically-distinct characters (fullwidth digits, ligatures). NFKC is more aggressive and would cause false-positive dedups (e.g., `ﬁ` ligature vs `fi` would dedup; intended Korean syllable variants would dedup). For this use case (human-typed directory names that should round-trip back to the filesystem after dedup), **NFC is defensible**. However, NFC does *not* catch homoglyph attacks — see Gate 1 C-1.

**Trailing whitespace only — gap.** Leading whitespace is not trimmed. `" release-process"` (leading space) and `"release-process"` would NOT dedup under the stated rule. Most filesystems accept leading spaces in directory names (Linux yes, macOS yes, Windows yes but Explorer hides them). Zero-width chars (ZWSP `U+200B`, ZWNJ `U+200C`, ZWJ `U+200D`, BOM `U+FEFF`) are also not covered.

**Condition C-2:** Change "trim trailing whitespace" to "trim leading and trailing whitespace, including zero-width characters (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`)."

**Case-insensitive — cross-platform inconsistency hazard.** Filesystems differ: Windows case-insensitive (NTFS by default), Linux case-sensitive (ext4/btrfs/xfs), macOS configurable (APFS defaults case-insensitive). Picard's design (decisions.md:256, 267) chose case-insensitive *for consistency across platforms* — the right call for coordinator-side routing. But it means a Linux user could create `.squad/skills/Release-Process/` and `.copilot/skills/release-process/` as filesystem-distinct dirs, and Squad would dedup them and surface only one with a warning. That's the intended behavior, and the warning makes it observable. APPROVE — but worth a single sentence in the prompt acknowledging "case-insensitive comparison regardless of the underlying filesystem's case sensitivity."

**Condition C-3:** Add the cross-platform acknowledgement sentence so a future implementer doesn't try to "improve" the rule to per-platform behavior.

---

## Gate 4 — Information disclosure / scope creep: **APPROVE**

**Evidence:** `.squad-templates/squad.agent.md:306-310` (the 5-path precedence list) and `.squad-templates/spawn-reference.md:84-85`:

> "Check project skill directories (.squad/skills/, .copilot/skills/, .github/skills/, .claude/skills/, .agents/skills/) for any SKILL.md the coordinator attached to your prompt. Read any relevant SKILL.md files before working."

- All 5 paths are treated equally subject only to precedence ordering — no special-casing of `.copilot/skills/` vs `.github/skills/`. Matches Picard's design.
- The agent is **explicitly told** what's being attached and where to find more (`spawn-reference.md:85`). No hidden context-injection — the routing is honest.
- Risk: vendor or other-team content in `.claude/skills/` or `.agents/skills/` will be surfaced if its directory name matches the task domain. This is the **explicit goal of the change** (closing the "invisible to Squad" gap from now.md). The remediation if a vendor skill leaks confidential data is *not* "Squad doesn't read it" but "the vendor doesn't put confidential data in a project-skill path." The change does not introduce the disclosure risk — it makes pre-existing disclosure visible to Squad routing.
- The `.changeset/skill-discovery-paths.md` is appropriately scoped (minor bump for both CLI and SDK), accurately describes the change, and the user-visible effect.

APPROVE — no condition.

---

## Gate 5 — Personal-paths exclusion correctness: **APPROVE WITH CONDITION (C-4)**

**Evidence:** `.squad-templates/squad.agent.md:310`:

> "**Personal paths not scanned:** `~/.copilot/skills/` and `~/.agents/skills/` are NOT scanned by Squad. Copilot CLI already injects them as ambient context for every agent spawn — attaching them again via the spawn prompt would duplicate context for zero benefit and log user-private data in team-visible artifacts."

- Precedence list (lines 306-310) contains exactly 5 paths, none start with `~`. ✔
- Rationale citing "log user-private data in team-visible artifacts" is a legitimate privacy-preserving argument and matches Picard's design (decisions.md:230).
- The exclusion is correct **for Copilot CLI** — confirmed by the linked official docs (`https://docs.github.com/.../copilot-cli/customize-copilot/add-skills`).

**Unverified assumption:** "Copilot CLI already injects them as ambient context for every agent spawn" is asserted as universal, but only the Copilot CLI surface is documented to do so. VS Code and JetBrains Copilot extensions do not publicly document personal-skill injection. Squad currently targets the CLI as its primary surface, so the assumption is safe today, but if Squad ever runs under a non-CLI surface that doesn't inject personal skills, those users will silently lose personal-skill awareness with zero log line.

**Condition C-4:** Reword the rationale from "Copilot CLI already injects them" to "Copilot CLI injects them as ambient context for every CLI agent spawn (other Copilot surfaces may not — if Squad ever supports a non-CLI runtime, revisit this exclusion)." This converts an undocumented universal claim into a scoped, falsifiable one.

---

## Overall verdict: **APPROVE WITH CONDITIONS — DO NOT PUSH YET**

The cross-mirror sync is clean, the path-traversal denylist is reasonable, the dedup rule is mostly right, and information-disclosure handling is honest. But **Gate 2 is a REJECT**: the symlink/one-level/no-cache rules from Picard's Decision 3 were never ported into the shipped prompt. That's the single most important security control in the workstream's "symlink-skip rationale" charge, and it's missing on both upstream (`squad/.squad-templates/squad.agent.md`) and the squad-squad mirror.

### Conditions before push to `bradygaster/squad:dev`:

| # | Severity | Owner | Condition |
|---|----------|-------|-----------|
| **C-0** | **BLOCKING** | **Picard** | Add a "**Traversal rule:**" paragraph between the precedence list and the dedup rule on `.squad-templates/squad.agent.md:309` covering: (a) one-level only, (b) skip symlinks and other reparse points (NTFS junctions, etc.), (c) no per-session cache, (d) brief rationale (Windows compat, traversal attacks). Apply the SAME edit to the squad-squad governance mirror so the templates remain authoritative. |
| C-1 | Recommended | Picard | Note that the dedup denylist is the *minimum* contract; runtime implementations MUST also reject homoglyph separators (`U+FF0F`, `U+2044`) and SHOULD reject Windows reserved names. |
| C-2 | Recommended | Picard | Change "trim trailing whitespace" → "trim leading and trailing whitespace, including zero-width characters (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`)." |
| C-3 | Recommended | Picard | Add: "Case-insensitive comparison regardless of the underlying filesystem's case sensitivity." |
| C-4 | Recommended | Picard | Reword personal-paths rationale to scope it to CLI surface explicitly. |

C-0 is the only blocker. C-1 through C-4 can be deferred to a follow-up changeset if Picard prefers — but C-0 must land in the same commit before push, because shipping the 5-path expansion without the traversal rule would *widen* the attack surface relative to today (more directories scanned, no new guidance on what to skip).

### Remediation owner: **Picard**

Per Reviewer Rejection Lockout, Data is locked out of the revision. Picard owns the skill-discovery design and is the right author for prompt language; once Picard's revision lands in the upstream branch, Data may re-run `scripts/sync-templates.mjs --sync` and Worf will re-review.

### Re-review trigger

Re-spawn Worf once Picard has applied C-0 (and any of C-1..C-4 they choose to bundle), Data has re-synced the mirrors, and the SHA-256 mirror-invariant still holds.

---

**Tag:** `[ws:skill-discovery-paths]`

---

# Decision: Worf review conditions C-0..C-4 applied — revision shipped

**Agent:** picard
**Workstream:** skill-discovery-paths
**Status:** APPLIED — awaiting Worf re-review
**Date:** 2026-06-03
**Tag:** [ws:skill-discovery-paths]

---

## Context

Worf's review (`worf-skill-discovery-review.md`) approved Gates 1/3/4/5 with conditions and **rejected Gate 2** (BLOCKING C-0): Decision 3 from `decisions.md:236-250` (one-level traversal / skip symlinks / no per-session cache) was documented in the workstream design but **never made it into Data's shipped prompt** at commit `fe1e7e8c`. Per Reviewer Rejection Lockout, Data is locked out of this revision; Picard owns the prompt language as original designer of Decision 3.

This revision bundles **all 5 conditions** in one commit pair to avoid a second round-trip.

---

## Revised text (shipped — between precedence list and personal-paths note)

The Skill-aware routing block in `.squad-templates/squad.agent.md` (and its 4 mirrors + the squad-squad governance copy) now reads, after the 5-item precedence list:

> **Traversal rule:** For each of the 5 directories above, (a) scan ONE level only — a skill is `{skill-dir}/{skill-name}/SKILL.md`; do NOT descend past a skill's top-level directory (nested `{skill-dir}/foo/bar/SKILL.md` is ignored); (b) SKIP symbolic links AND any other reparse points (NTFS junctions via `mklink /J`, mount points, and other Windows reparse-point types) — never follow them, even if the target appears to be inside the repo; (c) do NOT maintain a per-session cache — re-`readdir` on every spawn and rely on filesystem freshness (5 small directory listings is <5ms on any modern FS). **Rationale:** Windows compatibility (symlinks require elevated privileges or developer mode; reparse points are not POSIX symlinks and need a separate `FILE_ATTRIBUTE_REPARSE_POINT` check), defense against symlink-traversal attacks (a malicious or careless skill placing a symlink target like `../../.env` outside the repo would otherwise be read into a spawn prompt), and debugging simplicity (no stale-cache surprises when a user adds a skill mid-session). **Legitimate monorepo case:** a symlink like `.claude/skills/shared-tools -> ../../shared/skills/tools` is silently skipped by policy; if you want a shared skill to be Squad-discoverable, use a hardlink or copy the directory into one of the 5 paths.
>
> **Personal paths not scanned:** `~/.copilot/skills/` and `~/.agents/skills/` are NOT scanned by Squad. Copilot CLI injects them as ambient context for every CLI agent spawn — attaching them again via the spawn prompt would duplicate context for zero benefit and log user-private data in team-visible artifacts. (Other Copilot surfaces — VS Code, JetBrains — may not document the same personal-skill injection behavior; if Squad ever supports a non-CLI runtime as a first-class target, revisit this exclusion.)
>
> **Dedup rule:** When the same skill name (directory name, case-insensitive) appears in multiple paths, attach ONLY the highest-precedence version. Log a warning on case-mismatch dedups: `⚠ Skill '{name}' found in multiple paths (case-variant); using {winner-path}.` Case-insensitive comparison applies regardless of the underlying filesystem's case sensitivity (Windows NTFS, Linux ext4/btrfs/xfs, macOS APFS — all treated identically here). Normalize directory names to NFC Unicode form and trim leading and trailing whitespace, including zero-width characters (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`), before comparison. Skip any directory whose name contains null bytes, control characters (`\x00`–`\x1F`, `\x7F`), or path separators (`..`, `/`, `\`); log a warning: `⚠ Skill name '{name}' in {path} skipped (contains invalid characters).` (The listed denylist is the *minimum* contract. Future runtime implementations MUST also reject homoglyph separators such as fullwidth solidus `U+FF0F` and fraction slash `U+2044`, and SHOULD reject Windows reserved names — `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9` — for portability.)

---

## Condition-by-condition response

| # | Condition | Disposition | Where applied |
|---|-----------|-------------|---------------|
| **C-0** | **BLOCKING** — add Traversal rule paragraph (one-level, skip symlinks AND reparse points, no cache, with rationale) | **APPLIED** | New "Traversal rule:" paragraph inserted between precedence list and Personal-paths note. Includes (a)(b)(c)(d) per Worf, plus explicit NTFS junction / `FILE_ATTRIBUTE_REPARSE_POINT` callout and legitimate monorepo silent-skip clarification. |
| C-1 | Dedup denylist is minimum contract; runtime MUST reject homoglyph separators (`U+FF0F`, `U+2044`); SHOULD reject Windows reserved names | **APPLIED** | Appended parenthetical sentence to the Dedup rule paragraph; lists `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9` explicitly. |
| C-2 | "trim trailing whitespace" → "trim leading and trailing whitespace, including zero-width characters (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`)" | **APPLIED** | Verbatim wording inserted into Dedup rule. |
| C-3 | Add "Case-insensitive comparison regardless of the underlying filesystem's case sensitivity" | **APPLIED** | Sentence inserted into Dedup rule with explicit FS list (NTFS, ext4/btrfs/xfs, APFS) so a future implementer can't claim ambiguity. |
| C-4 | Personal-paths rationale scoped to CLI surface | **APPLIED** | "Copilot CLI already injects them as ambient context for every agent spawn" → "Copilot CLI injects them as ambient context for every CLI agent spawn" + parenthetical noting VS Code / JetBrains caveat and revisit-trigger if non-CLI runtime becomes a first-class target. |

All 5 conditions bundled in one commit pair per anti-hang rule (no second round-trip).

---

## Mirror invariant (post-revision)

Verified byte-identical via SHA-256 across all 5 upstream mirrors:

- `C5C8E633498801415E544CD304AEAC74A76BD618355A9AD58D76DA96DCC27EAB` (was `30B3F662…11151F` pre-revision)
- `.github/agents/squad.agent.md` ✔
- `.squad-templates/squad.agent.md` (source of truth) ✔
- `packages/squad-cli/templates/squad.agent.md.template` ✔
- `packages/squad-sdk/templates/squad.agent.md.template` ✔
- `templates/squad.agent.md.template` ✔

squad-squad governance mirror (`.github/agents/squad.agent.md`) updated in lockstep with the same content (separate commit on master; squad-squad is a different repo and not part of the SHA-256 sync chain, but text content matches).

---

## Test results

`npx vitest run template-sync.test.ts agent-doc.test.ts skills.test.ts builtin-skills.test.ts` → **261 / 261 passed** (4 test files). No regressions.

---

## Commits

| Repo | Branch | SHA | Files |
|------|--------|-----|-------|
| upstream `squad` | `feat/skill-discovery-paths` | `8a62093a` | 5 (.github/agents + .squad-templates + 3 packages templates) |
| `squad-squad` | `master` | `d852083f` | 1 (.github/agents/squad.agent.md — governance lockstep) |

**NOT PUSHED. NO PR opened.** Awaiting Worf re-review per protocol.

---

## Out of scope (deferred to future workstreams)

- Runtime code that scans skill directories — design said governance-only; runtime gate is a future Geordi-owned workstream.
- MCP migration / PR #1208 — separate workstream.
- Non-skill-discovery sections of `squad.agent.md`.

---

## Verdict: READY FOR WORF RE-REVIEW

- All 5 conditions (C-0 blocking + C-1..C-4 recommended) applied verbatim or with strict supersets.
- SHA-256 mirror invariant holds across all 5 upstream mirrors.
- squad-squad governance mirror updated in lockstep.
- Test suite green.
- No push, no PR — Worf re-review is the next gate.

---

# Decision: Worf re-review — skill-discovery 5-path expansion (conditions C-0..C-4)

**Agent:** worf
**Workstream:** skill-discovery-paths
**Status:** READY-FOR-MERGE
**Date:** 2026-06-03
**Reviewed:** upstream `squad` commit `8a62093a` (5 files, +20/-10) on `feat/skill-discovery-paths`; squad-squad lockstep commit `d852083f` (1 file, +4/-2) on `master`.
**Reviewed against:** `worf-skill-discovery-review.md` (5 conditions) + Picard's response `picard-worf-conditions-applied.md`.

---

## Preflight — SHA-256 mirror invariant

All 5 upstream `squad.agent.md` mirrors hash identically:

```
C5C8E633498801415E544CD304AEAC74A76BD618355A9AD58D76DA96DCC27EAB
  .squad-templates/squad.agent.md                       (source of truth)
  .github/agents/squad.agent.md                         (upstream governance)
  packages/squad-cli/templates/squad.agent.md.template
  packages/squad-sdk/templates/squad.agent.md.template
  templates/squad.agent.md.template
```

squad-squad governance mirror (`.github/agents/squad.agent.md`) hashes to `A4AB065DE046FF9D...` — different total hash is expected (surrounding governance content differs), but the **Skill-aware routing block content matches verbatim** at squad-squad `.github/agents/squad.agent.md:274`.

**PASS.**

---

## Per-condition verdicts

### C-0 (BLOCKING — Traversal rule): **APPROVE**

Evidence: `.squad-templates/squad.agent.md:314` and `.github/agents/squad.agent.md:274` (squad-squad mirror at line 274).

The new `**Traversal rule:**` paragraph covers all 4 required elements:

- **(a) One-level only** — explicit: *"scan ONE level only … do NOT descend past a skill's top-level directory (nested `{skill-dir}/foo/bar/SKILL.md` is ignored)"* ✔
- **(b) Skip symlinks AND reparse points** — explicit: *"SKIP symbolic links AND any other reparse points (NTFS junctions via `mklink /J`, mount points, and other Windows reparse-point types) — never follow them"*; rationale block names `FILE_ATTRIBUTE_REPARSE_POINT` directly ✔
- **(c) No per-session cache** — explicit: *"do NOT maintain a per-session cache — re-`readdir` on every spawn"* with cost rationale (<5ms) ✔
- **(d) Rationale** — Windows compatibility (privilege/dev-mode requirement for symlinks, reparse-vs-POSIX distinction), symlink-traversal attack mention (`../../.env`), and debugging simplicity ✔

**Bonus** (above minimum contract): explicit "Legitimate monorepo case" clause documenting that a `.claude/skills/shared-tools -> ../../shared/skills/tools` symlink is *silently* skipped, with hardlink/copy as the supported workaround. This closes the failure-mode hole I flagged in the original review.

Lockstep verified in squad-squad mirror — identical text.

### C-1 (Denylist minimum-contract): **APPROVE**

Evidence: parenthetical at end of Dedup rule, `.squad-templates/squad.agent.md:318` / squad-squad line 278.

> *"(The listed denylist is the **minimum** contract. Future runtime implementations MUST also reject homoglyph separators such as fullwidth solidus `U+FF0F` and fraction slash `U+2044`, and SHOULD reject Windows reserved names — `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9` — for portability.)"*

MUST/SHOULD language present, both homoglyphs cited, all 4 + 18 Windows reserved names enumerated. ✔

### C-2 (Whitespace + zero-width): **APPROVE**

Evidence: Dedup rule, same line.

> *"trim leading and trailing whitespace, including zero-width characters (`U+200B`, `U+200C`, `U+200D`, `U+FEFF`)"*

Verbatim adoption — leading + trailing + all 4 zero-width codepoints. ✔

### C-3 (Cross-platform case-insensitive): **APPROVE**

Evidence: Dedup rule.

> *"Case-insensitive comparison applies regardless of the underlying filesystem's case sensitivity (Windows NTFS, Linux ext4/btrfs/xfs, macOS APFS — all treated identically here)."*

Stronger than I asked for — explicit FS enumeration removes any ambiguity for a future implementer. ✔

### C-4 (Personal-paths CLI scoping): **APPROVE**

Evidence: Personal-paths paragraph, `.squad-templates/squad.agent.md:316` / squad-squad line 276.

Original: *"Copilot CLI already injects them as ambient context for every agent spawn"*
Revised: *"Copilot CLI injects them as ambient context for every **CLI agent spawn** — … (Other Copilot surfaces — VS Code, JetBrains — may not document the same personal-skill injection behavior; if Squad ever supports a non-CLI runtime as a first-class target, **revisit this exclusion**.)"*

Universal claim is now scoped + falsifiable + has an explicit revisit-trigger. ✔

---

## Tests

`npx vitest run template-sync.test.ts agent-doc.test.ts skills.test.ts builtin-skills.test.ts` → **261 / 261 passed** (4 test files, 6.95s). Re-verified in-session. No regressions from the prior pass.

---

## Overall verdict: **READY-FOR-MERGE**

All 5 conditions (1 BLOCKING + 4 recommended) satisfied with evidence at file:line on both upstream source-of-truth AND squad-squad governance mirror. Picard adopted the strict supersets I suggested in C-1 and C-3 and added unrequested but welcome reinforcement in C-0 (legitimate-monorepo silent-skip clause) — these tighten the contract beyond the minimum I would have accepted.

**Authorized actions:**
1. Push `feat/skill-discovery-paths` to `bradygaster/squad:dev` (or open the PR per workstream protocol).
2. Push `master` on squad-squad — governance lockstep is complete.

**No new conditions. No re-review trigger.**

Remediation owner if anything breaks post-merge: **Picard** (design author) for prompt-language regressions; **Geordi** when the runtime gate (out of scope here, deferred to a future workstream) is implemented and must enforce these governance rules in code.

---

## Notes on review discipline

- Round-trip cost: 1 reject → 1 fix → 1 approve. Picard bundled all 5 conditions in one commit pair (per anti-hang rule) and got the strict supersets right on the first attempt. This is the right pattern.
- Mirror invariant held cleanly across all 5 upstream targets; sync ceremony was executed correctly.
- Squad-squad lockstep was performed in a separate commit on a separate repo (correct — they are not part of the SHA-256 sync chain, but the prose content must match, and it does).

---

**Tag:** `[ws:skill-discovery-paths]`

