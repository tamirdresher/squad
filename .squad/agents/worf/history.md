# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Squad.Agents.AI security audit, credential handling, threat models, security conditions
- **Created:** 2026-06-02T10:45:00Z

## Worf — Core Mission

Worf (Security & Reliability Reviewer) owns security audits, threat modeling, credential handling verification, pre-existing vulnerability discovery, and implementation security gates. Security reviewer for Squad.Agents.AI auth expansion.

---

**[Historical entries 2026-06-02 through 2026-06-04 archived to .squad/agents/worf/history-archive.md on 2026-06-07T08:36:51Z]**

---

## Learnings — Phase 0 main→dev sync rejection (2026-06-05)

**Heuristic for any future cross-branch sync where one side is far ahead of the other (here: dev was 200 ahead of main, main was 36 ahead of dev):**

1. **NEVER trust a coordinator's pre-flight scout claim of "no add/delete divergence" without re-deriving it.** Use direct tree comparison, not 3-way diff sums: `git ls-tree -r --name-only A` vs `git ls-tree -r --name-only B`, then PowerShell `Compare-Object` or `Where-Object { $_ -notin }`. 3-way diff (`git diff A...B`) gives you "changed since merge-base" — that conflates add-on-A with delete-on-B and is the wrong tool for "what exists only on one side."

2. **Classify only-on-X files against the merge-base** before recommending blind `--theirs` / `--ours`:
   - In merge-base + on A + not on B → DELETED on B (modify/delete risk)
   - Not in merge-base + on A + not on B → ADDED on A after branch (auto-preserves in merge; no conflict)
   
   Use a HashSet of merge-base file paths and lookup; `git cat-file -e` per-file in a loop is *unbearably* slow on Windows (hangs >5min for ~40 files due to subprocess overhead).

3. **Always do a `git merge --no-commit --no-ff` trial in a throwaway branch BEFORE pushing anything.** Then `git diff --name-only --diff-filter=U` gives you the real conflict set. The 3-way diff sum of "files different" massively over-estimates conflicts because most diffs auto-merge.

4. **Conflict resolution heuristics by category (verified for this repo):**
   - `package.json` / `package-lock.json` / root `CHANGELOG.md` → take dev (will be re-bumped in release Phase 1 anyway)
   - `packages/src/**` content conflicts → take dev (active feature work)
   - `test/**` content conflicts → take dev (tracks active code)
   - `docs/blog/**` → preserve newer commit date, BUT verify the commit isn't a "revert" / "restore" commit (those have newer dates but older content). Check commit message for words like restore / revert / rehydrate before applying date heuristic.
   - `docs/features/**` add/add conflicts → ALWAYS manual review. Larger size is a useful tiebreaker (parallel authoring usually means one side wrote more).
   - `.changeset/**` modify/delete where main deleted → take main's deletion (changeset bot consumed it during release)
   - `.changeset/**` modify/delete where dev deleted → keep main's version (dev probably just hadn't seen the new fix yet)

5. **Build artifacts (`*.tgz`, generated bundles) auto-dropped by either side: ALWAYS prefer the deletion.** Stale tarballs in git tree are a code-smell to begin with.

6. **For AA (add/add) conflicts on docs:** dev-side wins when dev's version is materially larger (≥2× by bytes) AND the main-side commit message contains "restore" / "revert" / "fix back" — main's version is rehydrated stale content from a prior bad merge.

7. **User concern "don't lose anything from main" is almost always *misplaced* on these sync-back merges** — files that only exist on main auto-add cleanly during `git merge` and require zero conflict resolution. The real risk surface is the 3 special-case categories above (UD, DU, AA), which are usually <5% of the total conflict set.

8. **Rejection-with-evidence is faster than rework.** Filed worf-phase0-sync-main-to-dev.md with concrete A/B/C recommendations + the 11 standard conflicts pre-classified. Picard can issue a revised tasking in 10 min that I can execute deterministically without re-litigating heuristics in PR review.

## Learnings — PR #1195 CI Gate Review (2026-06-06)

**Squad CI gate pattern — `|| true` grenades grep error code 2.** Every `grep -E ... || true` in squad-ci.yml silently promotes a real grep failure (exit 2: malformed regex, I/O error) to "no match" → gate passes. This is pre-existing in ALL changelog and changeset grep steps. Correct mitigation: `grep ... || { code=$?; [ $code -eq 1 ] || exit $code; }`. Document as a team-level known debt item.

