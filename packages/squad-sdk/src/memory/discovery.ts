import path from 'node:path';
import { realpath } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import type { StorageProvider } from '../storage/storage-provider.js';
import type { MemoryProvider } from './index.js';

export interface MemoryProviderModuleConfig {
  /** Local project JavaScript module, relative to the project root (or contained absolute path). */
  module: string;
  /** Explicit acknowledgement that this project module executes with process privileges. */
  trusted: true;
  options?: Record<string, unknown>;
}

export interface MemoryProviderFactoryContext {
  projectRoot: string;
  squadRoot: string;
  options: Record<string, unknown>;
}

export interface DiscoveredMemoryProvider {
  provider: MemoryProvider;
  module: string;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateProvider(value: unknown): asserts value is MemoryProvider {
  if (!record(value) || typeof value.id !== 'string' || !value.id.trim()
    || ['local', 'copilot', 'hostInjectedCopilotAdapter'].includes(value.id)
    || typeof value.name !== 'string' || !value.name.trim()
    || !Array.isArray(value.supportedClasses) || value.supportedClasses.length === 0
    || !value.supportedClasses.every(item => ['LOCAL', 'DECISION', 'POLICY'].includes(item))
    || !['status', 'write', 'search', 'delete'].every(key => typeof value[key] === 'function')) {
    throw new Error('Trusted memory provider factory returned an invalid or reserved provider');
  }
}

/** Project customization, not a sandbox. Never loads URLs, packages, or paths outside the project. */
export async function discoverMemoryProviders(
  storage: StorageProvider,
  squadRoot: string,
  existingIds: readonly string[] = [],
): Promise<DiscoveredMemoryProvider[]> {
  const content = await storage.read(path.join(squadRoot, 'config.json'));
  if (content === null || content === undefined) return [];
  const config: unknown = JSON.parse(content);
  if (!record(config)) throw new Error('Squad project configuration must be an object');
  if (config.memory === undefined) return [];
  if (!record(config.memory)) throw new Error('Squad memory configuration must be an object');
  if (config.memory.providers === undefined) return [];
  if (!Array.isArray(config.memory.providers)) throw new Error('memory.providers must be an array');
  if (config.memory.providers.length === 0) return [];

  const projectRoot = await realpath(path.dirname(squadRoot));
  const resolvedSquadRoot = await realpath(squadRoot);
  const squadRelative = path.relative(projectRoot, resolvedSquadRoot);
  if (squadRelative === '..' || squadRelative.startsWith(`..${path.sep}`) || path.isAbsolute(squadRelative)) {
    throw new Error('Memory provider configuration escapes the trusted project root');
  }
  const entries = await Promise.all(config.memory.providers.map(async (entry: unknown) => {
    if (!record(entry) || typeof entry.module !== 'string' || !entry.module.trim()
      || entry.trusted !== true || (entry.options !== undefined && !record(entry.options))) {
      throw new Error('Each memory provider requires module, trusted: true, and optional object options');
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(entry.module) && !path.isAbsolute(entry.module)) {
      throw new Error('Memory provider modules must be local project paths, not URLs');
    }
    const modulePath = await realpath(path.resolve(projectRoot, entry.module));
    const relative = path.relative(projectRoot, modulePath);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error('Memory provider module escapes the trusted project root');
    }
    if (!['.js', '.mjs', '.cjs'].includes(path.extname(modulePath))) {
      throw new Error('Memory provider module must be compiled JavaScript');
    }
    return { modulePath, relative, options: entry.options ?? {} };
  }));
  // Validate all paths and acknowledgements before executing any configured code.
  const ids = new Set(existingIds);
  const discovered: DiscoveredMemoryProvider[] = [];
  for (const entry of entries) {
    const module: unknown = await import(pathToFileURL(entry.modulePath).href);
    if (!record(module) || typeof module.createMemoryProvider !== 'function') {
      throw new Error('Memory provider module must export createMemoryProvider(context)');
    }
    const provider: unknown = await module.createMemoryProvider({
      projectRoot, squadRoot: resolvedSquadRoot, options: entry.options,
    } satisfies MemoryProviderFactoryContext);
    validateProvider(provider);
    if (ids.has(provider.id)) throw new Error(`Registered memory provider ids must be unique: ${provider.id}`);
    ids.add(provider.id);
    discovered.push({ provider, module: entry.relative });
  }
  return discovered;
}
