# SDK Init — Deep Technical Analysis

**By:** CAPCOM (SDK Expert)  
**Date:** 2025-01-25  
**Status:** Draft for PRD Input

---

## Executive Summary

`squad init --sdk` is **partially implemented but incomplete**. The CLI generates `squad.config.ts` with SDK builder syntax (`defineSquad`, `defineAgent`), but:

1. **CastingEngine is bypassed** — CLI uses a hardcoded personality generator instead of the themed universe templates
2. **Config/team sync is one-way** — Adding/removing members updates markdown files but never touches `squad.config.ts`
3. **Ralph and @copilot are added inconsistently** — Init adds Scribe only; Ralph appears in CLI casting but not SDK init
4. **No CastingEngine integration path** — The SDK has a CastingEngine, but no code calls `castTeam()`
5. **Init prompt hardcodes universe selection** — Coordinator picks a universe, but it's never used for actual casting

---

## Finding 1: squad.config.ts Generation

### Current Implementation

**File:** `packages/squad-sdk/src/config/init.ts`  
**Lines:** 646-653, 339-376

When `squad init --sdk` is run (or `configFormat: 'sdk'` is passed to `initSquad()`):

```typescript
// Line 646-653
const configFileName = configFormat === 'sdk' ? 'squad.config.ts' : 
                       configFormat === 'typescript' ? 'squad.config.ts' : 'squad.config.json';
configPath = join(teamRoot, configFileName);
const configContent = configFormat === 'sdk' ? generateSDKBuilderConfig(options) :
                      configFormat === 'typescript' ? generateTypeScriptConfig(options) :
                      generateJsonConfig(options);

await writeIfNotExists(configPath, configContent);
```

The `generateSDKBuilderConfig()` function (lines 339-376) creates:

```typescript
import {
  defineSquad,
  defineTeam,
  defineAgent,
} from '@bradygaster/squad-sdk';

const scribe = defineAgent({
  name: 'scribe',
  role: 'scribe',
  description: 'Scribe',
  status: 'active',
});

export default defineSquad({
  version: '1.0.0',

  team: defineTeam({
    name: 'my-project',
    description: 'Project description if provided',
    members: ['scribe'],
  }),

  agents: [scribe],
});
```

### What It Does

✅ Generates valid TypeScript with SDK builder syntax  
✅ Creates `defineAgent()` calls for each agent in the `InitOptions.agents` array  
✅ Uses proper imports from `@bradygaster/squad-sdk`

### What It Doesn't Do

❌ **Never includes Ralph** — The `InitOptions` from `cli/core/init.ts:109-115` only includes `scribe`  
❌ **Never includes @copilot** — The copilot agent is only added via `team-md.ts:insertCopilotSection()`  
❌ **No universe or personality** — Agents have generic role/description only  
❌ **Hardcoded to one agent** — The CLI passes only `scribe`, even though the function supports multiple

### Entry Point

**File:** `packages/squad-cli/src/cli/core/init.ts`  
**Lines:** 106-125

```typescript
const initOptions: InitOptions = {
  teamRoot: dest,
  projectName: path.basename(dest) || 'my-project',
  agents: [
    {
      name: 'scribe',
      role: 'scribe',
      displayName: 'Scribe',
    }
  ],
  configFormat: options.sdk ? 'sdk' : 'markdown',
  // ...
};

result = await sdkInitSquad(initOptions);
```

**Critical gap:** The CLI init command only passes `scribe`. The interactive shell (REPL) init flow creates a full team via `createTeam()` in `cast.ts`, which generates charter.md/history.md files but **never updates squad.config.ts**.

### What Should Happen

1. **Parse `--sdk` flag** in CLI init command
2. If `--sdk` AND a prompt is provided, use `CastingEngine.castTeam()` to generate the full team roster
3. Pass all cast members (Lead, Developer, Tester, etc.) to `initSquad()` in the `agents` array
4. `generateSDKBuilderConfig()` should emit `defineAgent()` for all members, including Scribe and Ralph
5. Optionally include personality/backstory in agent definitions if CastingEngine data is passed through

### Complexity

**Small** — The infrastructure exists; we just need to:
- Call `CastingEngine.castTeam()` before `initSquad()`
- Map `CastMember[]` to `InitAgentSpec[]`
- Add Ralph to the hardcoded built-ins list

---

## Finding 2: CastingEngine — The Unused Template System

### Current Implementation

**File:** `packages/squad-sdk/src/casting/casting-engine.ts`  
**Lines:** 1-310

The CastingEngine is a complete, well-designed casting system:

