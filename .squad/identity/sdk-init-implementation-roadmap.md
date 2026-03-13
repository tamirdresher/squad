# SDK Init Implementation Roadmap

> Deep dive analysis and implementation plan for `squad init --sdk`

**Author:** EECOM (Core Dev)  
**Date:** 2025-03-08  
**Purpose:** Trace the complete init flow, identify gaps, and roadmap fixes for the unified PRD

---

## 1. CURRENT INIT FLOW — END-TO-END TRACE

### 1.1 CLI Entry → Init Handler

**File:** `packages/squad-cli/src/cli-entry.ts`

```
Line 227: if (cmd === 'init')
Line 228-241: Parse --mode, --global, --no-workflows, --sdk flags
Line 246: Call runInit(dest, { includeWorkflows, sdk })
```

**What happens:**
- `--sdk` flag is captured and passed to `runInit()` as `options.sdk`
- No other init-time processing — flag is just forwarded

### 1.2 runInit → SDK initSquad

**File:** `packages/squad-cli/src/cli/core/init.ts`

```typescript
Line 87: export async function runInit(dest: string, options: RunInitOptions = {})
Line 106-125: Build SDK InitOptions object
Line 116: configFormat: options.sdk ? 'sdk' : 'markdown'
Line 138: result = await sdkInitSquad(initOptions)
```

**What happens:**
- CLI options are transformed into SDK `InitOptions`
- `configFormat` is set to `'sdk'` when `--sdk` is true
- Only **Scribe** is included in the agents array (hardcoded line 110-115)
- **NO coordinator prompts at this stage** — that only happens in the REPL shell

### 1.3 SDK initSquad → File Generation

**File:** `packages/squad-sdk/src/config/init.ts`

```typescript
Line 530: export async function initSquad(options: InitOptions): Promise<InitResult>
Line 573-591: Create .squad/ directory structure
Line 594-637: Create .squad/config.json (NOT squad.config.ts)
Line 640-657: Create config file (squad.config.ts OR squad.config.json OR skip)
Line 646: configFileName = configFormat === 'sdk' ? 'squad.config.ts' : ...
Line 649: configContent = configFormat === 'sdk' ? generateSDKBuilderConfig(options) : ...
Line 664-678: Create agent directories and files (charter.md, history.md)
Line 745-770: Create team.md (empty roster)
Line 774-793: Create routing.md
```

**What files are created (--sdk path):**

1. `.squad/` directory structure
2. `.squad/config.json` — squad settings (platform, extraction, etc.)
3. `squad.config.ts` — SDK builder config (defineSquad/defineTeam/defineAgent)
4. `.squad/agents/scribe/charter.md`
5. `.squad/agents/scribe/history.md`
6. `.squad/identity/now.md`
7. `.squad/identity/wisdom.md`
8. `.squad/ceremonies.md`
9. `.squad/decisions.md`
10. `.squad/team.md` — **empty roster** (no Members table entries)
11. `.squad/routing.md`
12. `.squad/templates/` (if includeTemplates)
13. `.github/workflows/` (if includeWorkflows)
14. `squad.agent.md` (Copilot prompt template)
15. `.init-prompt` (if options.prompt is provided)

**CRITICAL GAP:** `squad.config.ts` is generated with hardcoded Scribe only. No entries for team members that will be added later.

---

## 2. REPL AUTO-CAST FLOW (PHASE 1 + PHASE 2)

### 2.1 Shell Launch → Init Mode Detection

**File:** `packages/squad-cli/src/cli/shell/lifecycle.ts`

```typescript
Line 58-100: async initialize()
Line 82: this.discoveredAgents = parseTeamManifest(teamContent)
Line 84-90: If no agents found, check for .init-prompt file
```

**What happens:**
- Shell reads `team.md`
- If `## Members` table is empty, enters "Auto-Cast Mode"
- If `.init-prompt` exists (from `squad init "prompt"`), uses that prompt
- Otherwise, prompts user to describe project

### 2.2 Init Mode → Coordinator Proposal (Phase 1)

