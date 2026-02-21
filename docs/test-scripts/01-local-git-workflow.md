# 01 — Local Git Workflow

> **⚠️ INTERNAL ONLY — DO NOT PUBLISH**

Validates that Squad initializes correctly and its state survives normal git operations.

---

## Setup

```bash
# Create a throwaway test directory
mkdir /tmp/squad-git-test && cd /tmp/squad-git-test
git init
```

---

## Step 1 — Initialize Squad `[AUTO]`

```bash
npx squad init
```

**Expected:**
- Exit code 0
- `.squad/` directory created at repo root
- `squad.config.ts` created at repo root

```bash
# Verify
test -d .squad && echo "PASS: .squad/ exists" || echo "FAIL: .squad/ missing"
test -f squad.config.ts && echo "PASS: squad.config.ts exists" || echo "FAIL: squad.config.ts missing"
```

## Step 2 — Verify Config Defaults `[AUTO]`

```bash
cat squad.config.ts
```

**Expected:** Config contains `defineConfig()` call with at minimum:
- `team.name` set (defaults to directory name)
- `team.root` set to `.squad`
- `routing` section present

```bash
# Quick structural check
grep -q "defineConfig" squad.config.ts && echo "PASS: defineConfig found" || echo "FAIL: defineConfig missing"
grep -q ".squad" squad.config.ts && echo "PASS: .squad root found" || echo "FAIL: .squad root missing"
```

## Step 3 — Create Branch and Make Changes `[AUTO]`

```bash
git add -A
git commit -m "feat: initial squad setup"

git checkout -b test/git-workflow
echo "test file" > src-test.txt
git add src-test.txt
git commit -m "test: add test file"
```

**Expected:** Both commits succeed. No warnings about `.squad/` files.

## Step 4 — Verify .squad/ State Intact After Commits `[AUTO]`

```bash
test -d .squad && echo "PASS: .squad/ intact" || echo "FAIL: .squad/ lost"
ls .squad/
```

**Expected:** `.squad/` directory and all contents still present after branch creation and commit.

## Step 5 — Switch Branches and Verify Persistence `[AUTO]`

```bash
git checkout main
git checkout test/git-workflow
```

**Expected:** `.squad/` contents identical before and after branch switch.

```bash
# Verify config still loads
grep -q "defineConfig" squad.config.ts && echo "PASS: config survived branch switch" || echo "FAIL: config corrupted"
```

## Step 6 — Verify Agent History Persistence `[AUTO]`

```bash
# Check that history/shadow files in .squad/ survive git operations
find .squad -type f | sort
```

**Expected:** All files created during init are still present. File count matches what was created in Step 1.

## Step 7 — Merge and Verify `[AUTO]`

```bash
git checkout main
git merge test/git-workflow --no-edit
```

**Expected:** Clean merge. `.squad/` state present on main after merge.

```bash
test -d .squad && echo "PASS: .squad/ survives merge" || echo "FAIL: .squad/ lost after merge"
```

---

## Cleanup

```bash
cd / && rm -rf /tmp/squad-git-test
```