```typescript
export class CastingEngine {
  castTeam(config: CastingConfig): CastMember[] {
    // Phase 1: Fill required roles by best-fit
    // Phase 2: Fill remaining slots with unassigned characters
  }
}
```

### Available Universes

1. **The Usual Suspects** (lines 62-115)
   - Characters: Keyser, McManus, Fenster, Verbal, Hockney, Redfoot, Edie, Kobayashi
   - Each has: name, personality, backstory, preferredRoles[]

2. **Ocean's Eleven** (lines 117-182)
   - Characters: Danny, Rusty, Linus, Basher, Livingston, Saul, Yen, Virgil, Turk, Reuben

Each character includes:
- `personality`: One-line trait (e.g., "Quietly commanding; sees the whole board")
- `backstory`: Short narrative (e.g., "A legendary figure who orchestrates from the shadows")
- `preferredRoles`: Array of roles this character excels at (e.g., `['lead']`, `['developer', 'reviewer']`)

### The Problem

**Nobody calls `castTeam()`.**

Searching the entire codebase:
- ❌ No imports of `CastingEngine`
- ❌ No calls to `castTeam()`
- ❌ No universe selection logic that feeds into CastingEngine

### The CLI Bypass

**File:** `packages/squad-cli/src/cli/core/cast.ts`  
**Lines:** 218-241, 250-300

Instead of using CastingEngine, the CLI has:

```typescript
function personalityForRole(role: string): string {
  const lower = role.toLowerCase();
  if (/lead|architect|tech\s*lead/.test(lower))
    return 'Sees the big picture without losing sight of the details...';
  if (/frontend|ui|design/.test(lower))
    return 'Pixel-aware and user-obsessed...';
  // ... 8 more hardcoded role patterns
  return 'Focused and reliable. Gets the job done without fanfare.';
}

function generateCharter(member: CastMember): string {
  return `# ${member.name} — ${member.role}

> ${personalityForRole(member.role)}

## Identity
- **Name:** ${member.name}
- **Role:** ${member.role}
...
`;
}
```

**Why this is bad:**
- Duplicates logic already in CastingEngine
- Loses universe theming (no Keyser, no Danny Ocean)
- Generic personalities instead of rich backstories
- No character-to-role matching algorithm

### What Should Happen

1. **Replace `personalityForRole()` with CastingEngine**
   - Import `CastingEngine` from `@bradygaster/squad-sdk`
   - Call `engine.castTeam({ universe, requiredRoles, teamSize })` instead of parsing coordinator response into generic members
   - Use `CastMember.personality` and `CastMember.backstory` in charter generation

2. **Wire coordinator universe selection to CastingEngine**
   - Coordinator picks a universe (already does this in `buildInitModePrompt`)
   - Parse `UNIVERSE: Alien` from response
   - Map "Alien" → custom universe, or "The Usual Suspects" → `'usual-suspects'`
   - Pass to `castTeam()`

3. **Generate defineAgent() calls with personality**
   - Extend `InitAgentSpec` to include `personality?: string`, `backstory?: string`
   - `generateSDKBuilderConfig()` emits these fields if present

### Complexity

**Medium** — Requires:
- Import CastingEngine into CLI
- Map coordinator universe names to CastingEngine IDs (or extend CastingEngine to accept freeform names)
- Modify `generateCharter()` to accept pre-built personality/backstory
- Update `createTeam()` to call CastingEngine instead of hardcoded logic

---

## Finding 3: CLI Casting Flow — How It Actually Works

### Current Flow (REPL Init)

**File:** `packages/squad-cli/src/cli/shell/index.ts`  
**Lines:** 834-953

1. User enters REPL with no team → `handleInitCast()` is called
2. Coordinator is invoked with `buildInitModePrompt()` (lines 859-860)
3. Coordinator responds with:
   ```
   INIT_TEAM:
   - Ripley | Lead | Architecture, code review
   - Dallas | Frontend Dev | React, components
   UNIVERSE: Alien
   PROJECT: A React app
   ```
4. `parseCastResponse()` extracts members into `CastProposal` (line 892)
5. `createTeam(teamRoot, proposal)` generates:
   - `.squad/agents/{name}/charter.md` (using `generateCharter()`)
   - `.squad/agents/{name}/history.md`
   - `.squad/team.md` (Members table)
   - `.squad/routing.md` (Work Type → Agent table)
   - `.squad/casting/registry.json`
   - `.squad/casting/history.json`
   - `.squad/casting/policy.json`

### Built-in Agents

