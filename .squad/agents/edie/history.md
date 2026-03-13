# Edie — History

## Core Context

### Project & Stack
- **Owner:** Brady
- **Project:** squad-sdk — programmable multi-agent runtime for GitHub Copilot (v1 replatform)
- **Stack:** TypeScript (strict mode, ESM-only), Node.js ≥20, @github/copilot-sdk, Vitest, esbuild
- **Created:** 2026-02-21

### Mission
- Edie owns TypeScript build system, monorepo structure, SDK architecture, type safety
- Focus: Zero-dependency CLI scaffolding, strict mode enforcement, ESM compliance, public API contracts

### TypeScript & Build Standards
- **Strict mode non-negotiable:** `strict: true`, `noUncheckedIndexedAccess: true`, no `@ts-ignore`
- **Declaration files are public API:** Treat `.d.ts` as contracts
- **Generics over unions:** For recurring patterns
- **ESM-only:** No CJS shims, no dual-package hazards
- **Build pipeline:** esbuild for bundling, tsc for type checking
- **Public API:** `src/index.ts` exports everything—this is the contract surface

### Monorepo Architecture
- **Workspaces:** `packages/squad-sdk/` and `packages/squad-cli/` with root orchestrator
- **SDK package:** `@bradygaster/squad-sdk`, ESM-only, exports map with types-first condition, 18 subpath exports (`.`, `./parsers`, `./types`, `./config`, `./skills`, `./agents`, `./cli`, `./builders`, etc.)
- **CLI package:** `@bradygaster/squad-cli`, bin entry `squad`, workspace dep on SDK (version string `"*"` not `workspace:*`)
- **Root tsconfig:** Base config with `"files": []` and project references to both packages
- **Composite builds:** `composite: true` in both packages enables TypeScript project references—required for `tsc --build` to resolve cross-package references
- **npm workspace protocol:** Use `"*"` version string for CLI→SDK dependency (npm workspaces auto-resolve by name)

### Key File Paths
- SDK public API: `packages/squad-sdk/src/index.ts` (barrel, zero side effects)
- CLI entry: `packages/squad-cli/src/cli-entry.ts` (split from index.ts for zero-side-effect library import)
- Builders: `packages/squad-sdk/src/builders/` (types + validation for SDK-First mode)
- Parsers: `packages/squad-sdk/src/parsers.ts` (barrel), type-only barrel at `src/types.ts`
- Resolution: `packages/squad-sdk/src/resolution.ts` (`ensureSquadPathDual()` for dual-root writes)

### SDK-First Builders (Phase 1)
- **8 builder functions:** `defineSquad()`, `defineTeam()`, `defineAgent()`, `defineRouting()`, `defineCeremony()`, `defineHooks()`, `defineCasting()`, `defineTelemetry()`
- **Type surface:** 8 definition interfaces (`TeamDefinition`, `AgentDefinition`, etc.) plus shared primitives (`AgentRef`, `ScheduleExpression`, `BuilderModelId`, `AgentCapability`)
- **Validation:** Manual runtime validation (no zod—not in dependency tree). `assertObject` narrows to `object` not `Record<string, unknown>` to preserve interface property types under `noUncheckedIndexedAccess`
- **Immutability:** All builder types use `readonly` properties and arrays
- **Subpath export:** `./builders` added to `package.json` (types-first condition)

### Migration Command (`squad migrate`)
- **Three paths:** markdown ↔ SDK-First, legacy `.ai-team/` upgrade, interactive mode
- **Type-safe parsing:** Extracts team, agents, routing rules, casting from `.squad/*.md` files—all produce typed objects matching builder types
- **Code generation:** `generateSquadConfig()` produces valid TypeScript with builder syntax, proper string escaping, multiline string handling
- **Flags:** `--to sdk|markdown`, `--from ai-team`, `--dry-run` (prints full generated config without writing)
- **Round-trip fidelity:** `squad migrate --to sdk && squad build` should produce identical `.squad/` output

## Learnings

### 2026-03-07: Squad Migrate Command Complete (#250)

**Deliverable:** `squad migrate` command with three bidirectional paths: markdown ↔ SDK-First, legacy `.ai-team/` upgrade, interactive mode.

**Type-safe parsing strategy:**
- `team.md`: Extract team name from h1, description from blockquote, members from `## Members` table, project context from `## Project Context` section
- `routing.md`: Parse `## Work Type → Agent` table, extract pattern/agent/description from pipe-delimited rows
- `casting/policy.json`: Parse JSON for allowlist universes and capacity
- Agent charters: Parse role from h1 (e.g., `# Edie — TypeScript Engineer`)

**Code generation:** `generateSquadConfig()` produces valid TypeScript with builder syntax, proper string escaping, multiline string handling.

**Round-trip fidelity verified:** `squad migrate --to sdk && squad build` produces identical `.squad/` output.

### 2026-03-05: Builder Type Surface — SDK-First Squad Mode (#194 Phase 1)

**Created:** `packages/squad-sdk/src/builders/types.ts` with 8 definition interfaces plus shared primitives. `packages/squad-sdk/src/builders/index.ts` with 8 builder functions and manual runtime validation.

**Key decisions:**
- `assertObject` narrows to `object` not `Record<string, unknown>` — using `Record` would widen typed parameters and lose interface property types under `noUncheckedIndexedAccess`
- All builder types use `readonly` properties and arrays — immutable contracts
- Types re-exported from `src/types.ts` barrel (type-only, zero runtime). `RoutingRule` aliased as `BuilderRoutingRule` to avoid collision with existing exports
- Functions + types exported from `src/index.ts` barrel. Subpath export `./builders` added to `package.json` (types-first condition)

**Completeness:** Added `description?: string` to `AgentDefinition` (captures tagline from charters) and `RoutingRule` (captures "Examples" column from routing.md). Converted root `squad.config.ts` from old `SquadConfig` type to full builder syntax as real-world proof of markdown→SDK conversion fidelity.

### 2026-02-22: Build System Migration Complete (Monorepo tsconfig + package.json)

**Converted:** Root `tsconfig.json` to base config with `"files": []` and project references to both workspace packages.

**SDK `tsconfig.json`:** Extends root, `composite: true`, `declarationMap: true`, `include: ["src/**/*.ts"]` — no JSX

**CLI `tsconfig.json`:** Extends root, `composite: true`, `jsx: "react-jsx"`, `jsxImportSource: "react"`, includes `*.tsx`, project reference to SDK

**SDK `package.json`:** 18 subpath exports, `@github/copilot-sdk` as dependency, `@types/node` + `typescript` as devDeps

**CLI `package.json`:** `bin.squad` → `./dist/cli-entry.js`, added `ink`, `react` deps, `templates/` in files array

**Root `package.json`:** Stripped to workspace orchestrator — `private: true`, no `main`/`types`/`bin`, only `typescript` + `vitest` in devDeps, build script delegates to `--workspaces`

**Key insight:** `composite: true` required in both packages for TypeScript project references to work — without it, `tsc --build` cannot resolve cross-package references.
