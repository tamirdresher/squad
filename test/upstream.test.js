const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const os = require('os');

const CLI = path.join(__dirname, '..', 'index.js');

function runSquad(args, cwd) {
  try {
    const result = execFileSync(process.execPath, [CLI, ...args], {
      cwd,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { stdout: result, exitCode: 0 };
  } catch (err) {
    return {
      stdout: (err.stdout || '') + (err.stderr || ''),
      exitCode: err.status ?? 1,
    };
  }
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'squad-upstream-test-'));
}

function cleanDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}

function initSquad(dir) {
  const result = runSquad([], dir);
  assert.equal(result.exitCode, 0, `init should succeed: ${result.stdout}`);
  return result;
}

// Create a fake upstream squad directory with content
function createUpstreamSquad(dir) {
  const squadDir = path.join(dir, '.squad');
  fs.mkdirSync(path.join(squadDir, 'skills', 'shared-conventions'), { recursive: true });
  fs.mkdirSync(path.join(squadDir, 'identity'), { recursive: true });
  fs.mkdirSync(path.join(squadDir, 'casting'), { recursive: true });

  fs.writeFileSync(
    path.join(squadDir, 'skills', 'shared-conventions', 'SKILL.md'),
    '---\nname: shared-conventions\nconfidence: high\n---\n\n# Shared Conventions\n\nAlways use kebab-case for file names.\n'
  );

  fs.writeFileSync(
    path.join(squadDir, 'decisions.md'),
    '# Org Decisions\n\n### 2025-01-01: Use TypeScript everywhere\n**By:** Org Lead\n**What:** All new projects must use TypeScript.\n'
  );

  fs.writeFileSync(
    path.join(squadDir, 'identity', 'wisdom.md'),
    '# Org Wisdom\n\n## Patterns\n\n**Pattern:** Always add error boundaries.\n'
  );

  fs.writeFileSync(
    path.join(squadDir, 'casting', 'policy.json'),
    JSON.stringify({ universe_allowlist: ['aliens', 'star-wars'], max_capacity: 10 }, null, 2) + '\n'
  );

  fs.writeFileSync(
    path.join(squadDir, 'routing.md'),
    '# Org Routing\n\n| Work Type | Route To |\n|-----------|----------|\n| Security | SecLead |\n'
  );
}

