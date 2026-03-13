# McManus — History

## Core Context

### Stack & Repository
- **Project:** squad-sdk — programmable multi-agent runtime for GitHub Copilot
- **Stack:** TypeScript (strict mode, ESM-only), Node.js ≥20, @github/copilot-sdk, Vitest, esbuild
- **Owner:** Brady

### DevRel Mission & Tone Ceiling
- McManus owns docs consistency, tone ceiling enforcement, brand compliance, discoverability
- **Tone ceiling rule:** No hype, no hand-waving, no claims without citations. Every public statement must be substantiated.
- Lead with primary use cases before exhaustive options. Examples before explanations.

### Documentation Architecture
- GitHub Pages deployment: `squad-docs.yml` workflow → `docs/build.js` → https://bradygaster.github.io/squad/
- Build is fast (28s), deterministic, fully automated via markdown-it
- Migration docs key pattern: Decision tables/checklists for complex upgrade paths (file safety tables, version jumps)
- Link hygiene: Always use `.md` extensions for internal links, never `.html`

### SDK-First Mode Documentation
- Markdown-first is default, SDK is opt-in upgrade path
- Key commands: `squad init --sdk`, `squad migrate --to sdk|markdown|ai-team`
- Builders: `defineSquad()`, `defineTeam()`, `defineAgent()`, `defineRouting()`, `defineSkill()`
- Config discovery: `squad build` validates and shows effective config

### Community Engagement Patterns
- Contributors are often ahead of curve—acknowledge publicly when they inspire features
- Personal thank-yous by name reinforce that feedback is valued
- Sign as "— McManus 📝, on behalf of the Squad" for warmth
- Explain root causes accessibly without hand-waving

### Docs Quality Patterns
- Feature-docs lag is recurring issue: PRs ship before docs, terminology changes outpace updates
- Fix: Docs checklist in feature PRs, templates for new features, experimental banner linting
- File renames create stale cross-references—audit when files move
- History hygiene: Record final outcomes only, never intermediate states (see `.squad/skills/history-hygiene/SKILL.md`)

### Key File Paths
- Docs: `docs/` (62 pages), `docs/blog/`, `docs/get-started/`, `docs/reference/`, `docs/features/`
- CLI help: `packages/squad-cli/src/cli-entry.ts` (lines 68-115 for help output)
- Migration guide: `docs/get-started/migration.md` (file safety table, `squad doctor` validation)
- GitHub Actions: `.github/workflows/squad-docs.yml`, `.github/workflows/publish.yml`

## Learnings

### 2026-03-13: GitHub Pages Docs Deployment

**Status:** Complete. Deployed docs site to production.

Brady requested release-time deployment of GitHub Pages docs. Deployment executed via `gh workflow run squad-docs.yml --ref main`. Build completed in 28s (checkout → setup Node 22 → install markdown-it → render docs → upload artifact). Deploy completed in 11s. Site verified live at https://bradygaster.github.io/squad/.

**Learnings:**
- Docs build is fast & deterministic (28s total), zero manual steps
- Navigation + search index auto-generated from directory structure + frontmatter
- GitHub Pages deployment fully automated via `actions/deploy-pages@v4`—no branch switching needed

### 2026-03-13: Community Discussions — Terminal Flickering & Skill-Based Orchestration

**Status:** Complete. Posted warm replies to Discussions #170 (terminal flickering) and #169 (skill-based orchestration).

Brady asked McManus to reply to two community discussions:
1. **#170 (Terminal Flickering)** — @Gareth064 and @diberry reported flickering from raw ANSI codes bypassing Ink. Issue #254 in progress with fixes: removing direct stdout writes, reducing FPS from 15fps to 5fps.
2. **#169 (Skill-Based Orchestration)** — @swnger proposed pluggable skills. defineSkill() shipped in commit 412ce58—exactly what was proposed.

**Tone Applied:**
- Genuinely warm, appreciated contributors by name
- Technical but accessible—explained root causes without handwaving
- Invited feedback and framed as partnership
- Signed as "— McManus 📝, on behalf of the Squad"

**Pattern:** Community contributors often ahead of curve. Acknowledge publicly when features are inspired by them—builds loyalty and engagement.

### 2026-03-07: SDK-First Documentation Update — Issue #251

**Status:** Complete. All SDK-First documentation updated to cover `squad init --sdk` and `squad migrate` commands.

**Work completed:**
1. Added "Which Mode Should I Use?" decision tree to `docs/sdk-first-mode.md` (lines 22–31)
2. Added "Starting a New SDK-First Project" section with `squad init --sdk` docs (lines 100–133)
3. Added "Migrating an Existing Squad" section with `squad migrate --to sdk|markdown|ai-team` commands (lines 137–176)
4. Added `defineSkill()` builder reference with full field documentation (lines 460–492)
5. Updated `docs/reference/config.md` to use new `defineSquad()` builder syntax

**Tone ceiling maintained:**
- No hype or hand-waving
- All claims substantiated by builder type signatures and CLI behavior
- "Start with markdown" guidance is lead positioning (not buried)
- Markdown is default, SDK is opt-in upgrade path
