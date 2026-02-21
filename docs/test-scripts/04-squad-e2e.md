# 04 — Squad End-to-End

> **⚠️ INTERNAL ONLY — DO NOT PUBLISH**

Full end-to-end validation of the Squad SDK pipeline: init → cast → route → execute → stream → cost.

---

## Setup

```bash
mkdir /tmp/squad-e2e-test && cd /tmp/squad-e2e-test
git init
```

---

## Step 1 — Initialize Squad in a Fresh Repo `[AUTO]`

```bash
npx squad init
```

**Expected:**
- `.squad/` directory created
- `squad.config.ts` generated with defaults

```bash
test -d .squad && echo "PASS" || echo "FAIL"
test -f squad.config.ts && echo "PASS" || echo "FAIL"
```

## Step 2 — Cast a Team (usual-suspects universe) `[AUTO]`

```bash
npx squad cast --universe usual-suspects
```

**Expected:**
- Agents from the usual-suspects universe are provisioned into `.squad/`
- Output lists each agent with its role and skills
- `CastResult` includes the full roster

```bash
# Verify agents were created
ls .squad/agents/ 2>/dev/null || ls .squad/
echo "---"
# Check casting history was recorded
npx squad cast --history
```

**Expected:** Casting history shows the cast operation with timestamp, universe, and agent list.

## Step 3 — Route a Task Through the Coordinator `[HUMAN]`

```bash
npx squad route "Add a login page with email and password fields"
```

**Expected:**
- Coordinator selects the appropriate agent based on routing rules and skill matching
- Output shows: matched route, selected agent, confidence/reason
- No errors or unhandled exceptions

```bash
# Try another task to verify different routing
npx squad route "Write unit tests for the auth module"
```

**Expected:** Routes to a different agent than the first task (testing vs frontend).

## Step 4 — Verify Agent Spawning and Response `[HUMAN]`

```bash
npx squad run "Create a simple README.md for this project"
```

**Expected:**
- Agent is spawned (or invoked) to handle the task
- A response is generated and displayed
- Response is relevant to the prompt
- Agent attribution is included in output

## Step 5 — Check Streaming Events `[AUTO]`

```bash
npx squad run --stream "Explain the project structure" 2>&1 | head -50
```

**Expected:** Output arrives incrementally with typed events:
- `chunk` — partial response text
- `status` — pipeline status updates
- `cost` — running cost data
- `done` — completion signal

```bash
# Verify streaming event types are present
npx squad run --stream --events "Explain the project structure" 2>&1 | grep -E "^(chunk|status|cost|done):" | head -20
```

## Step 6 — Check Cost Summary `[AUTO]`

```bash
npx squad cost summary
```

**Expected:**
- Shows token usage (input/output) per model
- Shows estimated cost per invocation
- Shows session aggregate

```bash
# Verify cost data is non-zero after the previous runs
npx squad cost summary --json | head -20
```

## Step 7 — Verify Model Selection and Fallback `[HUMAN]`

```bash
# Check which model was selected for a task
npx squad run --verbose "What is 2+2?" 2>&1 | grep -i "model"
```

**Expected:**
- Primary model is attempted first
- If primary fails, fallback chain is followed
- Verbose output shows model selection reasoning

```bash
# Force a fallback scenario (if possible)
npx squad run --model nonexistent-model "test" 2>&1
```

**Expected:** Graceful fallback to next model in chain, not a crash.

## Step 8 — Verify Casting History `[AUTO]`

```bash
npx squad cast --history --json
```

**Expected:** JSON output includes:
- `timestamp` — when the cast occurred
- `universe` — `usual-suspects`
- `agents` — array of agent names/roles
- `config` — casting configuration used

## Step 9 — Verify Config Roundtrip `[AUTO]`

```bash
# Save current config
cp squad.config.ts squad.config.backup.ts

# Load, modify, save, reload
npx squad config get team.name
npx squad config set team.name "roundtrip-test"
npx squad config get team.name
```

**Expected:** `team.name` reads as the new value after set.

```bash
# Restore and verify
cp squad.config.backup.ts squad.config.ts
npx squad config get team.name
```

**Expected:** `team.name` reads as the original value after restore.

---

## Cleanup

```bash
cd / && rm -rf /tmp/squad-e2e-test
```