describe('Upstream inheritance (squad upstream)', () => {
  let repoDir;
  let upstreamDir;

  beforeEach(() => {
    repoDir = makeTempDir();
    upstreamDir = makeTempDir();
    initSquad(repoDir);
    createUpstreamSquad(upstreamDir);
  });

  afterEach(() => {
    cleanDir(repoDir);
    cleanDir(upstreamDir);
  });

  describe('upstream add', () => {
    it('adds a local upstream source', () => {
      const result = runSquad(['upstream', 'add', upstreamDir], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);
      assert.ok(result.stdout.includes('Added upstream'), result.stdout);

      const upstreamFile = path.join(repoDir, '.squad', 'upstream.json');
      assert.ok(fs.existsSync(upstreamFile), 'upstream.json should be created');

      const data = JSON.parse(fs.readFileSync(upstreamFile, 'utf8'));
      assert.equal(data.upstreams.length, 1);
      assert.equal(data.upstreams[0].type, 'local');
    });

    it('adds an upstream with custom --name', () => {
      const result = runSquad(['upstream', 'add', upstreamDir, '--name', 'my-org'], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);

      const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
      assert.equal(data.upstreams[0].name, 'my-org');
    });

    it('rejects duplicate upstream names', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'dupe'], repoDir);
      const result = runSquad(['upstream', 'add', upstreamDir, '--name', 'dupe'], repoDir);
      assert.notEqual(result.exitCode, 0, 'should fail on duplicate');
      assert.ok(result.stdout.includes('already exists'), result.stdout);
    });

    it('detects export JSON source type', () => {
      // Create a fake export file
      const exportPath = path.join(upstreamDir, 'squad-export.json');
      fs.writeFileSync(exportPath, JSON.stringify({
        version: '1.0',
        agents: {},
        casting: {},
        skills: ['---\nname: test-skill\n---\n\n# Test\n']
      }, null, 2));

      const result = runSquad(['upstream', 'add', exportPath], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);

      const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
      assert.equal(data.upstreams[0].type, 'export');
    });

    it('detects git URL source type', () => {
      const result = runSquad(['upstream', 'add', 'https://github.com/org/repo.git', '--name', 'org-repo'], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);

      const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
      assert.equal(data.upstreams[0].type, 'git');
    });

    it('fails without a source argument', () => {
      const result = runSquad(['upstream', 'add'], repoDir);
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Usage'), result.stdout);
    });
  });

  describe('upstream list', () => {
    it('shows empty message when no upstreams configured', () => {
      const result = runSquad(['upstream', 'list'], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);
      assert.ok(result.stdout.includes('No upstreams configured'), result.stdout);
    });

    it('lists configured upstreams', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org-shared'], repoDir);
      const result = runSquad(['upstream', 'list'], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);
      assert.ok(result.stdout.includes('org-shared'), result.stdout);
      assert.ok(result.stdout.includes('local'), result.stdout);
    });
  });

  describe('upstream remove', () => {
    it('removes an upstream by name', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'to-remove'], repoDir);
      // Sync first so inherited content exists
      runSquad(['upstream', 'sync'], repoDir);

      const result = runSquad(['upstream', 'remove', 'to-remove'], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);
      assert.ok(result.stdout.includes('Removed upstream'), result.stdout);

      // Verify upstream.json updated
      const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
      assert.equal(data.upstreams.length, 0);

      // Verify inherited content removed
      assert.ok(!fs.existsSync(path.join(repoDir, '.squad', '_inherited', 'to-remove')));
    });

    it('fails for nonexistent upstream', () => {
      const result = runSquad(['upstream', 'remove', 'nonexistent'], repoDir);
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('not found'), result.stdout);
    });

    it('cleans up empty _inherited directory', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'only-one'], repoDir);
      runSquad(['upstream', 'sync'], repoDir);
      assert.ok(fs.existsSync(path.join(repoDir, '.squad', '_inherited')));

      runSquad(['upstream', 'remove', 'only-one'], repoDir);
      assert.ok(!fs.existsSync(path.join(repoDir, '.squad', '_inherited')));
    });
  });

  describe('upstream sync', () => {
    it('syncs skills from local upstream', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      const result = runSquad(['upstream', 'sync'], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);
      assert.ok(result.stdout.includes('synced'), result.stdout);

      // Verify inherited skills
      const skillPath = path.join(repoDir, '.squad', '_inherited', 'org', 'skills', 'shared-conventions', 'SKILL.md');
      assert.ok(fs.existsSync(skillPath), 'inherited skill should exist');
      const skillContent = fs.readFileSync(skillPath, 'utf8');
      assert.ok(skillContent.includes('shared-conventions'));
    });

    it('syncs decisions from local upstream', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      runSquad(['upstream', 'sync'], repoDir);

      const decisionsPath = path.join(repoDir, '.squad', '_inherited', 'org', 'decisions.md');
      assert.ok(fs.existsSync(decisionsPath), 'inherited decisions should exist');
      const content = fs.readFileSync(decisionsPath, 'utf8');
      assert.ok(content.includes('Use TypeScript everywhere'));
    });

    it('syncs wisdom from local upstream', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      runSquad(['upstream', 'sync'], repoDir);

      const wisdomPath = path.join(repoDir, '.squad', '_inherited', 'org', 'identity', 'wisdom.md');
      assert.ok(fs.existsSync(wisdomPath), 'inherited wisdom should exist');
      const content = fs.readFileSync(wisdomPath, 'utf8');
      assert.ok(content.includes('error boundaries'));
    });

    it('syncs casting policy from local upstream', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      runSquad(['upstream', 'sync'], repoDir);

      const policyPath = path.join(repoDir, '.squad', '_inherited', 'org', 'casting', 'policy.json');
      assert.ok(fs.existsSync(policyPath), 'inherited casting policy should exist');
      const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
      assert.ok(Array.isArray(policy.universe_allowlist));
    });

    it('syncs routing from local upstream', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      runSquad(['upstream', 'sync'], repoDir);

      const routingPath = path.join(repoDir, '.squad', '_inherited', 'org', 'routing.md');
      assert.ok(fs.existsSync(routingPath), 'inherited routing should exist');
      const content = fs.readFileSync(routingPath, 'utf8');
      assert.ok(content.includes('Security'));
    });

    it('writes a manifest marker file', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      runSquad(['upstream', 'sync'], repoDir);

      const manifestPath = path.join(repoDir, '.squad', '_inherited', 'org', '_manifest.json');
      assert.ok(fs.existsSync(manifestPath), 'manifest should exist');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      assert.equal(manifest.source_name, 'org');
      assert.ok(manifest.synced_at);
      assert.equal(manifest.skills_count, 1);
      assert.equal(manifest.has_decisions, true);
      assert.equal(manifest.has_wisdom, true);
      assert.equal(manifest.has_casting_policy, true);
      assert.equal(manifest.has_routing, true);
    });

    it('updates last_synced timestamp in upstream.json', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      const beforeData = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
      assert.equal(beforeData.upstreams[0].last_synced, null);

      runSquad(['upstream', 'sync'], repoDir);
      const afterData = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
      assert.ok(afterData.upstreams[0].last_synced, 'last_synced should be set');
    });

    it('syncs a specific upstream by name', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);

      const result = runSquad(['upstream', 'sync', 'org'], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);
      assert.ok(result.stdout.includes('org'), result.stdout);
      assert.ok(fs.existsSync(path.join(repoDir, '.squad', '_inherited', 'org')));
    });

    it('fails for unknown sync target', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      const result = runSquad(['upstream', 'sync', 'nonexistent'], repoDir);
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('not found'), result.stdout);
    });

    it('syncs from export JSON file', () => {
      // Create export file
      const exportPath = path.join(upstreamDir, 'org-export.json');
      fs.writeFileSync(exportPath, JSON.stringify({
        version: '1.0',
        agents: {},
        casting: { policy: { universe_allowlist: ['blade-runner'] } },
        skills: ['---\nname: exported-skill\nconfidence: medium\n---\n\n# Exported Skill\n\nFrom export.\n']
      }, null, 2));

      runSquad(['upstream', 'add', exportPath, '--name', 'org-export'], repoDir);
      const result = runSquad(['upstream', 'sync'], repoDir);
      assert.equal(result.exitCode, 0, result.stdout);

      const skillPath = path.join(repoDir, '.squad', '_inherited', 'org-export', 'skills', 'exported-skill', 'SKILL.md');
      assert.ok(fs.existsSync(skillPath), 'exported skill should be inherited');
    });

    it('fails when no upstreams configured', () => {
      const result = runSquad(['upstream', 'sync'], repoDir);
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('No upstreams configured'), result.stdout);
    });

    it('re-sync overwrites with fresh content', () => {
      runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
      runSquad(['upstream', 'sync'], repoDir);

      // Modify upstream
      const skillPath = path.join(upstreamDir, '.squad', 'skills', 'shared-conventions', 'SKILL.md');
      fs.writeFileSync(skillPath, '---\nname: shared-conventions\nconfidence: high\n---\n\n# Updated Content\n');

      runSquad(['upstream', 'sync'], repoDir);

      const inheritedSkill = fs.readFileSync(
        path.join(repoDir, '.squad', '_inherited', 'org', 'skills', 'shared-conventions', 'SKILL.md'), 'utf8'
      );
      assert.ok(inheritedSkill.includes('Updated Content'), 'should have fresh content after re-sync');
    });
  });

  describe('multi-level hierarchy', () => {
    it('supports multiple upstreams (org + team)', () => {
      // Create a second upstream (team-level)
      const teamDir = makeTempDir();
      try {
        const teamSquad = path.join(teamDir, '.squad');
        fs.mkdirSync(path.join(teamSquad, 'skills', 'team-patterns'), { recursive: true });
        fs.writeFileSync(
          path.join(teamSquad, 'skills', 'team-patterns', 'SKILL.md'),
          '---\nname: team-patterns\nconfidence: medium\n---\n\n# Team Patterns\n'
        );
        fs.writeFileSync(
          path.join(teamSquad, 'decisions.md'),
          '# Team Decisions\n\n### Use React for all frontends\n'
        );

        runSquad(['upstream', 'add', upstreamDir, '--name', 'org'], repoDir);
        runSquad(['upstream', 'add', teamDir, '--name', 'team'], repoDir);
        const result = runSquad(['upstream', 'sync'], repoDir);
        assert.equal(result.exitCode, 0, result.stdout);
        assert.ok(result.stdout.includes('2/2'), result.stdout);

        // Both upstreams should have their own _inherited dirs
        assert.ok(fs.existsSync(path.join(repoDir, '.squad', '_inherited', 'org', 'skills', 'shared-conventions')));
        assert.ok(fs.existsSync(path.join(repoDir, '.squad', '_inherited', 'team', 'skills', 'team-patterns')));

        // Both decisions visible
        assert.ok(fs.existsSync(path.join(repoDir, '.squad', '_inherited', 'org', 'decisions.md')));
        assert.ok(fs.existsSync(path.join(repoDir, '.squad', '_inherited', 'team', 'decisions.md')));
      } finally {
        cleanDir(teamDir);
      }
    });
  });

  describe('backward compatibility', () => {
    it('repos without upstream.json work exactly as before', () => {
      // Just init, no upstream — everything should still work
      const result = runSquad(['upstream', 'list'], repoDir);
      assert.equal(result.exitCode, 0);
      assert.ok(result.stdout.includes('No upstreams configured'));

      // squad dir should not have _inherited
      assert.ok(!fs.existsSync(path.join(repoDir, '.squad', '_inherited')));
    });
  });

  describe('error handling', () => {
    it('fails gracefully with invalid action', () => {
      const result = runSquad(['upstream', 'badaction'], repoDir);
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Usage'), result.stdout);
    });

    it('fails with no action', () => {
      const result = runSquad(['upstream'], repoDir);
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stdout.includes('Usage'), result.stdout);
    });

    it('handles missing local upstream gracefully on sync', () => {
      // Add a local upstream that points to a path that will be deleted
      const tmpUpstream = makeTempDir();
      createUpstreamSquad(tmpUpstream);
      runSquad(['upstream', 'add', tmpUpstream, '--name', 'gone'], repoDir);
      cleanDir(tmpUpstream);

      const result = runSquad(['upstream', 'sync'], repoDir);
      // Should not crash, should report the error
      assert.ok(result.stdout.includes('not found') || result.stdout.includes('0/1'), result.stdout);
    });
  });
});