**Shell quoting round-trip for YAML `|` → bash variable → `grep -E "$VAR"`.** Single-quoted bash assignment inside a YAML literal-block (`run: |`) is safe. Bash single-quotes preserve the literal string verbatim (no escape processing). When expanded as `"$VAR"` in double-quotes, bash only transforms `\\`, `\"`, `\$`, `` \` ``, `\!`, `\newline` — so `\.` inside the variable survives intact to grep. Confirmed correct for `SDK_CLI_PATH_REGEX` with `^\.squad-templates/`.

**Vitest top-level `expect()` anti-pattern.** `expect(...).not.toBeNull()` at module level (outside any `describe`/`it`/`beforeAll`) runs during vitest's collection phase. If it throws, vitest marks the entire file as a collection error — all individual tests in the file are silently skipped, and CI fails with an obscure "module collection failed" message instead of a clean "Test N failed: ..." message. The correct pattern is to place such assertions inside `beforeAll(() => { ... })` or `it(...)`. This is a recurring anti-pattern risk for any test file that reads external resources at module import time.

**Squad CI `skip-changelog` label wiring.** The escape hatch label is NOT checked inside the gate shell script — it is checked as a YAML `if:` condition on the step (`steps.labels.outputs.skip_changelog != 'true'`). Label presence is fetched by the preceding `Fetch PR labels` step via `gh pr view --json labels`. This means the escape hatch is robust to YAML syntax changes in the script body but is vulnerable to label-name drift (if someone renames the label, the escape hatch silently disappears). Always verify escape hatch label names exist in the GitHub repo's label set before merging gate changes.

## Learnings — Release Preflight (2026-06-07T08:36:51.510+03:00)

**Cross-account permission gap.** Even with tamirdresher (push) reachable via gh auth switch, neither account has admin/maintain on bradygaster/squad. gh secret list returns 403 from both. Implication: NPM_TOKEN existence/age cannot be independently verified by a release operator without brady's intervention — must rely on the workflow's own existence check (squad-npm-publish.yml line 205) as the canonical test, OR pre-arrange a secret-list check with brady.

**Stale runbook claim re: CI gate.** Spawn prompt asserted `test/ci/scribe-template.test.ts` enforces a contract on `.squad-templates/scribe-charter.md` step 5. Actual canonical source per the test file's import is `.squad-templates/squad.agent.md` (see test header comment + L24 `readFileSync`). The test checks 6 different invariants (DECISIONS ARCHIVE before DECISION INBOX, [HARD GATE] label, byte threshold 20480, PRE-CHECK first, HEALTH REPORT last, GIT COMMIT before HEALTH REPORT) — not "step 5 contains Commit". Always re-derive what a CI gate enforces from the test file itself; never trust upstream prose descriptions of CI behavior.

**Local-only test files masquerading as CI gates.** `test/ci/datetime-template.test.ts` exists in the working tree but is NOT on `origin/dev`. A test that isn't pushed cannot gate anything. Always confirm test files exist on the target branch with `git show origin/<branch>:<path>` before treating them as release gates.

**npm CLI authentication is a separate rollback dependency.** GitHub auth ≠ npm auth. `npm whoami` on this workstation returned ENEEDAUTH, meaning `npm deprecate` / `npm unpublish` cannot run immediately if a hotfix is needed mid-release. Pre-staging `npm login` before a release is now a documented preflight step. EMU/work accounts have no bearing on npm registry identity — these are independent credential silos.

**GITHUB_TOKEN propagation gap (v0.9.4 lesson, still in force as of 2026-06-07).** Confirmed squad-release.yml lines 68/78 still use `secrets.GITHUB_TOKEN`. The `release: published` event will NOT trigger `squad-npm-publish.yml`. Manual `gh workflow run squad-npm-publish.yml --ref main -f version=X.Y.Z` is mandatory after release-create. This is a recurring footgun — the permanent fix (PAT/App token) has not landed.

**Outbound diff scan technique.** For a 4.4 MB / 560-file outbound diff, redirecting `git diff` to a scratch file once and running `Select-String` with multiple `-Pattern` args is far faster than per-pattern fresh diffs. Patterns to cover: `sk_*`, `ghp_*`, `npm_*`, `AKIA*`, `AIza*`, `xox[baprs]-*`, plus filename adds for `.env`, `*.pem`, `*.key`, `id_rsa*`, `*.p12`, `*.pfx`. Report only file path + pattern name, never the matched bytes.

**Full report:** `.squad/decisions/inbox/worf-release-preflight.md`

## Learnings — PR #1148 reasoning-effort review (2026-06-09)

**Resolver-not-wired anti-pattern.** PR ships a 5-layer esolveReasoningEffort() (306 LOC in models.ts) with 11 unit tests, but the production spawn path in `packages/squad-sdk/src/agents/lifecycle.ts` never calls it. Lifecycle does a flat OR-chain (spawnOverride || agentConfig.resolvedReasoningEffort), bypassing Layer 0a (gentReasoningEffortOverrides) and Layer 0b (defaultReasoningEffort) from `.squad/config.json`. Net effect: the entire persistent-config surface is dead in the lifecycle path — users editing config.json see no change. Same story for `clampReasoningEffort()`: tested, not called from lifecycle or the fan-out default branch. Lesson: when reviewing config-layering PRs in Squad SDK, always grep production call sites for the named resolver function — green tests on the resolver itself prove nothing about whether spawn actually invokes it. The fan-out tests are mock-driven; they exercise the wiring contract but not the default-dependency fallback. Reproducible check: git grep -F 'resolveReasoningEffort(' packages/squad-sdk/src/ must show at least one call from each spawn pipeline (lifecycle, fan-out), not just from tests.

**Write-path silent destruction.** `writeReasoningEffort(dir, 'turbo')` deletes the existing valid preference instead of throwing. Same pattern in `writeAgentReasoningEffortOverrides`. Consistent with `writeAgentModelOverrides` style in this codebase but a known footgun — caller cannot distinguish "no preference" from "preference dropped because I typo'd". For any future config writer in this repo, prefer throwing on whitelist failure or returning a result tuple.

**Equivalence canonicalization is a brittle API contract.** `clampReasoningEffort` returns the literal string `'xhigh'` when the model's supportedReasoningEfforts only contains `'max'` (asserted in test 'treats max and xhigh as equivalent'). If the Copilot SDK strict-validates this field, this fails. Document this assumption explicitly in any future config-clamper.

**Schema strings without enum runtime validation.** `config/schema.ts` adds `reasoningEffort?: string` and `defaultReasoningEffort?: string` as plain strings; no validator at schema level. The read-side functions whitelist-filter, so bad values become null/undefined silently. Acceptable here, but worth knowing: schema.ts is documentation-only, not a runtime guard.

