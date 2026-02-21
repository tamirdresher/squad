# 02 — GitHub Issues

> **⚠️ INTERNAL ONLY — DO NOT PUBLISH**

Validates that Squad reads, routes, and updates GitHub issues correctly.

---

## Setup

```bash
# Use a dedicated test repo (create or reuse)
REPO="your-org/squad-test-repo"
gh repo create $REPO --private --confirm 2>/dev/null || true
cd /tmp && gh repo clone $REPO squad-issue-test && cd squad-issue-test

# Initialize Squad
npx squad init
git add -A && git commit -m "feat: squad init" && git push -u origin main
```

---

## Step 1 — Create Test Issues with Squad Labels `[AUTO]`

```bash
# Create issues with labels that match routing config
gh issue create --title "Test: implement login page" --label "squad:frontend" --body "Build a login page with email/password fields."
gh issue create --title "Test: add rate limiting" --label "squad:backend" --body "Add rate limiting middleware to the API."
gh issue create --title "Test: update README" --label "squad:docs" --body "Update the README with setup instructions."
```

**Expected:** Three issues created, each with a `squad:*` label. Note the issue numbers.

```bash
# Verify
gh issue list --label "squad:frontend" --json number,title
gh issue list --label "squad:backend" --json number,title
gh issue list --label "squad:docs" --json number,title
```

## Step 2 — Verify Squad Reads Issues `[AUTO]`

```bash
# Run Squad's issue scanner (adjust command to match actual CLI)
npx squad issues list
```

**Expected:** Output lists all three test issues with their labels and assigned agent (based on routing config).

## Step 3 — Verify Label-Based Routing `[HUMAN]`

```bash
npx squad issues route --issue <FRONTEND_ISSUE_NUMBER>
npx squad issues route --issue <BACKEND_ISSUE_NUMBER>
npx squad issues route --issue <DOCS_ISSUE_NUMBER>
```

**Expected:**
- `squad:frontend` → routes to frontend agent
- `squad:backend` → routes to backend agent
- `squad:docs` → routes to docs agent

Verify the routing matches what's defined in `squad.config.ts` routing rules.

## Step 4 — Test Issue Lifecycle: Open → In-Progress → Closed `[AUTO]`

```bash
# Simulate agent picking up an issue
gh issue edit <FRONTEND_ISSUE_NUMBER> --add-label "in-progress"

# Verify label applied
gh issue view <FRONTEND_ISSUE_NUMBER> --json labels --jq '.labels[].name'
```

**Expected:** Issue shows both `squad:frontend` and `in-progress` labels.

```bash
# Simulate agent completing work
gh issue close <FRONTEND_ISSUE_NUMBER> --comment "Completed by Squad frontend agent."
gh issue view <FRONTEND_ISSUE_NUMBER> --json state --jq '.state'
```

**Expected:** Issue state is `CLOSED`.

## Step 5 — Verify Issue Comments Reflect Agent Work `[HUMAN]`

```bash
gh issue view <FRONTEND_ISSUE_NUMBER> --comments
```

**Expected:** Issue has a closing comment from the agent. Comment should:
- Identify which agent handled the work
- Reference what was done
- Be well-formed (no template placeholders or broken formatting)

## Step 6 — Test Routing with Unlabeled Issue `[HUMAN]`

```bash
gh issue create --title "Test: ambiguous task" --body "This issue has no squad label."
npx squad issues route --issue <NEW_ISSUE_NUMBER>
```

**Expected:** Squad handles the unlabeled issue gracefully — either assigns a default agent or reports that no routing rule matched. Should NOT error or crash.

---

## Cleanup

```bash
# Close remaining test issues
gh issue list --state open --json number --jq '.[].number' | xargs -I{} gh issue close {}
cd / && rm -rf /tmp/squad-issue-test
# Optionally: gh repo delete $REPO --yes
```