**File:** `packages/squad-cli/src/cli/core/cast.ts`  
**Lines:** 320-336, 380-386

```typescript
function scribeMember(): CastMember {
  return { name: 'Scribe', role: 'Session Logger', ... };
}

function ralphMember(): CastMember {
  return { name: 'Ralph', role: 'Work Monitor', ... };
}

// In createTeam():
const hasScribe = proposal.members.some(m => /scribe/i.test(m.name));
if (!hasScribe) allMembers.push(scribeMember());

const hasRalph = proposal.members.some(m => /ralph/i.test(m.name));
if (!hasRalph) allMembers.push(ralphMember());
```

✅ **CLI casting adds Ralph** — The REPL init flow correctly appends Ralph  
❌ **SDK init does NOT add Ralph** — `initSquad()` only gets `[{ name: 'scribe', ... }]`

### @copilot Handling

**File:** `packages/squad-cli/src/cli/core/team-md.ts`  
**Lines:** 28-88

The @copilot section is **manually inserted** into team.md via:
- `insertCopilotSection(content, autoAssign)` — Injects a Markdown table row
- `removeCopilotSection(content)` — Strips it out

This is **separate from** the agent roster. @copilot is not:
- In `.squad/agents/copilot/charter.md`
- In `squad.config.ts` agents array
- In `registry.json`

It's a **pseudo-agent** — a UI affordance only.

### What Should Happen

1. **Ralph should be in SDK init agents array** — Modify `cli/core/init.ts:109-115` to include Ralph
2. **@copilot should be optional** — If `--copilot` flag is set, add it as a real agent OR keep it as a markdown-only pseudo-agent (design decision needed)
3. **REPL init should update squad.config.ts** — After `createTeam()` generates markdown files, call `generateSDKBuilderConfig()` and write it

### Complexity

**Trivial** — Ralph fix is a one-line change  
**Medium** — Config sync requires wiring `createTeam()` → `generateSDKBuilderConfig()`

---

## Finding 4: Init Flow Entry Point

### CLI Command Entry

**File:** `packages/squad-cli/src/cli/core/init.ts`  
**Lines:** 87-183

```bash
squad init --sdk "Build a React app"
```

Flow:
1. `runInit(dest, { sdk: true, prompt: "Build a React app" })` called
2. Creates `InitOptions` with only `scribe` in agents array (line 109-115)
3. Calls `sdkInitSquad(initOptions)` (line 138)
4. SDK writes:
   - `squad.config.ts` (if `--sdk` flag set)
   - `.squad/agents/scribe/charter.md`
   - `.squad/agents/scribe/history.md`
   - `.squad/team.md` (minimal, no roster)
   - `.squad/.init-prompt` (stores the prompt for REPL auto-cast)

**Critical:** The CLI init does NOT cast a full team. It writes the prompt to `.squad/.init-prompt` and expects the user to run `squad` (REPL) to trigger `handleInitCast()`.

### REPL Entry

**File:** `packages/squad-cli/src/cli/shell/index.ts`  
**Lines:** 834-953

When REPL starts and team.md has no roster:
1. Check for `.squad/.init-prompt` (line 839-847)
2. If found, use that prompt instead of user message
3. Call `buildInitModePrompt()` → coordinator picks universe/roles
4. Parse response → `createTeam()` → generate all files

### The Disconnect

- CLI `squad init --sdk` writes config but no team
- REPL auto-cast generates team but doesn't update config
- Result: **squad.config.ts has only Scribe, team.md has full roster**

### What Should Happen

**Option A: CLI does full casting**
1. `squad init --sdk "prompt"` calls CastingEngine immediately
2. Generates full `squad.config.ts` with all agents
3. Generates all charter/history files
4. No REPL step needed

**Option B: Two-phase init (current design)**
1. CLI creates skeleton + stores prompt
2. REPL auto-cast generates team
3. **FIX:** REPL writes `squad.config.ts` after casting

### Complexity

**Option A: Medium** — Requires CLI to invoke coordinator or CastingEngine directly  
**Option B: Small** — Just add config write to `createTeam()` or `finalizeCast()`

---

## Finding 5: Coordinator Init Prompt — Universe Selection

### Current Implementation

**File:** `packages/squad-cli/src/cli/shell/coordinator.ts`  
**Lines:** 42-86

```typescript
export function buildInitModePrompt(config: CoordinatorConfig): string {
  return `You are the Squad Coordinator in Init Mode.

Your job: Propose a team of 4-5 AI agents based on what the user wants to do.

