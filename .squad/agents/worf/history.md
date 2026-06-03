# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI security audit, credential handling, threat models, security conditions
- **Created:** 2026-06-02T10:45:00Z

## Worf — Core Mission

Worf (Security & Reliability Reviewer) owns security audits, threat modeling, credential handling verification, pre-existing vulnerability discovery, and implementation security gates. Security reviewer for Squad.Agents.AI auth expansion.

## 2026-06-02 — Squad.Agents.AI Auth Expansion Security Review (PASS_WITH_CONDITIONS)

**Review Verdict:** PASS_WITH_CONDITIONS (9 mandatory security conditions SC-1..SC-9)

**Key Findings:**
- **UseLoggedInUser:** ALLOWED with consent documentation (F-DOC-4 required).
- **Configure-Delegate Threat Model:** MEDIUM-HIGH risk (delegates receive fully-resolved tokens, can observe/exfiltrate). Mitigated by post-delegate validation + documentation.
- **Critical Conditions:** SC-1 (ToString() redaction for Provider + Environment tokens), SC-2 (JSON serialization safety), SC-3 (post-delegate logging for routing invariant changes), SC-4..SC-9 (docs + tests).

**🚨 PRE-EXISTING BUG (P0):** `SquadAgentOptions.Environment` NOT redacted by `ToString()` and lacks `[JsonIgnore]`. Any HMAC key or API token placed in Environment leaks via logging. **Must fix in same implementation pass (SC-1).**

**Lockout Status:** NOT locked out. PASS_WITH_CONDITIONS. Data may implement.

**Documentation Required:** 6 security docs (F-DOC-1..F-DOC-6) covering token handling, delegate security, BYOK keys, UseLoggedInUser consent, Environment dict warning, token precedence.

---

## 2026-06-02 — SC-1..SC-9 Conditions Pending Implementation

**Status:** Flagged for next round

The 9 mandatory security conditions (SC-1..SC-9) from the 2026-06-02 auth-extensibility security review remain pending implementation. Next round: when Data picks up auth expansion work (post-v0.1 release), SC-1..SC-9 must be implemented in the same pass. P0 pre-existing bug (`SquadAgentOptions.Environment` not redacted by `ToString()`) must be fixed alongside SC-1.

---

## Learnings

### PR #3 — Public-leak audit (2026-06-02)

**Finding Counts:**
- 🔴 SHIPPED IN .NUPKG: 0 (draft stage; no .csproj files in current PR)
- 🟠 PUBLIC ON GITHUB: 9 findings (4 in PR body, 5 in commits)
- 🟡 INSIDE PR BUT NOT PACKAGED: 0

**Most Critical Leaks (by file:line):**
1. **PR #3 body** — "Decisions 441, 443, 444, 447 — full Q1–Q7 design lock" (Design refs section)
2. **commit 8f2679db** — "Closes Track A of the Q1-Q7 design lock (see tamresearch1 .squad/decisions.md Decisions 441, 443, 444, 447)."
3. **PR #3 body** — "tamirdresher_microsoft/tamresearch1" (internal repo reference)

**Leaked Metadata:**
- Internal Decision numbers (441, 443, 444, 447, 452a, 602)
- Internal terminology ("Q1-Q7 design lock", "Track A", "Q-lock")
- Internal repo reference ("tamresearch1")
- `.squad/` path references in commit messages

**Remediation (Priority Order):**
1. **IMMEDIATE:** Edit PR #3 body via `gh pr edit` to replace Decision references and "Q1-Q7 design lock" with neutral language ("design review identified X and Y constraints").
2. **RECOMMENDED:** Consider interactive rebase + force-push to scrub commit messages (5 commits) before merge, if acceptable to Tamir.
3. **BACKLOG:** Add GitHub Actions pre-commit hook to block future PRs with regex matching `.squad|Decision \d+|Q\d-Q\d|Track [AB]|design lock|tamresearch`.

