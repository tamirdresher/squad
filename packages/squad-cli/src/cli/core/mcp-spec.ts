/**
 * Shared helper for resolving the `squad_state` MCP launch spec.
 *
 * Used by BOTH `squad init` and `squad upgrade` so the runtime-MCP fallback
 * behavior stays symmetric. Without this, init can pin `@bradygaster/squad-cli@<unpublished>`
 * which E404s on the npm registry, leaving the bridge unwired even when upgrade
 * would have correctly fallen back to `@insider`.
 *
 * Resolution order (iter-6):
 *   1. If `cliVersion` IS published on npm → `npx -y <pkg>@<version> state-mcp`
 *      (clean cross-machine UX, the steady-state happy path).
 *   2. Else if the `@insider` dist-tag is reachable → `npx -y <pkg>@insider state-mcp`.
 *      Carryover from iter-4 (data-15 Option A).
 *   3. Else fall back to the locally-installed package on disk and invoke its
 *      cli-entry directly via `node <pkgRoot>/dist/cli-entry.js state-mcp`.
 *      This is the dev-mode bridge: during in-flight preview validation we
 *      install a tarball locally but never publish it; without this branch
 *      `npx` would E404 and Copilot would load NOTHING for squad_state.
 *      The local-install path is verified to exist on disk before being
 *      returned, and a stderr breadcrumb is emitted so the user can tell
 *      that they are running against an unpublished tarball.
 *   4. If none of the three resolve → throw. A silent `npx` E404 at session
 *      start is worse than a loud config error.
 *
 * See `.squad/files/validation/COMBINED-FIX-BRANCH-MANIFEST.md` (Iter-6) and
 * smoke data-27/data-28 for the motivating evidence.
 */

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface SquadStateMcpSpec {
  /** Executable to spawn (e.g. `npx` or absolute path to `node`). */
  command: string;
  /** Argv for the executable. */
  args: string[];
  /** How the spec was resolved — useful for logging + tests. */
  source: 'pinned' | 'insider' | 'local';
}

const PACKAGE_NAME = '@bradygaster/squad-cli';
const INSIDER_REGISTRY_URL =
  'https://registry.npmjs.org/@bradygaster%2Fsquad-cli/insider';

/** Reset internal caches (test-only helper). */
export function _resetMcpSpecCache(): void {
  insiderCache = undefined;
}

let insiderCache: boolean | undefined;

export interface ResolveSquadStateMcpSpecOptions {
  /**
   * Override the local-install lookup. Tests inject this to simulate a
   * resolvable / unresolvable package install without touching the real
   * `node_modules`.
   */
  localPackageResolver?: () => string | null;
  /**
   * Override the @insider availability check. Tests inject this to avoid
   * real network traffic.
   */
  insiderAvailabilityProbe?: () => Promise<boolean>;
}

/**
 * Resolve the squad_state MCP launch spec given the running CLI version.
 *
 * NEVER returns a spec it cannot validate end-to-end:
 *   - npx paths are gated on a real registry HEAD response (via
 *     `isSquadCliVersionPublished` / `INSIDER_REGISTRY_URL`).
 *   - The local path is gated on `existsSync(...)` of the resolved
 *     cli-entry.js. A missing file falls through to the next branch.
 *
 * Throws when no branch resolves so the caller can surface a clear
 * configuration error instead of writing a broken mcp-config that fails
 * at Copilot session start.
 */
