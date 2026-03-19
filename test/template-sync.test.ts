/**
 * Template Directory Sync Tests
 *
 * Ensures template files stay in sync across all template directories.
 * The Squad repo maintains templates in multiple locations that must be identical:
 *   - templates/                          (source of truth)
 *   - .squad-templates/                   (installed template)
 *   - packages/squad-cli/templates/       (CLI package)
 *   - packages/squad-sdk/templates/       (SDK package)
 *
 * See: https://github.com/bradygaster/squad/issues/461
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = join(__dirname, '..');

// Template directories that must stay in sync
const SOURCE_DIR = join(REPO_ROOT, 'templates');
const SYNC_DIRS = [
  join(REPO_ROOT, '.squad-templates'),
  join(REPO_ROOT, 'packages', 'squad-cli', 'templates'),
  join(REPO_ROOT, 'packages', 'squad-sdk', 'templates'),
];

// Files that are allowed to differ between directories
const ALLOWED_DIFFERENCES: Record<string, string> = {
  // SDK uses 'project-conventions' instead of 'squad-conventions'
  'skills/project-conventions/SKILL.md': 'skills/squad-conventions/SKILL.md',
};

// Files that only exist in some directories (not required everywhere)
const OPTIONAL_FILES = new Set([
  'skills/nap/SKILL.md',     // only in .squad-templates
  'package.json',            // may not be in SDK templates
  'ralph-triage.js',         // may not be in SDK templates
]);

/**
 * Recursively list all files in a directory, returning relative paths.
 */
function listFilesRecursive(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, base));
    } else {
      files.push(relative(base, fullPath).replace(/\\/g, '/'));
    }
  }
  return files.sort();
}

