---
name: extract-test-from-competing-pr
description: >
  How to safely cherry-pick a regression test from a competing PR when the competing PR
  also contains breaking changes you don't want. Covers reading the diff, manually
  re-writing the test to match existing file conventions, avoiding type-rewrite pull-in,
  and handling worktree + node_modules junction local-test failures that pass in CI.
  Triggers: "cherry-pick test", "extract test from PR", "competing PR", "duplicate PR test",
  "worktree vitest fails", "node_modules junction stale dist", "manual test port"
metadata:
  author: data
  version: "1.0.0"
  source: PR #1192 / #1193 (bradygaster/squad) — June 2026
  last-verified: 2026-06-03
---

# Skill: Extract Regression Test From a Competing PR

Use when a Copilot-opened or duplicate PR contains a regression test you want, but also contains
changes (type rewrites, API surface changes) you deliberately exclude.

---

## 1. Diff the competing PR

```bash
gh pr diff <PR_NUMBER> --repo bradygaster/squad
```

Read the full diff. Identify:
- Which files are test-only changes
- Which files touch exported types/interfaces (breaking changes — DO NOT pull in)
- Whether the test has any direct dependency on the new types

A test that only calls existing methods and checks string output usually has **no type-rewrite dependency**.

---

## 2. Check if a mock declaration is missing from the diff

PR diffs often omit the `describe` block context. Before writing the test, read the actual test file
to find the established mock pattern. In `test/adapter-client.test.ts` the pattern is:

```typescript
const MockedCopilotClient = CopilotClient as unknown as ReturnType<typeof vi.fn>;
```

This declaration appears once per `describe` block and may not appear in the diff. Always check
the surrounding tests in the target file before writing.

---

## 3. Write the test manually

Do NOT use `git cherry-pick` — it will pull in the full commit including the type rewrite.
Instead, write the test from scratch following the patterns in the target file.

Checklist:
- [ ] Same `describe` / `it` nesting level as nearby tests
- [ ] Same mock setup (`beforeEach`, `vi.fn()`, cast pattern)
- [ ] `expect(...).toContain(...)` or `.toMatch(...)` for partial string assertions
- [ ] No imports from changed types in the competing PR

---

## 4. Commit and push

```bash
git add test/adapter-client.test.ts
git commit -m "test(<scope>): <description of what the regression covers>"
git push origin HEAD:<branch-name>
```

---

## 5. Worktree + node_modules junction gotcha

**Symptom:** Test passes in CI but fails locally with the OLD error message.

**Cause:** Git worktrees created from a monorepo often get a `node_modules` **junction** pointing at
the main repo's node_modules. Inside that, workspace packages (e.g. `@bradygaster/squad-sdk`) are
symlinks to the *main* repo's package directory. If the main repo branch does not have the fix yet,
the compiled dist is stale and the test fails.

**Diagnosis:**
```powershell
(Get-Item "path\to\main\node_modules\@bradygaster\squad-sdk").Target
# Should show the worktree's packages/ path; if it shows the main repo's path, you have the issue
```

**What NOT to do:** Do not change the test assertion to match the stale dist.

**Verification:** CI runs `npm ci + npm run build + npm test` — fresh install builds the correct dist
from the branch source and the test will pass.

---

## 6. Close the competing PR

```bash
gh pr close <COMPETING_PR> --repo bradygaster/squad \
  --comment "Closing in favor of #<TARGET_PR>. Regression test manually ported as commit <SHA>. ..."
```

Briefly explain:
- Which commit contains the ported test
- Why the type rewrite was not included
- That CI passed on the target PR
