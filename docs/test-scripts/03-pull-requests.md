# 03 — Pull Requests

> **⚠️ INTERNAL ONLY — DO NOT PUBLISH**

Validates that Squad integrates correctly with the GitHub PR workflow.

---

## Setup

```bash
REPO="your-org/squad-test-repo"
cd /tmp && gh repo clone $REPO squad-pr-test && cd squad-pr-test

# Ensure Squad is initialized
npx squad init 2>/dev/null
git add -A && git commit -m "chore: ensure squad init" && git push origin main 2>/dev/null || true
```

---

## Step 1 — Create a Branch with Agent Work `[AUTO]`

```bash
git checkout -b squad/test-pr-workflow

# Simulate agent-generated changes
mkdir -p src
cat > src/hello.ts << 'EOF'
export function hello(name: string): string {
  return `Hello, ${name}!`;
}
EOF

git add -A
git commit -m "feat: add hello module

Squad-Agent: frontend
Squad-Task: implement greeting function"
```

**Expected:** Commit succeeds with Squad metadata in commit message body.

## Step 2 — Push and Open PR `[AUTO]`

```bash
git push -u origin squad/test-pr-workflow

gh pr create \
  --title "feat: add hello module" \
  --body "## Squad Summary

Agent: frontend
Task: implement greeting function

### Changes
- Added \`src/hello.ts\` with typed greeting function" \
  --base main
```

**Expected:** PR created successfully. Note the PR number.

```bash
PR_NUMBER=$(gh pr list --head squad/test-pr-workflow --json number --jq '.[0].number')
echo "PR #$PR_NUMBER"
```

## Step 3 — Verify PR Description Includes Agent Summary `[HUMAN]`

```bash
gh pr view $PR_NUMBER
```

**Expected:**
- PR title is descriptive
- PR body contains Squad agent attribution
- Body references the task that was routed
- Formatting is clean (no raw template variables)

## Step 4 — Test PR Review Integration `[HUMAN]`

```bash
# If Squad has PR review capabilities, trigger a review
npx squad pr review --pr $PR_NUMBER 2>/dev/null || echo "PR review not yet implemented — skip"
```

**Expected (if implemented):**
- Squad posts a review comment on the PR
- Review identifies key changes
- Review is constructive and relevant to the diff

**If not implemented:** Note as "not yet available" and move on.

## Step 5 — Verify PR Checks `[AUTO]`

```bash
gh pr checks $PR_NUMBER --json name,state,conclusion 2>/dev/null || echo "No checks configured — skip"
```

**Expected:** Any Squad-related CI checks pass. If no checks are configured, this is informational only.

## Step 6 — Merge PR and Verify `[AUTO]`

```bash
gh pr merge $PR_NUMBER --squash --delete-branch
```

**Expected:** PR merges cleanly. Branch deleted.

```bash
git checkout main && git pull
test -f src/hello.ts && echo "PASS: changes on main" || echo "FAIL: changes missing"
```

## Step 7 — Verify Issue Closure via PR `[AUTO]`

If an issue was linked to this PR:

```bash
# Create a linked issue first, then reference it in the PR
gh issue create --title "Test: linked issue" --body "Should close on PR merge"
ISSUE_NUMBER=$(gh issue list --state open --json number --jq '.[0].number')

# Create another PR that closes the issue
git checkout -b squad/test-issue-close
echo "// fix" >> src/hello.ts
git add -A && git commit -m "fix: resolve linked issue

Closes #$ISSUE_NUMBER"
git push -u origin squad/test-issue-close
gh pr create --title "fix: resolve linked issue" --body "Closes #$ISSUE_NUMBER" --base main
gh pr merge --squash --delete-branch

# Check issue state
sleep 5
gh issue view $ISSUE_NUMBER --json state --jq '.state'
```

**Expected:** Issue state is `CLOSED` after PR merge.

---

## Cleanup

```bash
cd / && rm -rf /tmp/squad-pr-test
```
