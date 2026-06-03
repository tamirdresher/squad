/**
 * Shared helper for resolving the `squad_state` MCP launch spec.
 *
 * Used by BOTH `squad init` and `squad upgrade` so the runtime-MCP fallback
 * behavior stays symmetric. Without this, init can pin `@bradygaster/squad-cli@<unpublished>`
 * which E404s on the npm registry, leaving the bridge unwired even when upgrade
 * would have correctly fallen back to `@insider`.
 *
 * See `.squad/files/validation/REVAL-ITER4-multiplayer-sudoku.md` for the
 * INIT-vs-UPGRADE asymmetry that motivated this extraction.
 */
export async function resolveSquadStateMcpSpec(cliVersion: string): Promise<string> {
  const pinned = `@bradygaster/squad-cli@${cliVersion}`;
  if (!cliVersion || cliVersion === '0.0.0') return '@bradygaster/squad-cli@insider';
  const { isSquadCliVersionPublished } = await import('./npm-registry.js');
  const published = await isSquadCliVersionPublished(cliVersion);
  return published ? pinned : '@bradygaster/squad-cli@insider';
}