**File:** `packages/squad-cli/src/cli/shell/index.ts`

```typescript
Line 382: async function handleInitCast(parsed: ParsedInput, skipConfirmation?: boolean)
Line 386-393: Check for .init-prompt file
Line 402-415: Create Init Mode coordinator session
Line 410: const initSysPrompt = buildInitModePrompt({ teamRoot })
Line 419-435: Send prompt and collect response
Line 438: const proposal = parseCastResponse(accumulated)
```

**What happens:**
- Creates a **temporary coordinator session** with Init Mode prompt
- Init Mode prompt (from `coordinator.ts`) instructs coordinator to propose a team
- Response is parsed into a `CastProposal` (name, role, scope, universe)
- **NO file writes yet** — just a proposal

**Init Mode Prompt:** `packages/squad-cli/src/cli/shell/coordinator.ts` line 42-86

### 2.3 User Confirmation → Finalize Cast (Phase 2)

**File:** `packages/squad-cli/src/cli/shell/index.ts`

```typescript
Line 456-474: If not skipConfirmation, show proposal and wait for y/n
Line 489: async function finalizeCast(proposal: CastProposal, parsed: ParsedInput)
Line 492: const result = await createTeam(teamRoot, proposal)
```

**What happens:**
- User confirms with "y"
- `createTeam()` is called (from `cast.ts`)
- **All team files are created** (see section 2.4)
- Re-dispatches original user message to the new team

### 2.4 createTeam → File Generation

**File:** `packages/squad-cli/src/cli/core/cast.ts`

```typescript
Line 367: export async function createTeam(teamRoot: string, proposal: CastProposal)
Line 380-411: Create agent directories (charter.md, history.md)
Line 414-457: Update team.md (insert Members table)
Line 459-486: Update routing.md (insert routing table)
Line 489-525: Create casting/ files (registry.json, history.json, policy.json)
```

**What files are created/updated:**

1. `.squad/agents/{name}/charter.md` (for each member)
2. `.squad/agents/{name}/history.md` (for each member)
3. `.squad/team.md` — **updated** with Members table
4. `.squad/routing.md` — **updated** with routing table
5. `.squad/casting/registry.json` — agent registry
6. `.squad/casting/history.json` — casting snapshot
7. `.squad/casting/policy.json` — universe policy

**CRITICAL GAP:** `squad.config.ts` is **NOT** updated with new team members.

---

## 3. ADD TEAM MEMBER FLOW

### 3.1 During Phase 2 (REPL auto-cast)

**Current State:**
- Members are added by `createTeam()` function
- Files created: charter.md, history.md
- Files updated: team.md, routing.md, casting/registry.json

**Gap:**
- `squad.config.ts` is **NOT** updated with new `defineAgent()` entries

### 3.2 After Phase 2 (manual add later)

**Current State:**
- **NO built-in command** for adding team members after init
- Users must manually:
  1. Create `.squad/agents/{name}/` directory
  2. Write `charter.md` and `history.md`
  3. Update `team.md` Members table
  4. Update `routing.md` routing table
  5. Update `.squad/casting/registry.json`
  6. **Manually update `squad.config.ts`** (if using --sdk mode)

**Gap:**
- No `squad hire` or `squad add-member` command exists
- No automated flow for adding members to SDK config

---

## 4. REMOVE TEAM MEMBER FLOW

### 4.1 Current State

**NO built-in remove flow exists.**

Users must manually:
1. Remove agent directory (`.squad/agents/{name}/`)
2. Remove from `team.md` Members table
3. Remove from `routing.md` routing table
4. Remove from `.squad/casting/registry.json`
5. **Manually remove from `squad.config.ts`** (if using --sdk mode)

**Gap:**
- No `squad remove-member` command
- No cleanup utilities
- No squad.config.ts sync

---

## 5. RALPH & @COPILOT PLACEMENT

### 5.1 Ralph (Work Monitor)

**Current State:**
- Ralph is **automatically added** by `createTeam()` if not already present
- Charter template exists in `cast.ts` (line 329-336)
- Added to team.md, routing.md, casting/registry.json