describe('Template Directory Sync', () => {
  const sourceFiles = listFilesRecursive(SOURCE_DIR);

  it('source templates/ directory should exist and have files', () => {
    expect(existsSync(SOURCE_DIR)).toBe(true);
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  for (const syncDir of SYNC_DIRS) {
    const dirName = relative(REPO_ROOT, syncDir).replace(/\\/g, '/');

    describe(`${dirName}`, () => {
      it('directory should exist', () => {
        expect(existsSync(syncDir)).toBe(true);
      });

      it('should contain all required source files', () => {
        const targetFiles = new Set(listFilesRecursive(syncDir));
        const missing: string[] = [];

        for (const file of sourceFiles) {
          if (OPTIONAL_FILES.has(file)) continue;

          // Check if an allowed rename mapping exists
          const renamedKey = Object.entries(ALLOWED_DIFFERENCES)
            .find(([_, src]) => src === file);
          if (renamedKey && targetFiles.has(renamedKey[0])) continue;

          if (!targetFiles.has(file)) {
            missing.push(file);
          }
        }

        if (missing.length > 0) {
          expect.fail(
            `${dirName} is missing ${missing.length} file(s) from templates/:\n` +
            missing.map(f => `  - ${f}`).join('\n')
          );
        }
      });

      it('shared files should have identical content', () => {
        const mismatches: string[] = [];

        for (const file of sourceFiles) {
          if (OPTIONAL_FILES.has(file)) continue;

          const sourcePath = join(SOURCE_DIR, file);
          let targetPath = join(syncDir, file);

          // Handle allowed renames
          if (!existsSync(targetPath)) {
            const renamedKey = Object.entries(ALLOWED_DIFFERENCES)
              .find(([_, src]) => src === file);
            if (renamedKey) {
              targetPath = join(syncDir, renamedKey[0]);
            }
          }

          if (!existsSync(targetPath)) continue; // covered by "contains all files" test

          const sourceContent = readFileSync(sourcePath, 'utf-8');
          const targetContent = readFileSync(targetPath, 'utf-8');

          if (sourceContent !== targetContent) {
            mismatches.push(file);
          }
        }

        if (mismatches.length > 0) {
          expect.fail(
            `${dirName} has ${mismatches.length} file(s) out of sync with templates/:\n` +
            mismatches.map(f => `  - ${f}`).join('\n')
          );
        }
      });
    });
  }
});

describe('Casting System Consistency', () => {
  const policyFiles = [
    join(REPO_ROOT, 'templates', 'casting-policy.json'),
    join(REPO_ROOT, '.squad-templates', 'casting-policy.json'),
    join(REPO_ROOT, 'packages', 'squad-cli', 'templates', 'casting-policy.json'),
    join(REPO_ROOT, 'packages', 'squad-sdk', 'templates', 'casting-policy.json'),
  ];

  it('all casting-policy.json files should be identical', () => {
    const contents = policyFiles
      .filter(f => existsSync(f))
      .map(f => ({ path: relative(REPO_ROOT, f), content: readFileSync(f, 'utf-8') }));

    expect(contents.length).toBeGreaterThanOrEqual(2);

    const reference = contents[0];
    for (const file of contents.slice(1)) {
      expect(file.content, `${file.path} differs from ${reference.path}`).toBe(reference.content);
    }
  });

  it('casting-policy.json universe count should match squad.agent.md claim', () => {
    const policyPath = join(REPO_ROOT, 'templates', 'casting-policy.json');
    if (!existsSync(policyPath)) return;

    const policy = JSON.parse(readFileSync(policyPath, 'utf-8'));
    const actualCount = policy.allowlist_universes.length;

    // Check all squad.agent.md files
    const agentMdPaths = [
      join(REPO_ROOT, 'templates', 'squad.agent.md'),
      join(REPO_ROOT, '.squad-templates', 'squad.agent.md'),
      join(REPO_ROOT, 'packages', 'squad-cli', 'templates', 'squad.agent.md'),
      join(REPO_ROOT, 'packages', 'squad-sdk', 'templates', 'squad.agent.md'),
      join(REPO_ROOT, '.github', 'agents', 'squad.agent.md'),
    ];

    for (const mdPath of agentMdPaths) {
      if (!existsSync(mdPath)) continue;
      const content = readFileSync(mdPath, 'utf-8');
      const match = content.match(/(\d+)\s+universes\s+available/);
      if (match) {
        const claimedCount = parseInt(match[1], 10);
        expect(
          claimedCount,
          `${relative(REPO_ROOT, mdPath)} claims ${claimedCount} universes but casting-policy.json has ${actualCount}`
        ).toBe(actualCount);
      }
    }
  });

  it('casting-reference.md should exist in all template directories', () => {
    const expectedPaths = [
      join(REPO_ROOT, 'templates', 'casting-reference.md'),
      join(REPO_ROOT, '.squad-templates', 'casting-reference.md'),
      join(REPO_ROOT, 'packages', 'squad-cli', 'templates', 'casting-reference.md'),
      join(REPO_ROOT, 'packages', 'squad-sdk', 'templates', 'casting-reference.md'),
    ];

    const missing = expectedPaths
      .filter(p => !existsSync(p))
      .map(p => relative(REPO_ROOT, p));

    if (missing.length > 0) {
      expect.fail(
        `casting-reference.md missing from:\n` +
        missing.map(f => `  - ${f}`).join('\n')
      );
    }
  });

  it('all casting-reference.md files should be identical', () => {
    const refPaths = [
      join(REPO_ROOT, 'templates', 'casting-reference.md'),
      join(REPO_ROOT, '.squad-templates', 'casting-reference.md'),
      join(REPO_ROOT, 'packages', 'squad-cli', 'templates', 'casting-reference.md'),
      join(REPO_ROOT, 'packages', 'squad-sdk', 'templates', 'casting-reference.md'),
    ];

    const contents = refPaths
      .filter(f => existsSync(f))
      .map(f => ({ path: relative(REPO_ROOT, f), content: readFileSync(f, 'utf-8') }));

    if (contents.length < 2) return; // casting-reference.md may not exist yet

    const reference = contents[0];
    for (const file of contents.slice(1)) {
      expect(file.content, `${file.path} differs from ${reference.path}`).toBe(reference.content);
    }
  });

  it('casting-policy.json universe_capacity keys should match allowlist_universes', () => {
    const policyPath = join(REPO_ROOT, 'templates', 'casting-policy.json');
    if (!existsSync(policyPath)) return;

    const policy = JSON.parse(readFileSync(policyPath, 'utf-8'));
    const allowlist = new Set(policy.allowlist_universes);
    const capacityKeys = new Set(Object.keys(policy.universe_capacity));

    const inAllowlistOnly = [...allowlist].filter(u => !capacityKeys.has(u));
    const inCapacityOnly = [...capacityKeys].filter(u => !allowlist.has(u));

    expect(
      inAllowlistOnly,
      `Universes in allowlist but missing from universe_capacity: ${inAllowlistOnly.join(', ')}`
    ).toHaveLength(0);

    expect(
      inCapacityOnly,
      `Universes in universe_capacity but missing from allowlist: ${inCapacityOnly.join(', ')}`
    ).toHaveLength(0);
  });
});
