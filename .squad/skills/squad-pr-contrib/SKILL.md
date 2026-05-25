---
name: squad-pr-contrib
description: >
  Complete runbook for contributing Pull Requests to the upstream bradygaster/squad repository.
  Covers fork setup, branch naming, build/test gates, changeset rules, label system,
  CI/Policy Gates checks, waiver process, and PR description template compliance.
  Triggers: "open a PR to squad", "contribute to bradygaster/squad", "squad PR", "how to PR",
  "submit PR upstream", "PR to dev branch", "changeset add", "skip-changelog", "skip-version-check",
  "Policy Gates failure", "prerelease version guard", "workspace integrity", "pr workflow"
metadata:
  author: data
  version: "1.0.0"
  source: bradygaster/squad CONTRIBUTING.md + .github/PR_REQUIREMENTS.md + PULL_REQUEST_TEMPLATE.md
  last-verified: 2026-05-25
---

# Squad PR Contribution Runbook

Authoritative source: `C:\Users\tamirdresher\source\repos\squad\CONTRIBUTING.md` and
`C:\Users\tamirdresher\source\repos\squad\.github\PR_REQUIREMENTS.md`.

---

## 0. One-Time Fork Setup

```bash
# Fork bradygaster/squad on GitHub first, then:
git clone git@github.com:tamirdresher/squad.git
cd squad
git remote add upstream git@github.com:bradygaster/squad.git
git fetch upstream dev
npm install
```

---

## 1. Branch Rules

| Rule | Detail |
|------|--------|
| **Always branch from `dev`** | Never from `main` or `insider` |
| **Target branch for PR** | Always `dev` — not `main` |
| **Branch naming** | `{username}/{issue-number-slug}` or `{username}/{descriptive-slug}` |
| **Rebase before PR** | `git fetch upstream && git rebase upstream/dev && git push origin your-branch --force-with-lease` |

```bash
git checkout upstream/dev -b tamirdresher/1234-my-feature
# ... make changes ...
git fetch upstream
git rebase upstream/dev
git push origin tamirdresher/1234-my-feature --force-with-lease
```

---

## 2. Build + Test Gate (ALL must pass before PR)

```bash
npm run build          # TypeScript compile
npm run build:cli      # esbuild CLI bundle
npm test               # Vitest — 225 test files, ~6400 tests
npm run lint           # tsc --noEmit type check
npm run lint:eslint    # ESLint
```

For SDK-specific changes:
```bash
cd packages/squad-sdk
pnpm install
pnpm run build         # Zero TS errors required
```

---

## 3. Changeset Rules

Required when: `packages/squad-sdk/src/` or `packages/squad-cli/src/` files changed.

```bash
npx changeset add
# Interactive: select packages, bump type (patch/minor/major), write description
# Creates: .changeset/your-change-name.md
```

**Categorically exempt** (no changeset needed, per PR_REQUIREMENTS.md edge-case exemptions):

| PR Type | Exempt From |
|---------|-------------|
| Dependency bumps (no API surface change) | Docs feature page, Samples, Changeset |
| Internal refactors (no public API change) | Docs, Samples |
| CI/GitHub Actions workflow changes | Docs, Exports, Samples |
| Test-only changes | Docs, Exports, Samples |
| Documentation-only changes | Code Quality (tests), Exports, Samples |

For exempt PRs: add `## Waivers` section to PR description and request `skip-changelog` label from maintainer.

---

## 4. Policy Gates CI Check — Common Failures and Fixes

### Gate: Prerelease Version Guard
**Symptom:** `PRERELEASE VERSION DETECTED — cannot merge to dev/main.`
**Cause:** A `package.json` contains a `-build.X` or other prerelease suffix.
**Fix options:**
- If the prerelease is in YOUR changed files: remove the suffix, commit the fix.
- If the prerelease is PRE-EXISTING on `dev` (not introduced by your PR):
  - Document this in PR comments with proof (compare against `origin/dev` tip commit).
  - Request maintainer add `skip-version-check` label.