## Rules
1. Analyze the user's message to understand the project
2. Pick a fictional universe for character names (e.g., Alien, The Usual Suspects, ...)
3. Propose 4-5 agents with roles that match the project needs
4. Scribe and Ralph are always included automatically — do NOT include them

## Response Format — you MUST use this EXACT format:

INIT_TEAM:
- {Name} | {Role} | {scope}
UNIVERSE: {universe name}
PROJECT: {1-sentence project description}
`;
}
```

### What Happens

1. Coordinator picks a universe (e.g., "Alien")
2. Coordinator invents character names fitting that universe (Ripley, Dallas, Kane)
3. CLI parses `UNIVERSE: Alien` from the response
4. **Universe is stored in `casting/history.json` but never used for logic**

### The Gap

- Coordinator picks "Alien" but there's no "Alien" template in CastingEngine
- CastingEngine has "The Usual Suspects" and "Ocean's Eleven" hardcoded
- No mapping from freeform universe → CastingEngine template
- Coordinator can invent **any** universe, but we can't cast from it

### What Should Happen

**Option A: Guide coordinator to existing universes**
```typescript
2. Pick ONE of these universes: The Usual Suspects, Ocean's Eleven
```

**Option B: Extend CastingEngine to support freeform universes**
```typescript
castTeam({
  universe: 'custom',
  customNames: { lead: 'Ripley', developer: 'Dallas', tester: 'Lambert' }
})
```

**Option C: Pre-seed coordinator with CastingEngine universes**
```typescript
buildInitModePrompt(config: { availableUniverses: ['usual-suspects', 'oceans-eleven'] })
```

### Complexity

**Option A: Trivial** — Update prompt text  
**Option B: Small** — CastingEngine already supports `universe: 'custom'` (lines 210-221, 256-270)  
**Option C: Small** — Pass universes to prompt builder

---

## Finding 6: Config/Team Sync Gap

### The Problem

When you add or remove agents via REPL or `squad migrate`, the system updates:
- `.squad/team.md` (Members table)
- `.squad/routing.md` (Work Type table)
- `.squad/casting/registry.json` (Agent metadata)

But **never updates `squad.config.ts`**.

### Evidence

**File:** `packages/squad-cli/src/cli/core/cast.ts`  
**Lines:** 367-526

`createTeam()` generates:
- ✅ `team.md` (line 414-456)
- ✅ `routing.md` (line 459-486)
- ✅ `registry.json` (line 502-504)
- ✅ `history.json` (line 518-519)
- ✅ `policy.json` (line 522-523)
- ❌ `squad.config.ts` — **No code path**

**File:** `packages/squad-cli/src/cli/commands/migrate.ts`  
**Lines:** 438-483

`migrate --to sdk` generates `squad.config.ts` from existing team.md, but this is a **one-time migration**, not an ongoing sync.

### What Should Happen

1. **Add `updateSquadConfig()` function** in `cli/core/cast.ts`
   - Read current `squad.config.ts`
   - Parse AST (or use regex) to find `agents: [...]`
   - Replace with new agent list
   - Write back to disk

2. **Call it from `createTeam()`** after writing other files

3. **Add to `build` command** — `squad build` already reads `squad.config.ts` and generates markdown; make it bidirectional

### Complexity

**Large** — Requires:
- AST parsing or regex-based editing of TypeScript
- Preserving formatting/comments
- Handling edge cases (custom agents, non-standard syntax)
- Testing across all config formats

**Alternative: Config-as-source-of-truth**
- **Don't sync** — Make `squad.config.ts` the canonical source
- `squad build` regenerates markdown from config
- Markdown becomes read-only output
- Already partially implemented in `build.ts`

---

## Finding 7: Ralph and @copilot Gaps

### Ralph

**In REPL Init (cast.ts):**
```typescript
const hasRalph = proposal.members.some(m => /ralph/i.test(m.name));
if (!hasRalph) allMembers.push(ralphMember());
```
✅ Ralph is added to team.md, charter.md, history.md, registry.json

**In SDK Init (init.ts:109-115):**
```typescript
agents: [
  { name: 'scribe', role: 'scribe', displayName: 'Scribe' }
]
```
❌ Ralph is missing from squad.config.ts

**Fix:** Add Ralph to the hardcoded agents array.

**Complexity:** Trivial (one line change)

### @copilot

**Current behavior:**
- @copilot is a **UI-only pseudo-agent** inserted via `team-md.ts:insertCopilotSection()`
- It's a Markdown table row with capabilities guidance
- **Not** a real agent with charter.md or history.md
- **Not** in squad.config.ts

