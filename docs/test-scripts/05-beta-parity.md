# 05 — Beta Parity

> **⚠️ INTERNAL ONLY — DO NOT PUBLISH**

Side-by-side comparison tests between the v1 SDK and beta Squad (`.ai-team/` markdown-driven). Validates behavioral equivalence for all core operations.

---

## Setup

```bash
# You need two directories: one with beta Squad, one with v1 SDK
BETA_DIR="/tmp/squad-parity-beta"
V1_DIR="/tmp/squad-parity-v1"

# Set up beta project
mkdir -p $BETA_DIR && cd $BETA_DIR
git init
mkdir -p .ai-team
cat > .ai-team/team.md << 'EOF'
# Test Team
| Role | Agent | Skills |
|------|-------|--------|
| Frontend | Parker | UI, React, CSS |
| Backend | Hicks | API, Node, SQL |
| Docs | McManus | Writing, Markdown |
EOF

cat > .ai-team/routing.md << 'EOF'
| Pattern | Agent |
|---------|-------|
| *frontend* *UI* *CSS* | Parker |
| *backend* *API* *database* | Hicks |
| *docs* *README* *documentation* | McManus |
EOF
git add -A && git commit -m "beta squad setup"

# Set up v1 project
mkdir -p $V1_DIR && cd $V1_DIR
git init
npx squad init
# Configure equivalent team in squad.config.ts
```

---

## Step 1 — Same Prompt → Same Routing Decisions `[HUMAN]`

Test with identical prompts in both environments:

```bash
PROMPTS=(
  "Build a login page with React"
  "Add rate limiting to the API"
  "Update the README with installation steps"
  "Refactor the database queries"
  "Fix the CSS layout on mobile"
)

echo "=== Beta Routing ==="
cd $BETA_DIR
for p in "${PROMPTS[@]}"; do
  echo "Prompt: $p"
  npx squad route "$p" 2>/dev/null || echo "(use beta routing method)"
  echo "---"
done

echo "=== V1 Routing ==="
cd $V1_DIR
for p in "${PROMPTS[@]}"; do
  echo "Prompt: $p"
  npx squad route "$p"
  echo "---"
done
```

**Expected:** Each prompt routes to the same agent in both environments:
- "login page" / "CSS layout" → frontend agent
- "rate limiting" / "database queries" → backend agent
- "README" → docs agent

Document any routing differences. Minor differences in confidence scores are acceptable; different agent selections are not.

## Step 2 — Same Casting Config → Equivalent Team `[HUMAN]`

```bash
cd $V1_DIR
npx squad cast --universe usual-suspects --json > /tmp/v1-cast.json

# Compare agent roles and skills with beta team.md
echo "=== V1 Cast ==="
cat /tmp/v1-cast.json | jq '.agents[] | {name, role, skills}'

echo "=== Beta Team ==="
cat $BETA_DIR/.ai-team/team.md
```

**Expected:**
- Same roles are represented (Frontend, Backend, Docs at minimum)
- Skill sets are equivalent (not necessarily identical names)
- No beta agents are missing from the v1 cast

## Step 3 — Same Config → Same Behavior `[AUTO]`

```bash
cd $V1_DIR

# Export current config
npx squad config export --json > /tmp/v1-config.json

# Reload from exported config and verify
cp /tmp/v1-config.json /tmp/v1-config-reload.json
npx squad config validate /tmp/v1-config-reload.json
```

**Expected:** Config round-trips without validation errors. All fields survive export → import.

```bash
# Compare key config values
npx squad config get team.name
npx squad config get team.root
npx squad config get routing
```

**Expected:** All values match what was set during init.

## Step 4 — Legacy Fallback: .ai-team/ Projects Still Work `[AUTO]`

```bash
cd $BETA_DIR

# Run Squad v1 CLI against a beta (.ai-team/) project
npx squad status
```

**Expected:**
- Squad detects `.ai-team/` directory
- Activates legacy fallback mode
- Reports team status from markdown files
- Does NOT require `squad.config.ts`

```bash
# Verify routing works through legacy fallback
npx squad route "Build a login page"
```

**Expected:** Routes correctly using `routing.md` patterns, same as beta behavior.

```bash
# Verify legacy fallback is explicitly noted in output
npx squad status 2>&1 | grep -i "legacy\|fallback\|ai-team"
```

**Expected:** Output indicates legacy/fallback mode is active.

## Step 5 — No Regressions in Core Functionality `[AUTO]`

Run the automated parity test suite to confirm:

```bash
cd /path/to/squad-sdk
npm test -- --grep "parity" 2>&1 | tail -20
```

**Expected:** All 131 parity+compat tests pass.

```bash
# Run the full test suite for completeness
npm test 2>&1 | tail -5
```

**Expected:** 937 tests pass, 0 failures.

## Step 6 — Comparison Summary `[HUMAN]`

Fill in this table based on the above results:

| Capability | Beta | V1 SDK | Parity? | Notes |
|-----------|------|--------|---------|-------|
| Routing (label-based) | ✅ | ✅ | ☐ | |
| Routing (pattern-based) | ✅ | ✅ | ☐ | |
| Team casting | ✅ | ✅ | ☐ | |
| Agent execution | ✅ | ✅ | ☐ | |
| Streaming | ❌ | ✅ | N/A | New in v1 |
| Cost tracking | ❌ | ✅ | N/A | New in v1 |
| Config validation | ❌ | ✅ | N/A | New in v1 |
| Legacy fallback | N/A | ✅ | ☐ | |
| Issue integration | ✅ | ✅ | ☐ | |
| PR integration | ✅ | ✅ | ☐ | |

Mark each row ✅ (parity confirmed), ⚠️ (minor difference), or ❌ (regression).

---

## Cleanup

```bash
rm -rf $BETA_DIR $V1_DIR /tmp/v1-cast.json /tmp/v1-config.json /tmp/v1-config-reload.json
```