**Gap:**
- Ralph is **NOT** added to `squad.config.ts` during auto-cast
- No `defineAgent('ralph', ...)` entry

**Where Ralph SHOULD be created:**
- During `createTeam()` when casting a team (auto-cast Phase 2) ✅ (partially works)
- During `squad init --sdk` if user provides a prompt ❌ (missing)
- Ralph should be in `squad.config.ts` ❌ (missing)

### 5.2 @copilot (Coding Agent)

**Current State:**
- `squad copilot` command exists (`packages/squad-cli/src/cli/commands/copilot.ts`)
- Command can add/remove @copilot entry in `team.md`
- Creates `.squad/agents/copilot/` directory

**Gap:**
- `copilot` command does **NOT** update `squad.config.ts`
- No `defineAgent('copilot', ...)` entry is added

**Where @copilot SHOULD be offered:**
- During `squad init` (optional, with flag like `--with-copilot`) ❌ (missing)
- Via `squad copilot` command (currently only updates team.md) ⚠️ (partial)

---

## 6. CASTINGENGINE INTEGRATION

### 6.1 Current State

**File:** `packages/squad-sdk/src/casting/casting-engine.ts`

```typescript
export class CastingEngine {
  getUniverses(): UniverseId[]
  getUniverse(id: UniverseId): UniverseTemplate | undefined
  castTeam(config: CastingConfig): CastMember[]
}
```

