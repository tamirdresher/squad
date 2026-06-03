### 2026-06-03T07:39:52+03:00: User directive — Squad.Agents.AI placement decision

**By:** Tamir Dresher (via Copilot)

**What:** Resolved the open in-repo-vs-companion-repo question that was raised in Picard's recon for bradygaster/squad#1205 and surfaced as one of the two paths in the PR body. **Decision: in-repo.** Squad.Agents.AI lives at `bradygaster/squad/src/Squad.Agents.AI/` (which is exactly the layout bradygaster/squad#1207 already implements). The companion-repo option (e.g., `bradygaster/Squad.Agents.AI`) is off the table. Tamir asserted decision authority explicitly: "I have the decision power here."

**Why:** Settled in advance so that whenever brady responds to #1205 or reviews #1207, the team's position is unambiguous. PR #1207 already implements the in-repo layout, so no code change is triggered by this decision — only future communication needs to align (e.g., if brady proposes companion-repo, the team advocates for in-repo).

**Implications:**
- Do NOT edit the public messaging on #1205 or #1207 unilaterally — wait for brady to weigh in before re-framing. If brady asks about placement, surface this decision then.
- Future Squad.AI follow-ups (v0.2 features, Aspire sample, etc.) all target `bradygaster/squad/src/Squad.Agents.AI/`, never a separate repo.
- NuGet metadata in `Squad.Agents.AI.csproj` already points to bradygaster/squad — consistent with this decision.