export async function resolveSquadStateMcpSpec(
  cliVersion: string,
  options: ResolveSquadStateMcpSpecOptions = {},
): Promise<SquadStateMcpSpec> {
  // 1. Try the pinned version on the public registry. Skip for placeholder
  //    versions ('', '0.0.0') — the registry will obviously not have them.
  if (cliVersion && cliVersion !== '0.0.0') {
    const { isSquadCliVersionPublished } = await import('./npm-registry.js');
    const published = await isSquadCliVersionPublished(cliVersion);
    if (published) {
      return {
        command: 'npx',
        args: ['-y', `${PACKAGE_NAME}@${cliVersion}`, 'state-mcp'],
        source: 'pinned',
      };
    }
  }

  // 2. Fall back to the @insider dist-tag if it's reachable.
  const probe = options.insiderAvailabilityProbe ?? defaultInsiderProbe;
  if (insiderCache === undefined) {
    insiderCache = await probe();
  }
  if (insiderCache) {
    return {
      command: 'npx',
      args: ['-y', `${PACKAGE_NAME}@insider`, 'state-mcp'],
      source: 'insider',
    };
  }

  // 3. Fall back to the locally-installed package on disk (dev-mode).
  const resolver = options.localPackageResolver ?? defaultLocalPackageResolver;
  const localEntry = resolver();
  if (localEntry && existsSync(localEntry)) {
    // Loud-but-not-fatal breadcrumb so the dev knows they're not on npm.
    try {
      process.stderr.write(
        `[squad] state-mcp pinned to local install: ${localEntry}` +
          ` (version ${cliVersion || '<unknown>'} not published on npm)\n`,
      );
    } catch {
      // stderr write failure must not block spec resolution.
    }
    return {
      command: process.execPath,
      args: [localEntry, 'state-mcp'],
      source: 'local',
    };
  }

  // 4. All three branches failed — hard error.
  throw new Error(
    `Unable to resolve squad_state MCP launch spec: version ` +
      `${cliVersion || '<unknown>'} is not published on npm, the ` +
      `${PACKAGE_NAME}@insider dist-tag is unreachable, and no local install ` +
      `of ${PACKAGE_NAME} could be located on disk (looked for ` +
      `<pkg-root>/dist/cli-entry.js).`,
  );
}

async function defaultInsiderProbe(timeoutMs = 2000): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (v: boolean) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    void import('node:https')
      .then(({ request }) => {
        const req = request(INSIDER_REGISTRY_URL, { method: 'GET' }, (res) => {
          res.resume();
          finish(res.statusCode === 200);
        });
        req.on('error', () => finish(false));
        req.on('timeout', () => {
          req.destroy();
          finish(false);
        });
        req.setTimeout(timeoutMs);
        req.end();
      })
      .catch(() => finish(false))
      .finally(() => clearTimeout(timer));
  });
}

/**
 * Find an absolute path to the locally-installed squad-cli's `cli-entry.js`.
 * Tries, in order:
 *   1. `require.resolve('<pkg>/package.json')` — works whenever the running
 *      process can see the package in its module resolution tree (e.g.
 *      installed via `npm i -g`, `npm link`, or local tarball).
 *   2. `process.argv[1]` — when this very process IS the squad CLI we can
 *      just point back at our own entry file. Handles the case where the
 *      package isn't otherwise resolvable (PNP, exotic loaders).
 *   3. `import.meta.url` walking — last-ditch: walk up from the running
 *      module file until we find a `package.json` with the right `name`.
 *
 * Returns null when no entry is found; the caller treats that as "no local
 * install" and falls through to the hard-error branch.
 */
function defaultLocalPackageResolver(): string | null {
  // Attempt 1: require.resolve from this module.
  try {
    const require = createRequire(import.meta.url);
    const pkgJsonPath = require.resolve(`${PACKAGE_NAME}/package.json`);
    const pkgRoot = path.dirname(pkgJsonPath);
    const entry = path.join(pkgRoot, 'dist', 'cli-entry.js');
    if (existsSync(entry)) return entry;
  } catch {
    /* fall through */
  }

  // Attempt 2: walk up from this module's directory to find the owning
  // package.json (we're shipped INSIDE @bradygaster/squad-cli, so the
  // nearest package.json above us is the one we want).
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let depth = 0; depth < 8; depth++) {
      const candidate = path.join(dir, 'package.json');
      if (existsSync(candidate)) {
        const entry = path.join(dir, 'dist', 'cli-entry.js');
        if (existsSync(entry)) return entry;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    /* fall through */
  }

  // Attempt 3: process.argv[1] (the running binary).
  try {
    const argv1 = process.argv[1];
    if (argv1 && existsSync(argv1) && /cli-entry\.(c|m)?js$/.test(argv1)) {
      return argv1;
    }
  } catch {
    /* fall through */
  }

  return null;
}