**What it does:**
- Provides universe templates (Usual Suspects, Ocean's Eleven)
- Maps roles to characters with personality and backstory
- Returns `CastMember[]` with name, role, personality, backstory

**Gap:**
- CastingEngine is **NEVER called** during CLI init
- Init Mode coordinator uses an **LLM prompt** to generate teams (not CastingEngine)
- No integration point exists

### 6.2 Where CastingEngine SHOULD be integrated

**Option A: Replace Init Mode prompt with CastingEngine**
- Pro: Deterministic, no LLM needed for team proposals
- Con: Less flexible, no user input interpretation
- Integration point: `handleInitCast()` in shell/index.ts

**Option B: Use CastingEngine to AUGMENT proposals**
- Pro: Keeps LLM flexibility, adds structured character data
- Con: More complex flow
- Integration point: After `parseCastResponse()`, before `createTeam()`

**Option C: Offer CastingEngine as an alternative init mode**
- Pro: Clean separation, users can choose
- Con: Adds CLI complexity
- Integration point: New flag like `--use-casting-engine` or `--universe <name>`

**Recommended:** Option B
- Keep Init Mode LLM for flexibility
- After parsing proposal, call `CastingEngine.castTeam()` to enrich members with personality/backstory
- Merge into charter.md generation

### 6.3 Integration API

**Proposed flow:**

```typescript
// In handleInitCast(), after parseCastResponse()
const proposal = parseCastResponse(accumulated);
if (!proposal) { /* error */ }

// NEW: Enrich with CastingEngine
const engine = new CastingEngine();
const enrichedMembers = enrichWithCasting(proposal, engine);
proposal.members = enrichedMembers;

// Continue to finalizeCast()
```

**New function:**

```typescript
function enrichWithCasting(
  proposal: CastProposal, 
  engine: CastingEngine
): CastMember[] {
  const universeId = mapUniverseName(proposal.universe);
  const roles = proposal.members.map(m => m.role as AgentRole);
  
  const castMembers = engine.castTeam({
    universe: universeId,
    teamSize: proposal.members.length,
    requiredRoles: roles,
  });
  
  // Merge cast data into proposal members
  return proposal.members.map((m, i) => ({
    ...m,
    personality: castMembers[i]?.personality || personalityForRole(m.role),
    backstory: castMembers[i]?.backstory || '',
  }));
}
```

**Where to add:** `packages/squad-cli/src/cli/shell/index.ts` (near handleInitCast)

---

## 7. IMPLEMENTATION ROADMAP

### 7.1 Fix 1: squad.config.ts Sync During Auto-Cast

**Problem:** `squad.config.ts` is not updated when team members are added during auto-cast.

**Files to modify:**
1. `packages/squad-cli/src/cli/core/cast.ts` — `createTeam()` function
2. New utility: `packages/squad-cli/src/cli/core/squad-config-sync.ts`

**What to change:**
- Add a check: if `squad.config.ts` exists in teamRoot
- Parse existing config using TypeScript AST or regex
- Append `defineAgent()` entries for new members
- Write back to `squad.config.ts`

**Dependencies:**
- Requires AST parser (TypeScript compiler API) or regex-based append
- Risk: High complexity for AST parsing, medium for regex

**Test files:**
- `test/init-sdk.test.ts` — add test for auto-cast + config sync
- `test/cast-parser.test.ts` — verify squad.config.ts update

**Risk Assessment:** 🟡 Medium
- AST parsing adds dependency on `typescript` package
- Regex-based append is fragile but simpler
- Edge case: User has customized squad.config.ts structure

---

### 7.2 Fix 2: squad.config.ts Update During CLI Init

**Problem:** `squad init --sdk` only creates Scribe in squad.config.ts, missing Ralph and other agents.

**Files to modify:**
1. `packages/squad-sdk/src/config/init.ts` — `initSquad()` function
2. `packages/squad-sdk/src/config/init.ts` — `generateSDKBuilderConfig()` function

**What to change:**
- Include Ralph in the default agents array when `configFormat === 'sdk'`
- Update `generateSDKBuilderConfig()` to include all agents from `options.agents`

**Code change:**

```typescript
// In initSquad(), line ~660-678
if (configFormat === 'sdk') {
  // Add Ralph to agents if not present
  const sdkAgents = [...agents];
  const hasRalph = agents.some(a => a.name === 'ralph');
  if (!hasRalph) {
    sdkAgents.push({ name: 'ralph', role: 'ralph', displayName: 'Ralph' });
  }
  
  // Generate config with all agents
  const configContent = generateSDKBuilderConfig({
    ...options,
    agents: sdkAgents,
  });
}
```

**Dependencies:** None

**Test files:**
- `test/init-sdk.test.ts` — verify Ralph is in squad.config.ts
- `test/init.test.ts` — verify Scribe and Ralph are both present

**Risk Assessment:** 🟢 Low
- Simple fix, no breaking changes

---

### 7.3 Fix 3: Add `squad hire` Command

**Problem:** No built-in command to add team members after init.

**Files to create:**
1. `packages/squad-cli/src/cli/commands/hire.ts` (new)

**Files to modify:**
1. `packages/squad-cli/src/cli-entry.ts` — add routing for `hire` command

**What to implement:**

```typescript
// New command: squad hire [--name <name>] [--role <role>]
export async function runHire(options: HireOptions): Promise<void> {
  // 1. Prompt for name and role (if not provided)
  // 2. Create .squad/agents/{name}/ directory
  // 3. Generate charter.md and history.md
  // 4. Update team.md Members table
  // 5. Update routing.md routing table
  // 6. Update .squad/casting/registry.json
  // 7. If squad.config.ts exists, append defineAgent() entry
  // 8. Success message
}
```

**Dependencies:**
- Reuse `generateCharter()` and `generateHistory()` from `cast.ts`
- Reuse squad.config.ts sync utility from Fix 1

**Test files:**
- `test/hire.test.ts` (new)

**Risk Assessment:** 🟡 Medium
- Requires interactive prompts (use `enquirer` or similar)
- squad.config.ts sync is complex

---

### 7.4 Fix 4: Add `squad remove-member` Command

**Problem:** No built-in command to remove team members.

**Files to create:**
1. `packages/squad-cli/src/cli/commands/remove-member.ts` (new)

**Files to modify:**
1. `packages/squad-cli/src/cli-entry.ts` — add routing

**What to implement:**

```typescript
// New command: squad remove-member <name>
export async function runRemoveMember(name: string): Promise<void> {
  // 1. Confirm removal (interactive prompt)
  // 2. Delete .squad/agents/{name}/ directory
  // 3. Remove from team.md Members table
  // 4. Remove from routing.md routing table
  // 5. Remove from .squad/casting/registry.json
  // 6. If squad.config.ts exists, remove defineAgent() entry
  // 7. Success message
}
```

**Dependencies:**
- squad.config.ts sync utility from Fix 1

**Test files:**
- `test/remove-member.test.ts` (new)

**Risk Assessment:** 🟡 Medium
- Removing from squad.config.ts is error-prone
- Risk of orphaned references in other files

---

### 7.5 Fix 5: @copilot Integration in Init

**Problem:** No way to add @copilot during `squad init`.

**Files to modify:**
1. `packages/squad-cli/src/cli-entry.ts` — add `--with-copilot` flag
2. `packages/squad-cli/src/cli/core/init.ts` — handle flag
3. `packages/squad-sdk/src/config/init.ts` — include @copilot agent

**What to change:**

```typescript
// In cli-entry.ts, line ~246
const withCopilot = args.includes('--with-copilot');
runInit(dest, { includeWorkflows, sdk, withCopilot });

// In init.ts, pass to SDK
const initOptions: InitOptions = {
  // ...
  agents: [
    { name: 'scribe', role: 'scribe', displayName: 'Scribe' },
    ...(options.withCopilot ? [{ name: 'copilot', role: 'developer', displayName: 'Copilot' }] : []),
  ],
};
```

**Dependencies:** None

**Test files:**
- `test/init.test.ts` — verify @copilot is created with flag

**Risk Assessment:** 🟢 Low

---

### 7.6 Fix 6: CastingEngine Integration

**Problem:** CastingEngine exists but is never used during init.

**Files to modify:**
1. `packages/squad-cli/src/cli/shell/index.ts` — `handleInitCast()` function
2. `packages/squad-cli/src/cli/core/cast.ts` — add enrichment function

**What to implement:**

```typescript
// In handleInitCast(), after parseCastResponse()
import { CastingEngine } from '@bradygaster/squad-sdk/casting';

const proposal = parseCastResponse(accumulated);
if (!proposal) { /* error */ }

// NEW: Enrich with CastingEngine
const engine = new CastingEngine();
const enrichedProposal = enrichWithCasting(proposal, engine);

// Show proposal with enriched data
await finalizeCast(enrichedProposal, parsed);
```

**New function in cast.ts:**

```typescript
export function enrichWithCasting(
  proposal: CastProposal,
  engine: CastingEngine
): CastProposal {
  // Map universe name to CastingEngine universe ID
  const universeId = mapUniverseName(proposal.universe);
  
  // Cast team using CastingEngine
  const roles = proposal.members.map(m => m.role as AgentRole);
  const castMembers = engine.castTeam({
    universe: universeId,
    teamSize: proposal.members.length,
    requiredRoles: roles,
  });
  
  // Merge casting data into proposal
  const enrichedMembers = proposal.members.map((m, i) => ({
    ...m,
    personality: castMembers[i]?.personality || personalityForRole(m.role),
    backstory: castMembers[i]?.backstory || '',
  }));
  
  return { ...proposal, members: enrichedMembers };
}

function mapUniverseName(name: string): UniverseId {
  if (/usual suspects/i.test(name)) return 'usual-suspects';
  if (/ocean.*eleven/i.test(name)) return 'oceans-eleven';
  return 'usual-suspects'; // fallback
}
```

**Dependencies:**
- Requires exporting `AgentRole` type from casting-engine.ts
- Update `generateCharter()` to use personality and backstory from enriched data

**Test files:**
- `test/casting.test.ts` — verify enrichment works
- `test/init-autocast.test.ts` — verify end-to-end flow

**Risk Assessment:** 🟡 Medium
- Universe name mapping is heuristic
- Requires refactoring charter generation

---

### 7.7 Fix 7: Ralph Creation During Init

**Problem:** Ralph is not created during `squad init --sdk` with a prompt.

**Files to modify:**
1. `packages/squad-sdk/src/config/init.ts` — `initSquad()` function

**What to change:**
- When `options.prompt` is provided, include Ralph in agents array
- When `configFormat === 'sdk'`, include Ralph in squad.config.ts

**Code change:**

```typescript
// In initSquad(), after agents are defined
if (options.prompt || configFormat === 'sdk') {
  // Ensure Ralph is included
  const hasRalph = agents.some(a => a.name === 'ralph');
  if (!hasRalph) {
    agents.push({ name: 'ralph', role: 'ralph', displayName: 'Ralph' });
  }
}
```

**Dependencies:** None

**Test files:**
- `test/init-prompt.test.ts` — verify Ralph is created

**Risk Assessment:** 🟢 Low

---

## 8. DEPENDENCY GRAPH

```
Fix 1 (squad.config.ts sync utility)
  ↓
Fix 2 (CLI init Ralph)
Fix 3 (squad hire command) ← depends on Fix 1
Fix 4 (squad remove-member) ← depends on Fix 1
Fix 5 (@copilot init flag)
Fix 6 (CastingEngine integration)
Fix 7 (Ralph during init)
```

**Critical Path:**
1. Fix 1 (sync utility) → enables all other fixes
2. Fix 2 (Ralph in init) → low-hanging fruit
3. Fix 7 (Ralph with prompt) → completes Ralph story
4. Fix 6 (CastingEngine) → high value, medium risk
5. Fix 3 (hire command) → user-facing feature
6. Fix 4 (remove command) → nice-to-have
7. Fix 5 (@copilot flag) → bonus feature

---

## 9. OPEN QUESTIONS

### 9.1 squad.config.ts Sync Strategy

**Question:** Should we use AST parsing or regex for squad.config.ts updates?

**Options:**
- **AST (TypeScript Compiler API):** Precise, handles complex syntax, heavy dependency
- **Regex:** Simple, fragile, works for 90% of cases
- **Template-based:** Replace entire file, loses user customizations

**Recommendation:** Start with regex, upgrade to AST if issues arise.

### 9.2 CastingEngine vs LLM Proposals

**Question:** Should CastingEngine replace the LLM-based Init Mode prompt?

**Options:**
- **Replace:** Deterministic, no LLM needed, less flexible
- **Augment:** Keep LLM for flexibility, use CastingEngine to enrich
- **Parallel:** Offer both modes (flag to choose)

**Recommendation:** Augment. Keep LLM for user intent parsing, use CastingEngine for character data.

### 9.3 Ralph as a Default vs Optional

**Question:** Should Ralph always be created, or opt-in?

**Current behavior:** Ralph is auto-added during auto-cast, but NOT during `squad init --sdk`.

**Options:**
- **Always include Ralph:** Simplifies the mental model
- **Opt-in with flag:** `--with-ralph` (more flexible)
- **Auto-include in SDK mode only:** Matches current auto-cast behavior

**Recommendation:** Always include Ralph (both init paths). He's a core team member.

---

## 10. SUMMARY

### Current State
- `squad init --sdk` creates minimal files (Scribe only in squad.config.ts)
- Auto-cast (REPL Phase 1 + 2) creates full team but doesn't sync squad.config.ts
- No commands for adding/removing members after init
- CastingEngine exists but is never used
- Ralph is inconsistently created

### Fixes Required
1. squad.config.ts sync during auto-cast
2. Ralph in CLI init
3. `squad hire` command
4. `squad remove-member` command
5. @copilot init flag
6. CastingEngine integration
7. Ralph during init with prompt

### Implementation Order
1. Fix 1 (sync utility) — foundation
2. Fix 2, 7 (Ralph fixes) — quick wins
3. Fix 6 (CastingEngine) — high value
4. Fix 3, 4, 5 (commands & flags) — polish

---

**Next Steps:**
1. Review this roadmap with Brady
2. Prioritize fixes for unified PRD
3. Create GitHub issues for each fix
4. Assign to team members based on expertise

**END OF ROADMAP**
