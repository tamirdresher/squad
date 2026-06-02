# Squad.Agents.AI — Workstream Decisions

**Last Updated:** 2026-06-02T15:52:21+03:00  
**Scope:** Squad.Agents.AI NuGet package (`tamirdresher/squad`, branch `feature/squad-agents-ai`)  
**Format:** Append-only. New decisions prepended under `## Active Decisions`.

> **Note on earlier decisions:** This file contains the 8 most-relevant decisions seeded at workstream bootstrap (2026-06-02). All earlier decisions from the flat ledger — including the full onboarding fan-out (5-agent report), state-backend triage, and archive entries — remain in `../../../decisions.md` until a future migration pass moves them here.

---

## Active Decisions

---

### 2026-06-02 — PR #3 Round 1 Cleanup (Data, commit 88424b79)

**Context:** PR #3 review pass — hygiene, XML docs, cliArgs proof, multi-named connections.

**Decisions:**
- `cliArgs` already worked end-to-end (`SquadConnectionFactory` parses, options configurator merges, `SquadAgent` copies to `CopilotClientOptions.CliArgs`). Added code comment + regression test.
- Multi-named connection contract: `AddSquadAgent("research")` reads `ConnectionStrings:squad-research`; default `AddSquadAgent()` keeps `ConnectionStrings:squad`.
- XML docs added for all new public named-connection overloads.
- Public hygiene: 0 internal `.squad/` references in any public-facing text after scrub.

**Evidence:** Commit `88424b79`; 22 tests passing; 0 CS1591 warnings.

---

### 2026-06-02 — Auth Expansion: APPROVE_WITH_CONDITIONS (Picard + Worf)

**Context:** Data proposed auth-mode expansion + extensibility. Picard and Worf reviewed.

**Picard verdict:** APPROVE_WITH_CONDITIONS (6 conditions). Recommended extension point: `Action<CopilotClientOptions> ConfigureCopilotClient`. Seam boundary: v0.1 = `CopilotClientOptions` layer; v0.2 = `SessionConfig` layer. BYOK deferred to v0.2.

**Worf verdict:** APPROVE_WITH_CONDITIONS (8 security guards). Guards include: no token exfiltration through delegate, proxy URI validation, log scrubbing of bearer tokens, delegate isolation testing, rate-limit preservation, TLS override warning, connection string plaintext warning, and audit log for delegate presence.

**Status:** Awaiting Data implementation. No changes to PR #3 until R2 starts.

---

### 2026-06-02 — Release Strategy Directive (Tamir)

**By:** Tamir Dresher  
**What:** Squad.Agents.AI publishing follows branch-driven model:
- Merges to `dev` → publish prerelease NuGet (e.g., `0.1.0-preview.{run_number}`)
- Merges to `main` → publish stable NuGet (e.g., `0.1.0`)
- `workflow_dispatch` remains as manual escape hatch only

**Why:** Mirror Squad CLI release strategy. Reduces cognitive overhead; predictable "merge → published prerelease" loop on `dev`.

---

### 2026-06-02 — Release Pipeline + Dependabot Added (B'Elanna, commits 5f5293fb + db05f2a3)

**Agent:** B'Elanna  
**Deliverables:**
- `.github/workflows/squad-agents-ai-release.yml` — branch-driven (`dev` → prerelease, `main` → stable), per-version concurrency, `--skip-duplicate` safety.
- `.github/dependabot.yml` — NuGet + Actions weekly; `M.A.AI*` major updates allowed; OpenTelemetry major deferred (Decision 602).

**Outstanding:** `NUGET_API_KEY` secret setup (maintainer); `dev` branch creation (post-R2-merge).

---

### 2026-06-02 — .NET CI Gate Added (B'Elanna, commit 12d803bf)

**Agent:** B'Elanna  
**Deliverable:** `.github/workflows/squad-agents-ai-ci.yml` — matrix `ubuntu-latest` + `windows-latest`, .NET 10.0.x, restore/build/test/pack, artifact upload for TestResults + nupkg.

**Trigger:** PRs touching `src/Squad.Agents.AI/**`, `test/Squad.Agents.AI.Tests/**`, workflow, or root `Directory.*`/SDK config.

---

### 2026-06-02 — Docs Pass (Data, commit 6f8994e5)

**Agent:** Data  
**Seven gaps closed:** Package README, XML docs (4 public types), root README mention, CHANGELOG `0.1.0-preview` entry, `.csproj` metadata, README/LICENSE packed into `.nupkg`, `dotnet pack` verified.  
**Deferred to v0.2:** Sample app project, keyed DI, BYOK/session-provider pass-through, richer observability, multi-targeting beyond `net10.0`.

---

### 2026-06-02 — Gap Closure + Boundary Directives

**Clawpilotsquad Scope Boundary (Tamir):** clawpilotsquad owns clawpilot/repo m — NOT Squad.Agents.AI. Reno on PR #3 commits is a cross-squad identity overlap. Going forward: clawpilotsquad ≠ Squad.Agents.AI. Cross-squad work must be explicitly sanctioned and logged.

**Routing Tests Added (Data, commit 3f5e61d6):** 5 routing integration tests in `SquadAgentRoutingTests.cs` prove API routing contract at the `AIAgent`/Copilot boundary. Tests confirm persona metadata, boundary instructions, CWD isolation, and Decision 447 routing via `CopilotClientOptions`. 22/22 tests pass.

---

### 2026-06-02 — Onboarding Verdict: v0.1 READY TO MERGE

**Context:** 5-agent fan-out (Seven, Picard, Data, Worf, B'Elanna) synthesised into onboarding decision.

**Key findings:**
- Technical baseline stable (Data). Security clear (Worf, B1–B6 PASS). Build/pack verified locally (B'Elanna). Strategic context inherited (Picard).
- No blockers to merge PR #3, tag v0.1, and publish.

**Critical path for v0.2:** .NET CI gate ✅, NuGet publish workflow ✅, Squad routing functional proof ✅, Aspire telemetry scope TBD.

**Citations:** tamresearch1 Decisions 437–448; PR #3 (`tamirdresher/squad`).

---

### 2026-06-02 — Public Hygiene Directive (Tamir) [see also: evergreen/global]

**By:** Tamir Dresher  
**What:** No internal `.squad/` references, squad agent names, or internal process details in any public-facing text — PR descriptions, commit messages, NuGet README, GitHub Releases, blog content, docs.

**Note:** A copy of this directive also lives in `.squad/workstreams/evergreen/global/decisions/inbox/` because it applies to all workstreams, not only squad-agents-ai.

---
