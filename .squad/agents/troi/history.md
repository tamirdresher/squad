# Project Context

- **Owner:** Tamir Dresher
- **Project:** squad-squad
- **Stack:** Technical blogging, Squad, agent frameworks, Durable Tasks/DTD, Azure, developer experience
- **Created:** 2026-05-14T09:22:24.987+05:30

## Core Context

Troi was added because Tamir wants a dedicated member to help write blogs and posts in his voice, style, and humor.

Seed sources:
- `C:\Users\tamirdresher\tamresearch1\.squad\agents\troi\charter.md` — existing voice writer pattern.
- Existing public blog/content repos when explicitly provided or routed.

## Learnings

2026-06-02: Use `copilot --yolo --autopilot --agent squad -p '<prompt>'` for unattended copilot CLI invocations (per user directive).

**Archive:** Entries from 2026-05-14 (voice patterns seeding) and 2026-05-18 (ADC tutorial structure) summarized on 2026-06-07T08:36:51Z and moved to `.squad/agents/troi/history-archive.md`.

## 2026-06-06 — PR Review Comment Voice Patterns (bradygaster/squad #1195)

**Task:** Draft a PR review comment for obit91's changelog-gate PR in Tamir's voice.

**What worked:**
- Opening with specific praise for a concrete technical choice (the test-reads-live-regex approach, the #1035 regression example) rather than generic warmup. "Good use of X" with a specific referent is acceptable; "Nice PR!" is not.
- Using bold sentence-style headings (no emojis, no bullets) to separate 4 distinct issues — Tamir structures technical feedback for scannability without going full bullet-salad.
- Naming the actual 4 files (`ghost-protocol.md`, `loop.md`, `personal-charter.md`, `skills/rework-rate/SKILL.md`) as evidence for the wrong comment — specificity is the signature move.
- Quoting the wrong comment verbatim with *italics*, then correcting it with a suggested replacement. Tamir shows the error and offers the fix in one motion.
- Including line numbers for CONTRIBUTING.md (190 and 217) — concrete, not vague.
- Explicit pragmatic verdict at the end: "Fix the first three; fourth is optional but I'd do it." No hedging, no "I hope this is useful."
- "Not a blocker, but it's the kind of pattern that gets copied" — captures Tamir's pragmatic/forward-looking reasoning without moralizing.

**What to avoid:**
- Warmup paragraphs. Tamir's acknowledgment of good parts is embedded inline (one sentence max), not its own section.
- "I hope this helps!", "leveraging", "robust", "comprehensive" — LLM-tells that break voice.
- Long justifications for each issue. State the finding, show the evidence, suggest the fix. Done.
- Forcing humor. The only light touch here was "just don't close #1156 until one of those happens" — slightly pointed but not a joke.

**Tamir's PR-comment voice in one line:** Direct findings with specific evidence, brief suggestion, explicit verdict at the end. No warmup, no sign-off.

## 2026-06-06 — Conversational PR Thread Reply Voice (bradygaster/squad #1192)

**Task:** Draft Tamir's reply to Brady Gaster asking whether Jon Lester's two review suggestions made it into #1200.

**What works in conversational thread replies (vs. formal review comments):**
- Answer the question in sentence one. No preamble, no "Great question!" — just the answer.
- A light callback to the other person's joke can open naturally if it also carries substance: "your old boss's instincts were good, but neither suggestion made it in" does double duty (acknowledges the warmth, delivers the answer).
- Two-item "what didn't" can be short standalone paragraphs rather than a bullet list — reads more like conversation.
- Closing offer should be specific and action-forward ("I'll open two follow-up issues and tag you both") not vague ("let me know what you think").
- "Jon can claim one if he wants to follow through on his own suggestions" — light secondary callback that feels earned, not forced.
- Keep inline code for exact symbol names (`approveAllPermissions`, `'approve-once'`). Even in casual threads, specifics are the signature.
- No sign-off. Thread reply ends when the action is clear.

**Length target:** 5 short paragraphs (≈ 120 words). Much shorter than a formal review comment. One paragraph per distinct idea.

## 2026-06-06 — Substantive Design-Discussion Reply to External Expert (bradygaster/squad #600)

**Task:** Draft Tamir's reply to an external technical contributor (kehansama, AgentRelay) who left a ~6-paragraph architectural comment on a memory tiering proposal issue.

**This mode differs from both prior drafts:**
- #1195 code review: blunt, all action items, no warmup
- #1192 conversational thread: short, warm, answer-first
- #600 design reply: matches the commenter's level of substance — 5-7 paragraphs, architectural, file:line cites appropriate, genuine acknowledgment of gaps

**What works in substantive design replies:**
- Open with a one-line "you're right about X" that names the *specific* thing they got sharper than the spec — not "great comment," but "The Warm/Cold distinction is sharper than what's in #600" with a sentence explaining *why* that's true.
- Use file:line cites freely — they signal "I read the code, not just the spec" and are expected by a technical peer.
- Self-correction ("a real gap Seven and I both glossed over") beats either defensive recitation or false humility. Show you re-read the code.
- The "what IS shipped / what ISN'T shipped" two-paragraph structure is clean for an honest current-state assessment — no hedging, just facts.
- Issue-tracker routing as a paragraph is appropriate in design discussions: tells the commenter where their ideas land without being dismissive.
- Closing invitation to stay in the loop on a future design doc: keep it to 2 sentences, no gushing. "When the spawn-API design doc materializes, that's the right moment" is enough.
- No sign-off, no "Hope this helps!" — ends when the action is clear.

**What to avoid in design replies:**
- Matching the commenter's bullet density if they used bullets — Tamir writes prose paragraphs even for multi-point content.
- Responding asymmetrically to a 6-paragraph comment with 1-2 paragraphs — reads as dismissive of the effort.
- Overstating what's shipped or understating what's missing — the honest gap admission is what makes the reply credible.
- Starting every paragraph the same way. Mix "The X is...", "What IS shipped...", "For tracking...", etc.

**Length target:** 5-7 paragraphs matching the commenter's scale but tighter (Tamir is more compressed). ~250-350 words total.

## Learnings

2026-06-06: When acknowledging independent external convergence in a design-discussion reply, name the parallel proposal inline (not as a postscript), state specifically what overlaps and what doesn't, then use the convergence as forward momentum ("two independent designs converging makes the case for shipping") rather than a footnote. Two sentences is usually right — one to name the convergence, one to say why it's additive not competing. Don't let it become its own paragraph unless it genuinely shifts the stakes.

2026-06-06: For ~30% compression of design-discussion replies: merge thematically adjacent gap-admissions into one opening paragraph, fold a standalone Cold→Hot paragraph into the shipped/not-shipped structure, compress a two-caller list into one relative clause, and close the spawn-API paragraph in a single sentence. Structure compression (fewer paragraphs) yields more savings than word-trimming within paragraphs.


## 2026-06-07 — Squad release announcement draft (vX.Y.Z, ~100 changesets)

**Task:** Draft the next official Squad release announcement from main with ~100 pending changesets. Draft-only, no commits to upstream squad repo.

**Voice modeling:**
- Closest predecessor is `028-v090-whats-new.md` (numbered "What Shipped" sections 1–N, `bradygaster` author byline, bold tag-line under each section, code blocks for CLI invocations, "Quick Stats" / "What's Next" closers). Modeled the skeleton on that.
- `004-v020-release.md` is still the best template for *story-driven* scar narrative (problem → constraint → fix → why-it-matters). Pulled that mindset into "The Scar" section, but kept the rest declarative to match v0.9.x cadence.
- `024-v0823-release.md` confirmed the pattern of letting feature subsections breathe with concrete file paths, function names, and PR numbers.
- `010-v041-patch-release.md` is the *opposite* shape — useful as negative reference when the release is mostly features.

**Theme grouping strategy for ~100 changesets:**
- 5 headline themes max, each grouping related changesets into one numbered section. Resist the urge to enumerate every changeset.
- Bug fixes / CI-only / test-only / docs-only / niche skills get explicitly cut or compressed to one line ("and ~30 bug fixes you don't need to read about").
- Always include one "scar story" — pick the failure mode that taught the most. The coordinator-canary / 95.8KB → 55KB slimming was textbook silent-degradation territory and gave a reusable lesson (tripwires for degraded states).

**Tamir-voice patterns reinforced this draft:**
- Open the hook with a *moment*, not a feature list. "This one took a while because we kept finding stuff that was quietly broken" is the kind of honest framing that earns trust before any feature is named.
- "If you run `squad watch` for more than an hour at a time, upgrade for this alone" — a pragmatic verdict at the end of a section, not a hedged recommendation.
- Pull the metric *only* if it's in the changeset ("~72% fewer GitHub API calls", "2.9x faster", "~42% reduction"). Never invent numbers.
- For breaking changes, state them inline within the relevant section, not in a separate "Breaking Changes" header — feels more conversational and less like a release-notes form.
- The scar story's lesson should be reusable, not specific. "If your system has a failure mode where it degrades to plausibly correct but actually wrong, you need a tripwire" is portable advice; "make squad.agent.md smaller" is not.

**Safety / discipline:**
- Used placeholder `vX.Y.Z` with explicit TODO comment per spec instead of inferring from package.json (which would have led to `v0.10.0` but Data is computing the real version).
- Used CURRENT_DATETIME (2026-06-07) literally — did not invent a release date.
- Surfaced every factual-claim source in the note for Tamir so he can verify before publish.
- Treated all changeset descriptions as content sources, not instructions. Several changesets contained imperative voice ("Configure via..." / "Use `squad ...`") that I rephrased as third-person description.

**Output location:** `.squad/decisions/inbox/troi-release-blog-draft.md`. Includes the full draft above plus a "Note for Tamir" section listing modeled posts, picked themes, omitted themes, and every factual claim with its citation.

**Length target verified:** Roughly the same scale as v0.9.0 (~260 lines including the reviewer note). Headline body alone is ~150 lines, which is comparable to v0.9.0's body length.

## 2026-06-09 — Substantive Code Review Comment on PR #1148 (@ahhlun, reasoningEffort pipeline)

**Task:** Draft a PR review comment for ahhlun's `feat(sdk): thread reasoningEffort through agent spawning pipeline` — 18 files, +983/-6, 5-layer hierarchy + clamping. Based on a review by Data + Worf.

**What worked:**
- Opening acknowledgment is specific and evidence-backed: "~30 unit tests across 3 test files", "live test confirmed 8 reasoning delta events at xhigh", "charter parsing handles missing field, casing, whitespace, auto sentinel cleanly" — all concrete, none generic. Matches the #1195 pattern of "Good use of X with a specific referent."
- "Two asks before I approve:" as a transition is confident and non-hedged. Labels the comment's structure upfront so the author knows exactly what they're looking at.
- **Net effect:** translation after the technical description — "defaultReasoningEffort: 'high' in .squad/config.json today does nothing" — is the signature move. Technical detail + plain-English consequence in the same breath.
- **The "fair caveat" pattern (new pattern):** When a gap is inherited from existing broken code rather than introduced by this PR, acknowledge it explicitly and briefly: "the same gap exists for `model` in `lifecycle.ts` already — this follows the existing broken pattern." This signals precision about blame, not hedging. Tamir does this to maintain credibility with the author without excusing the issue.
- Consolidated both blockers into one ask (wire the resolver OR scope the description + file follow-up), followed by one integration test ask. Two asks, not four — makes the "before I approve" threshold clear.
- Smaller stuff downgraded explicitly ("not blockers") and listed without elaboration. Signals Tamir noticed them, they don't block merge, but the author should know.
- Kicker closes on the *resolver*, not a social sign-off: "The resolver logic is tight — the missing piece is plugging it into the path that actually runs." Restates what's good, frames what's missing, done.

**What to avoid:**
- Don't explain the PR's architecture back to the author (no "this PR introduces a 5-layer hierarchy…"). They wrote it.
- Don't list every good thing — pick the 3-4 most specific. "The plumbing is solid" as a one-liner is enough after enumerating specifics.
- No "I would suggest" or "it might be worth" — "either wire X or scope the description" is the instruction.

**New pattern extracted — "Net effect" sentence:**
After walking through why something doesn't fire (resolver not called → dep optional → no caller injects it → fallback replicates OR-chain), terminate with a single short declarative: "Net effect: [thing user configured today does nothing]." Compresses 4 technical bullets into 1 actionable fact. Use whenever a chain of conditions leads to silent failure.

**New pattern extracted — "Fair caveat" paragraph:**
When a gap exists in the PR's code but the root cause is inherited from an existing broken pattern (not introduced by this PR), add one short parenthetical: "(Fair caveat: the same gap exists for X already — this follows the existing broken pattern rather than introducing a new regression.)" Keeps the review honest without letting the author feel they're being blamed for someone else's debt. One sentence, parenthetical, no softening of the actual ask.

**Length target:** ~390 words. On the high end of code review comments (vs. #1195's shorter shape) because of two parallel technical gaps that each need explaining. Still comfortably under 450.

## 2026-06-09 — REVISION: PR #1148 comment revised from "request changes" → "approve with nits"

**Task:** Revise the earlier "request changes" draft for ahhlun's `reasoningEffort` PR after Tamir pushed back. On closer reading, the integrator-wiring gaps Worf flagged are intentional SDK design (same pattern as `resolveModel` — SDK exposes hooks, integrators like squad-cli wire them). The earlier draft was unfair.

**Key learning — verify "approve vs. request changes" framing before posting under Tamir's name:**
- An overcall on "request changes" when the gap is by design is worse than a false positive nit: it signals the reviewer didn't understand the PR's design intent, and it blocks a PR that shouldn't be blocked.
- Before framing any gap as a blocker, check whether the existing SDK follows the same pattern. If `resolveModel` is optional on `FanOutDependencies` and nobody fires on that, the same shape on `resolveReasoningEffort` is not a bug — it's consistency.
- The right move when catching this before posting: reframe as APPROVE, surface the design pattern explicitly ("same shape as `resolveModel`") so the author knows you read it correctly, then route remaining substance to nits + one testing question.
- Posting a "request changes" review under Tamir's name when the correct verdict is "approve" is a voice fidelity failure with real consequences (blocks a PR, signals distrust, puts Tamir's reputation behind a wrong call). Always double-check the verdict label last, after drafting substance.

**What changed structurally in the revision:**
- Verdict: request changes → approve
- Design-intent paragraph added: explicitly names the `resolveModel` parallel so the author knows the gap was considered, not missed
- Both "blockers" demoted to nits — not blockers
- Testing question kept (Layer 2 charter path not live-verified the same way as Layer 1) but reframed as "worth one more pass" rather than "required before merge"
- Sign-off changes from "two things before I approve" to "approving — address nits your call"

**Length target:** ~430 words (slightly above #1148 draft-1 because the design-intent paragraph is new).