**Design question:**
1. Keep @copilot as pseudo-agent? (Current behavior)
2. Make @copilot a real agent with charter.md?
3. Add @copilot to squad.config.ts as a special agent type?

**If option 2/3:** Modify `createTeam()` and `generateSDKBuilderConfig()` to include @copilot.

**Complexity:**
- **Option 1 (no change):** Trivial
- **Option 2/3 (real agent):** Small

---

## Recommendations by Priority

### P0: Critical for MVP

1. **Add Ralph to SDK init agents array** (trivial)
   - File: `packages/squad-cli/src/cli/core/init.ts:109-115`
   - Change: Add `{ name: 'ralph', role: 'work-monitor', displayName: 'Ralph' }`

2. **Guide coordinator to existing CastingEngine universes** (trivial)
   - File: `packages/squad-cli/src/cli/shell/coordinator.ts:52`
   - Change: Replace "Pick a fictional universe" with "Pick ONE: The Usual Suspects, Ocean's Eleven"

3. **Decide config sync strategy** (design decision → medium implementation)
   - Option A: Config-as-source-of-truth (squad.config.ts canonical, markdown is output)
   - Option B: Bidirectional sync (update config when markdown changes)
   - Recommend **Option A** — simpler, already 50% implemented in `build.ts`

### P1: High Value

4. **Integrate CastingEngine into CLI casting** (medium)
   - Replace `personalityForRole()` with `CastingEngine.castTeam()`
   - Use universe-themed characters instead of generic roles
   - Emit personality/backstory in `defineAgent()` calls

5. **REPL init writes squad.config.ts** (small)
   - After `createTeam()` in `finalizeCast()`, call `generateSDKBuilderConfig()`
   - Write to `squad.config.ts` if `configFormat === 'sdk'`

### P2: Nice to Have

6. **Extend CastingEngine for freeform universes** (small)
   - Map coordinator-invented universe names to custom character pools
   - Or pre-seed more universe templates (Apollo 13, Star Wars, etc.)

7. **Make @copilot a real agent** (design decision → small implementation)
   - Add charter.md, history.md for @copilot
   - Include in squad.config.ts agents array
   - Or keep as pseudo-agent (document this explicitly)

---

## Files to Modify (by Finding)

### Finding 1: squad.config.ts Generation
- `packages/squad-cli/src/cli/core/init.ts` (lines 109-125) — Add Ralph to agents array
- `packages/squad-sdk/src/config/init.ts` (lines 339-376) — Extend `generateSDKBuilderConfig()` to accept personality/backstory

### Finding 2: CastingEngine Integration
- `packages/squad-cli/src/cli/core/cast.ts` (lines 218-300) — Replace `personalityForRole()` with CastingEngine
- `packages/squad-cli/src/cli/shell/index.ts` (lines 892-935) — Call `CastingEngine.castTeam()` before `createTeam()`

### Finding 3: CLI Casting Flow
- `packages/squad-cli/src/cli/core/cast.ts` (lines 367-526) — Add `updateSquadConfig()` call to `createTeam()`

### Finding 4: Init Flow Entry
- `packages/squad-cli/src/cli/shell/index.ts` (lines 959-962) — Add config write to `finalizeCast()`

### Finding 5: Coordinator Init Prompt
- `packages/squad-cli/src/cli/shell/coordinator.ts` (lines 52) — Update prompt to specify exact universes

### Finding 6: Config/Team Sync
- **New file:** `packages/squad-cli/src/cli/core/config-sync.ts` — Config AST editing utilities
- `packages/squad-cli/src/cli/commands/build.ts` — Make config-as-source-of-truth canonical

### Finding 7: Ralph and @copilot
- `packages/squad-cli/src/cli/core/init.ts` (line 114) — Add Ralph agent
- `packages/squad-cli/src/cli/core/team-md.ts` (lines 28-88) — Document @copilot as pseudo-agent OR convert to real agent

---

## Next Steps

1. **PRD Decision Points:**
   - Config sync strategy (A: config-as-source, B: bidirectional)
   - @copilot agent type (pseudo-agent vs. real agent)
   - Universe selection (guide to existing vs. freeform + custom mapping)

2. **Implementation Phases:**
   - Phase 1: P0 fixes (Ralph, universe guidance, sync decision)
   - Phase 2: CastingEngine integration
   - Phase 3: Full bidirectional sync (if chosen)

3. **Documentation:**
   - Update README with `squad init --sdk` behavior
   - Document config-as-source-of-truth pattern
   - Add universe selection guide for users

---

**End of Technical Analysis**
