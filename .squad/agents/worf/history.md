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

## Learnings — 2026-06-03 [ws:skill-discovery-paths]

**Reviewing governance-only (prompt-based) safety rules vs runtime-enforced rules:**
- When a "rule" lives only in an LLM prompt and has no runtime gate, treat the prompt as a *specification for a future enforcer*, not as enforcement itself. Reject if the spec is too vague for a careful implementer to ship a correct gate from it.
- Always grep the SHIPPED artifact, not the design doc, for the safety rule. Designs frequently contain rationale that never makes it into the deployed prompt — and the gap is invisible without a literal grep. In this review, Picard's Decision 3 (symlinks/one-level/no-cache) was in `decisions.md` but ZERO lines of it survived into `squad.agent.md`. The byte-identical mirror SHA-256 check tells you mirrors are in sync; it does NOT tell you the right content is in them.
- The mirror-invariant test (SHA-256 across `.squad-templates/` + 4 mirrors) is a strong reliability control — recommend it as a pattern for any repo with intentional content duplication.

**Reusable security checklist for skill-directory scanners (governance OR runtime):**
1. Path-component denylist: NUL bytes, C0 controls (`\x00-\x1F`), DEL (`\x7F`), POSIX `/`, Windows `\`, parent-dir `..`.
2. Homoglyph hardening: also reject fullwidth solidus `U+FF0F`, fraction slash `U+2044`, and other Unicode characters that NFC will NOT collapse to ASCII separators. NFKC would catch them but causes false-positive dedups — prefer explicit denylist over normalization-form swap.
3. Reparse-point handling: "no symlinks" is insufficient on Windows. Must also reject NTFS junctions (`mklink /J`) and other reparse points. Use `FILE_ATTRIBUTE_REPARSE_POINT` check, not just `IsSymbolicLink`.
4. Traversal depth: explicitly state max depth (one level for skill dirs). LLMs without an explicit depth limit may go arbitrarily deep.
5. Whitespace trim: leading AND trailing, plus zero-width chars (ZWSP `U+200B`, ZWNJ `U+200C`, ZWJ `U+200D`, BOM `U+FEFF`).
6. Case normalization: pick consistent cross-platform behavior; document it; warn on case-mismatch dedup so the user can observe it.
7. Windows reserved names: `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9` — reject for cross-platform portability even on Linux.
8. Personal-vs-project scope: if claiming "X already injects personal context for free," scope the claim to the specific runtime surface (CLI vs IDE plugin vs web).

**Reviewer Rejection Lockout discipline:** When the original implementer (Data) shipped per Picard's design but the design itself had a documented-but-unshipped rule, the right remediation owner is the *design author* (Picard), not the implementer. Don't punish the implementer for faithfully porting an incomplete spec.


## Learnings — 2026-06-03 re-review of skill-discovery-paths (C-0..C-4)

**Round-trip:** 1 reject → 1 fix-bundle → 1 approve. Clean. Picard bundled all 5 conditions in a single commit pair per anti-hang rule, which is the pattern future reviewers should expect (and reject if violated — incremental drip-fixes burn re-review budget).

**Did Picard's fix close the C-0 gap cleanly?** Yes — and slightly better than asked. The original BLOCKING gap was that Decision 3 from decisions.md:236-250 was missing from the shipped prompt. Picard ported it verbatim AND added two unrequested-but-welcome reinforcements: (1) explicit `FILE_ATTRIBUTE_REPARSE_POINT` callout in the rationale (I asked for "reparse points" — Picard named the Win32 attribute), (2) "Legitimate monorepo case" clause documenting the silent-skip failure mode with the hardlink workaround. Lesson: when the original designer owns the remediation (vs. a different agent), the prompt language tends to be tighter because they already internalized the constraint set during design.

**Lessons for future C-0 fixes:**

1. **Always require lockstep across BOTH source-of-truth AND governance mirror in a single response.** Picard did both (8a62093a upstream + d852083f squad-squad). If only one repo gets the fix, the next sync ceremony will silently revert it. Make this explicit in the original condition wording — I did, and Picard executed correctly.
2. **SHA-256 preflight is non-negotiable.** I verified all 5 upstream mirrors hash identically (C5C8E633…) before declaring approve. Without this, a partial sync could leave one template stale and the failure would only surface when a downstream consumer regenerates from the wrong source.
3. **squad-squad governance hash WILL differ from upstream** (different surrounding content) — verify the *block content* matches verbatim instead of the full-file hash. Grep for a distinctive phrase ("Traversal rule:") in the lockstep commit diff. I did this and it landed correctly.
4. **Strict-superset acceptance is fine.** Picard delivered stronger language than C-1 (added Windows reserved names enumeration) and C-3 (explicit FS enumeration). Don't down-grade an approve just because the fix exceeds the contract — only reject when the fix is *weaker* or *narrower* than asked.
5. **Tests as a sanity check, not a security check.** 261/261 passed — but tests cover sync invariants and structural correctness, not prompt semantics. The real verification is reading the prompt text and confirming each required element (a/b/c/d for C-0) is literally present. Don't let a green test suite substitute for prose review.
6. **Time-box held:** review completed well under the 20-min budget. The fix was clean enough that 80% of the time was spent verifying mirror invariants and tests, 20% reading the new prose. When fixes are sloppy, ratio flips — and that itself is a signal worth surfacing in the verdict.

**One thing I'd do differently:** my original C-0 wording said "skip symlinks and other reparse points". Picard interpreted this correctly, but a less careful author might have shipped just "skip symlinks" (POSIX-only) and missed the NTFS junction case. Next time, name the Win32 attribute (`FILE_ATTRIBUTE_REPARSE_POINT`) directly in the condition itself rather than only in the rationale. Reduces interpretation surface.

---

### 2026-06-03T03:55:03Z — Skill-Discovery-Paths: Gate 2 RE-REVIEW — APPROVED (C-0..C-4 VERIFIED) [ws:skill-discovery-paths]

**Status:** ✅ READY-FOR-MERGE — No new conditions. PR push authorized.

**Task:** Re-review Picard's remediation for C-0 BLOCKING + C-1..C-4 conditions (symlink-skip + Decision 3 traversal rule + Unicode hardening + dedup + tests).

**Executed:** Commit `8a62093a` (upstream) + `d852083f` (squad-squad lockstep). All 261 tests pass. SHA-256 mirror invariant verified across all 5 upstream mirrors.

**Verdict:** ✅ **APPROVED — NO NEW CONDITIONS.** All 5 conditions verified satisfied:
- **C-0 BLOCKING:** Traversal rule paragraph present, all 4 elements shipped (one-level depth, skip symlinks + reparse points, no cache, rationale with legitimate-monorepo clause). Bonus: FILE_ATTRIBUTE_REPARSE_POINT named explicitly.
- **C-1..C-4:** Recommended conditions adopted verbatim or strict supersets. Unicode normalization, dedup, Windows reserved names, personal-path exclusion all present.

**Round-trip pattern:** 1 reject → 1 bundled fix (all 5 conditions in one commit pair per anti-hang rule) → 1 approve. Clean handoff from Data → Picard → Worf re-review. Picard's execution was precise; language is tighter when design author owns remediation.

**Lesson:** Mirror SHA-256 invariant verification is non-negotiable before declare-approve. Block content must match verbatim across lockstep repos (grep for distinctive phrase). Tests = sanity check, not security check — always prose-review the actual shipped prompt text to confirm each required element is literally present.