### Gate: Changeset/Changelog
**Symptom:** `No changeset or CHANGELOG.md update found, but SDK/CLI source files were changed.`
**Fix options:**
- Run `npx changeset add` and commit the `.changeset/*.md` file with your PR.
- If exempt (dependency bump, infra change, etc.): request `skip-changelog` label from maintainer.
- Add a `## Waivers` section to PR description documenting the exemption reason.

### Gate: Workspace Integrity
**Symptom:** Stale registry packages in `package-lock.json`.
**Fix:** Reset `package-lock.json` to upstream dev baseline:
```bash
git checkout upstream/dev -- package-lock.json
npm install --package-lock-only --ignore-scripts
git add package-lock.json && git commit --amend --no-edit
```

---

## 5. PR Description Template

The PR description MUST follow the PULL_REQUEST_TEMPLATE.md structure:

```markdown
### What
One paragraph: what does this PR change?

### Why
Problem being solved. Link: Closes #N

### How
Approach taken. Key design decisions.

---

### PR Readiness Checklist

#### Branch & Commit
- [x] Branch created from `dev` (not `main`)
- [x] Branch is up to date with `dev`
- [x] PR is not in draft mode
- [x] Commit history is clean

#### Build & Test
- [x] `npm run build` passes
- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run lint:eslint` passes

#### Changeset
- [ ] Changeset added via `npx changeset add`
- [x] OR: `skip-changelog` label requested (see Waivers below)

#### Docs
- [x] N/A — no user-facing change (dependency bump)

#### Exports
- [x] N/A — no new modules

---

### Breaking Changes
None.

### Waivers
- Waived: (d) Changeset/Changelog — dependency version bump only, no API surface change;
  categorically exempt per PR_REQUIREMENTS.md "Dependency bumps (routine maintenance)" row.
  Requesting `skip-changelog` label. Approval needed from: FIDO.
- Waived: Policy Gates / Prerelease Version Guard — squad-cli@0.9.6-build.4 prerelease
  is pre-existing on dev (commit afe78188), not introduced by this PR.
  Requesting `skip-version-check` label. Approval needed from: maintainer (@bradygaster).
```

---

## 6. Label System

| Label | Who applies | Effect |
|-------|-------------|--------|
| `skip-changelog` | Maintainer only | Bypasses changelog/changeset gate |
| `skip-version-check` | Maintainer only | Bypasses prerelease version guard |
| `large-deletion-approved` | Maintainer only | Bypasses large-deletion threshold (>50 files deleted) |

**Self-waiving is NOT allowed.** Only named reviewers (Flight / FIDO / @bradygaster) can apply skip labels after approving the waiver in a PR comment.

---

## 7. PR Readiness Bot

The `squad-pr-readiness.yml` workflow posts an automated checklist on every push.
Address all checklist items before requesting human review. Key items:

- Single commit (squash fixups)
- Not in draft mode
- Branch up to date with dev
- Copilot review posted
- Changeset present (or skip-changelog label)
- No merge conflicts
- CI passing

---

## 8. Open PR Workflow: Create + Link

```bash
# Create PR targeting dev
gh pr create \
  --repo bradygaster/squad \
  --base dev \
  --head tamirdresher:your-branch \
  --title "chore(squad-sdk): brief description" \
  --body "$(cat pr-body.md)"

# Link to issue (in PR description body)
# Add: Closes #N
```

---

## 9. Package Manager Notes

- **Root + squad-cli**: `npm` (npm workspaces)
- **squad-sdk**: `pnpm` (has its own `pnpm-lock.yaml`)
- `sdk-exports-validation` CI uses `npm ci` against root `package-lock.json`
- Never manually edit `package-lock.json` to add packages; use `npm install` then commit

---

## 10. Quick Diagnostic for "Why is my PR red?"

```bash
# Check what's currently failing on upstream dev (not your PR)
gh run list --repo bradygaster/squad --branch dev --limit 3

# See if your failures exist on dev HEAD (pre-existing debt)
gh run list --repo bradygaster/squad --branch dev --workflow "Squad CI" --limit 1 --json databaseId | \
  jq -r '.[0].databaseId' | xargs gh run view --repo bradygaster/squad --log-failed
```

If failures on your PR match failures on `dev` HEAD → pre-existing debt, not your regression.
Document in PR comment with the dev commit SHA and request maintainer labels.