**Visibility:** Every public viewer of PR #3 and the branch history sees these leaks. Not yet shipped in any NuGet (draft stage).

**Full Report:** `.squad/decisions/inbox/worf-pr3-public-leak-audit.md`  
**Package Verdict:** `.squad/decisions/inbox/worf-pr3-URGENT-nupkg-leak.md` (GREEN — no shipped artifacts)

### Workstreams security review — multi-session credential surface (2026-06-02)

**Verdict:** PASS_WITH_CONDITIONS (9 binding conditions SC-Wn.1..SC-Wn.12, 5 advisory recommendations)  
**Workstream:** workstreams-design (cross-cutting)

**Top 2 conditions:**
1. **SC-Wn.9 (HIGH):** Scribe MUST validate inbox file `workstream:` frontmatter matches `SESSION_WORKSTREAM` and MUST construct inbox paths from `WORKSTREAM_PATH` — never glob across workstreams. Without this, a Scribe glob bug silently consumes another workstream's inbox and misattributes decisions.
2. **SC-Wn.5 (MEDIUM):** Scribe MUST validate staged files before commit — warn and unstage files outside the active workstream subtree. A manual `git add` by the developer can silently cross-contaminate a scoped commit.

**Worst threat caught:** SC-Wn.9 — Scribe cross-workstream inbox mis-routing. If Scribe globs `active/*/decisions/inbox/*.md` instead of using the explicit `WORKSTREAM_PATH`, it silently consumes ALL workstreams' inboxes, deletes the source files, and misattributes every decision to the wrong workstream. This is a silent data-integrity corruption with no recovery path short of git history forensics.

**Full Report:** `.squad/decisions/inbox/worf-workstreams-security-review.md`

---

## 2026-06-02T21:10:16.324+03:00 — Skill Discovery Design Review (APPROVED WITH RECOMMENDATIONS)

**Workstream:** [ws:skill-discovery-paths]  
**Reviewed:** Picard's skill-discovery precedence design (Decisions 1–5)

**Verdict:** APPROVED WITH RECOMMENDATIONS (3 non-blocking recommendations)

**Security Review Findings:**
- **Symlink-skip rationale:** Sound. Windows compatibility + traversal prevention justified. Hardlink alternative suitable for monorepo scenarios.
- **Path traversal safety:** Safe by design (readdir on fixed paths). Gap: no Unicode normalization rule specified. **R-1 (MEDIUM):** Implement NFC normalization + whitespace trim + explicit denylist of control/separator chars.
- **Personal-skill exclusion:** Correct. Prevents duplication with CLI ambient loading; respects team-visible boundary; ensures cross-machine reproducibility.
- **Dedup correctness:** Well-specified. All edge cases (3+ paths, race conditions, case mismatches) correctly handled.
- **Implementation surface:** 4 files / 6 edit sites identified correctly. Gap: no test/CI gate for 5-path precedence. **R-3 (MEDIUM):** Add test verifying precedence order, dedup, symlink handling.

**Recommendations (3 total):**
1. **R-1 (MEDIUM):** Unicode normalization (NFC) + whitespace trim + control-char denylist in directory-name handling.
2. **R-2 (LOW):** Document hardlinks as monorepo alternative in code comments.
3. **R-3 (MEDIUM):** Add test/CI gate for 5-path precedence + dedup correctness.

**Design Framing:** Picard applied defense-in-depth (fixed paths, no symlinks, explicit precedence, no cache), avoiding trap of premature optimization. Personal-skill exclusion correctly scopes to team reproducibility boundary.

**Implementation:** Design is ready for Data. Recommendations are not blockers; Data should incorporate R-1 + R-3 in same pass, R-2 as concurrent doc update.

**Full Report:** `.squad/workstreams/active/skill-discovery-paths/decisions/inbox/worf-skill-discovery-review.md`

---
**Last Updated:** 2026-06-02T21:10:16.324+03:00  
**Archive:** `.squad/agents/worf/history-archive.md` (detailed security review)

