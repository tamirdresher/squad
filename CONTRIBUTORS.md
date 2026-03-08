# Contributors

Squad is built by contributors from across the open source community. Thank you.

---

## Insider Program

**[INSIDER]** — Early access testers for Squad development builds.

The Insider Program gives you access to cutting-edge features before they ship. Insiders run development builds directly from the `insider` branch and help us catch bugs, validate UX, and shape the future of Squad.

### What It Is

- **Early access** to unreleased features
- **Development builds** with continuous updates
- **Direct input** on what gets built next
- **Experimental features** that may rough around the edges

### How to Join

Install from the insider branch using the honor system:

```bash
npx github:bradygaster/squad#insider
```

That's it. You're now on insider builds.

### What to Expect

- **Regular updates** — The insider branch receives commits as features ship
- **Experimental features** — Some features may not be fully stable
- **Bug reports welcome** — Help us find and fix issues early
- **Version format** — `v0.4.2-insider+{commit-hash}` in your `squad.agent.md`

### Report Issues

Found a bug in an insider build? Please [open a GitHub issue](https://github.com/bradygaster/squad/issues) with:

- **Version** — The full version string from your `squad.agent.md`
- **What happened** — Clear description of the bug or unexpected behavior
- **Steps to reproduce** — How to trigger the issue
- **Environment** — CLI or VS Code, Node version, OS

Label your issue with `[INSIDER]` so we can track it.

---

## The Squad

Squad is built by an AI team where each member owns a domain and ships real work. Every release represents contributions from the full roster.

| Name | Role | Domain |
|------|------|--------|
| Keaton | Lead | Architecture, code review, product direction |
| Verbal | Prompt Engineer | Agent design, spawn templates, coordinator logic |
| Fenster | Core Dev | Runtime implementation, CLI, casting engine |
| Hockney | Tester | Test coverage, quality gates, CI/CD pipeline |
| McManus | DevRel | Documentation, messaging, developer experience |
| Kujan | SDK Expert | Copilot SDK integration, platform patterns |
| Edie | TypeScript Engineer | Type system, build tooling, public API |
| Kobayashi | Git & Release | Releases, versioning, CI/CD, branch strategy |
| Fortier | Node.js Runtime | Node.js runtime integration, system APIs |
| Rabin | Distribution | npm distribution, package management |
| Baer | Security | Security audits, vulnerability fixes |
| Redfoot | Graphic Designer | Visual design, UI assets |
| Strausz | VS Code Extension | VS Code extension, IDE integration |
| Saul | Aspire & Observability | Aspire dashboard, OpenTelemetry, Docker |
| Kovash | REPL & Interactive Shell | REPL implementation, interactive features |
| Marquez | CLI UX Designer | CLI user experience, command design |
| Cheritto | TUI Engineer | Terminal UI, interactive components |
| Breedan | E2E Test Engineer | End-to-end testing, integration validation |
| Nate | Accessibility Reviewer | Accessibility audits, inclusive design |
| Waingro | Product Dogfooder | User feedback, real-world validation |

## v0.8.22 Contributors

| Contributor | What They Shipped |
|-------------|-------------------|
| Saul | Aspire Docker-only refactor — moved dashboard to standalone container, expanded test coverage from 18 to 45 tests, hardened CLI wiring |
| Verbal | Squad Places integration — led feedback session with 18 agents, socialized artifacts across 3 waves, driving community engagement; defineSkill() builder & skill extraction from squad.agent.md |
| Fenster | Squad Places client — rewrote REST API client, launched offline queue module, shipped integration into core runtime; SDK-first init flag & generateSDKBuilderConfig |
| Hockney | Aspire test expansion — 27-test boost covering Docker path validation, port edge cases, error handling; 66 new tests (init-sdk, migrate, defineSkill) |
| Kobayashi | Release management — documented v0.8.20 completion, bumped v0.8.21-preview.1, managed branch strategy across dev/insiders/main |
| McManus | Docs & tone — docs audit completed (10 GitHub issues filed), tone ceiling enforced, documentation consistency verified; SDK-First docs update |
| Edie | squad migrate command (523 lines) — TypeScript implementation, public API surface |

---

## Community Contributors

These community members shaped Squad through issues, discussions, and feedback. Every contribution matters.

| Contributor | Contributions |
|-------------|---------------|
| [@dfberry](https://github.com/dfberry) | #241 (Squad member for docs), #157 (CFO/account member) — docs and team composition ideas |
| [@diberry](https://github.com/diberry) | #211 (Squad management paradigms) — management approaches |
| [@HemSoft](https://github.com/HemSoft) | #148 (GitHub Agent Workflows) — GAW concept |
| [@sturlath](https://github.com/sturlath) | #156 (Team learning from others' work) — cross-agent learning |
| [@tomasherceg](https://github.com/tomasherceg) | #184 (Multi-PR commit isolation), #237 (CLI wiring bug) — worktree improvements and bug reports |
| [@csharpfritz](https://github.com/csharpfritz) | #205 (Per-member model configuration) — model selection feature (shipped!) |
| [@johnwc](https://github.com/johnwc) | #176 (Different repo support) — multi-repo workflows |
| [@tamirdresher](https://github.com/tamirdresher) | #200 (Squad SubSquads PRD), #237 (CLI wiring bug) — horizontal scaling concept and bug reports |
| [@marchermans](https://github.com/marchermans) | #247 (Installation failure) — install bug report |
| [@dkirby-ms](https://github.com/dkirby-ms) | #239 (Terminal flickering bug) — UX bug report |
| [@EirikHaughom](https://github.com/EirikHaughom) | #223 (Model & reasoning configuration) — model config improvements |
| [@williamhallatt](https://github.com/williamhallatt) | #202 (squad link/init --remote), #201 (CI/CD opt-in), #218 (fork workflow docs), #216 (TUI init bug) — 4 issues spanning UX, docs, and bugs |
| [@uvirk](https://github.com/uvirk) | #229 (squad doctor not available) — CLI consistency |
| [@tihomir-kit](https://github.com/tihomir-kit) | #214 (Node.js built-in module error) — compatibility bug |
| [@fboucher](https://github.com/fboucher) | #207 (Copilot not seeing Squad at non-root) — path resolution |
| [@Pruthviraj36](https://github.com/Pruthviraj36) | #206 (Terminal blinking) — UX bug report |
| [@wbreza](https://github.com/wbreza) | #193 (Ceremonies file-size threshold) — ceremonies robustness |
| [@dnoriegagoodwin](https://github.com/dnoriegagoodwin) | #195 (Upgrade version stamp bug) — upgrade reliability |
| [@swnger](https://github.com/swnger) | Discussion #169 (Skill-based orchestration) — led to issue #255 which shipped defineSkill() |

---

## Join

Contributing code? See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

Questions? [GitHub Discussions](https://github.com/bradygaster/squad/discussions).