## Learnings — MCP merge helper review (2026-06-02T23:18:09+03:00)

**Subject:** `feat/mcp-json-migration` branch, Phase 2 (`migrate-mcp-config.ts` + dual-write in `init.ts`).

**Verdict:** APPROVE WITH CONDITIONS. All three Picard gates (atomicity / conflict resolution / failure mode) pass on cited evidence. Two conditions handed to Geordi:
- A (required): wrap `ensureMcpServerPinned` call in `init.ts:1340–1361` in try/catch so EACCES/EROFS on legacy file doesn't crash `squad init`.
- B (recommended): add `JSON.parse(serialized)` belt-and-braces in `atomicWriteJson` per Seven §"Recommendation 2".

**Certified:**
- Temp-then-rename pattern in `atomicWriteJson` (same-dir → same-volume → atomic on POSIX + Windows MoveFileEx).
- Helper never writes the legacy file → Picard constraint 3 satisfied by construction, not just by convention.
- `parseJsonFile` round-trip + non-object guard at line 324–335 closes Seven §(c) silent-fallback hazard at the input boundary.
- Conflict policy (warn + keep target) covered by tests at `test/upgrade-mcp-merge.test.ts:96–125` for both equivalent and non-equivalent branches.

**Flagged (non-blocking):**
- No `fsync` before rename. Accepted (standard CLI tradeoff: npm, yarn, pnpm do the same). Document and move on.
- Conflict path returns `status: 'no-op'` + warn rather than non-zero exit (Seven asked for non-zero). Picard's gate didn't require it; accepted with note that wrapped/non-interactive callers might miss the warning.
- `force: true` codepath silently drops malformed workspace state — unreachable from current `runUpgrade` (no `--force` plumbed). Out of scope, but flagged if `--force` is ever added.

**Reusable pattern extracted:** "Atomic JSON Write Checklist" → `.squad/skills/atomic-json-write-checklist/SKILL.md`. This pattern recurs across init/upgrade/state-machinery — codify once.

**Rejection-lockout reassignment:** Data wrote the helper and the integration site; both conditions touch `init.ts`. Handed to Geordi (platform/systems) to keep reviewer/author separation clean even though no part of Data's helper was itself rejected.

**Full Report:** `.squad/decisions/inbox/worf-mcp-merge-helper-review.md`

---

## 2026-06-03T03:50:00Z — PR #1208 Opened on bradygaster/squad (MCP Migration Conditions Applied)

**Coordinator action:** PR #1208 on bradygaster/squad (feat/mcp-json-migration → main) opened after Geordi verified both Worf conditions applied + all tests pass (29/30, 1 Windows-expected skip).

**Conditions Applied:**
- **Condition A (required):** EACCES/EROFS handling wrapped in try/catch at init.ts:1340–1361 (legacy `.copilot/mcp-config.json` permissions edge-case on Windows)
- **Condition B (recommended):** Round-trip `JSON.parse(serialized)` validation added to `atomicWriteJson` before final rename (defense-in-depth per Seven's recommendation)

**Verification by Geordi:**
- All 29 core tests pass (1 Windows-specific POSIX file permission test skipped as expected)
- Edge-case tests for equivalent/non-equivalent merge paths pass
- Atomic write pattern confirmed correct (temp-then-rename on same-dir/same-volume)
- No silent config drops (parseJsonFile round-trip + non-object guard closed silent-fallback hazard)

**Worf Sequencing Lesson:** Merge helper review executed correctly — all Picard gates (atomicity / conflict resolution / crash recovery) verified with cited evidence. Two conditions handed to Geordi (platform/systems) per reviewer/author separation. Conditions applied without modification to core helper logic. Phase 1 (commit 892b2da2) and Phase 2 (4 commits) shipped clean.

**Awaiting:** Upstream maintainer merge on bradygaster/squad (PR #1208)
