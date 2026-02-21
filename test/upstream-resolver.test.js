/**
 * Tests that the coordinator resolver correctly reads upstream content
 * at session start — proving that org-level decisions, skills, wisdom,
 * casting policy, and routing are actually discovered and usable.
 *
 * This tests the exact logic the coordinator follows per squad.agent.md
 * § "Inherited Context (Upstream Sources)".
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const os = require('os');

const { resolveUpstreams, buildInheritedContextBlock, buildSessionDisplay } = require('../upstream-resolver');

const CLI = path.join(__dirname, '..', 'index.js');

function runSquad(args, cwd) {
  try {
    const result = execFileSync(process.execPath, [CLI, ...args], {
      cwd, encoding: 'utf8', timeout: 30000,
      env: { ...process.env, NO_COLOR: '1' },
    });
    return { stdout: result, exitCode: 0 };
  } catch (err) {
    return { stdout: (err.stdout || '') + (err.stderr || ''), exitCode: err.status ?? 1 };
  }
}

function cleanDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

describe('Coordinator resolver: upstream content is read and used', () => {
  let orgDir, teamDir, repoDir;

  before(() => {
    // ── ORG REPO: shared standards ──
    orgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-resolver-org-'));
    execSync('git init', { cwd: orgDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: orgDir, stdio: 'pipe' });
    execSync('git config user.email "t@t.com"', { cwd: orgDir, stdio: 'pipe' });

    const orgSquad = path.join(orgDir, '.squad');

    // Org skill: error handling
    fs.mkdirSync(path.join(orgSquad, 'skills', 'error-handling'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'skills', 'error-handling', 'SKILL.md'),
      '---\nname: error-handling\nconfidence: high\n---\n\n# Error Handling\n\n' +
      'Always wrap HTTP errors in ProblemDetails format (RFC 7807).\n' +
      'Include: type, title, status, detail, instance.\n');

    // Org skill: auth patterns
    fs.mkdirSync(path.join(orgSquad, 'skills', 'auth-patterns'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'skills', 'auth-patterns', 'SKILL.md'),
      '---\nname: auth-patterns\nconfidence: high\n---\n\n# Auth Patterns\n\n' +
      'Use OAuth 2.0 + PKCE for all user-facing auth.\nStore tokens in httpOnly cookies, never localStorage.\n');

    // Org decisions
    fs.writeFileSync(path.join(orgSquad, 'decisions.md'),
      '# Org Decisions\n\n' +
      '### 2025-01-10: TypeScript mandatory\n**By:** CTO\n**What:** All new code must be TypeScript.\n\n' +
      '### 2025-01-20: No class-based components\n**By:** Frontend Lead\n**What:** Use function components with hooks only.\n\n' +
      '### 2025-02-01: PostgreSQL default\n**By:** Platform\n**What:** Use PostgreSQL unless explicitly approved otherwise.\n');

    // Org wisdom
    fs.mkdirSync(path.join(orgSquad, 'identity'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'identity', 'wisdom.md'),
      '# Org Wisdom\n\n## Patterns\n\n' +
      '**Pattern:** Add retry with exponential backoff for all external HTTP calls.\n' +
      '**Pattern:** Use structured logging (JSON) with correlation IDs.\n' +
      '**Pattern:** Feature flags for all user-facing changes.\n\n' +
      '## Anti-Patterns\n\n' +
      '**Avoid:** Storing secrets in env vars without a vault.\n' +
      '**Avoid:** Using SELECT * in production queries.\n');

    // Org casting policy
    fs.mkdirSync(path.join(orgSquad, 'casting'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'casting', 'policy.json'),
      JSON.stringify({ universe_allowlist: ['aliens', 'blade-runner'], max_capacity: 10 }, null, 2) + '\n');

    // Org routing
    fs.writeFileSync(path.join(orgSquad, 'routing.md'),
      '# Org Routing\n\n| Work Type | Route To |\n|-----------|----------|\n' +
      '| Security | SecOps Lead |\n| Compliance | Legal Bot |\n| Accessibility | A11y Expert |\n');

    execSync('git add -A && git commit -m "org setup"', { cwd: orgDir, stdio: 'pipe' });

    // ── TEAM REPO: frontend team standards ──
    teamDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-resolver-team-'));
    execSync('git init', { cwd: teamDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: teamDir, stdio: 'pipe' });
    execSync('git config user.email "t@t.com"', { cwd: teamDir, stdio: 'pipe' });

    const teamSquad = path.join(teamDir, '.squad');
    fs.mkdirSync(path.join(teamSquad, 'skills', 'react-testing'), { recursive: true });
    fs.writeFileSync(path.join(teamSquad, 'skills', 'react-testing', 'SKILL.md'),
      '---\nname: react-testing\nconfidence: medium\n---\n\n# React Testing\n\n' +
      'Use React Testing Library, not Enzyme.\nTest behavior, not implementation.\n');

    fs.writeFileSync(path.join(teamSquad, 'decisions.md'),
      '# Team Decisions\n\n### Use Zustand for state\n**What:** Zustand over Redux for all new state management.\n');

    fs.mkdirSync(path.join(teamSquad, 'identity'), { recursive: true });
    fs.writeFileSync(path.join(teamSquad, 'identity', 'wisdom.md'),
      '# Team Wisdom\n\n**Pattern:** Colocate tests with components in __tests__/ dirs.\n');

    execSync('git add -A && git commit -m "team setup"', { cwd: teamDir, stdio: 'pipe' });

    // ── CHILD REPO: the project ──
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-resolver-repo-'));
    execSync('git init', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.email "t@t.com"', { cwd: repoDir, stdio: 'pipe' });
    runSquad([], repoDir);

    // Add both upstreams
    runSquad(['upstream', 'add', orgDir, '--name', 'org'], repoDir);
    runSquad(['upstream', 'add', teamDir, '--name', 'team'], repoDir);

    // Add local decisions and wisdom so we can test "closest wins"
    fs.writeFileSync(path.join(repoDir, '.squad', 'decisions.md'),
      '# Project Decisions\n\n### Use Vite for bundling\n');
    fs.mkdirSync(path.join(repoDir, '.squad', 'identity'), { recursive: true });
    fs.writeFileSync(path.join(repoDir, '.squad', 'identity', 'wisdom.md'),
      '# Project Wisdom\n\n**Pattern:** Use MSW for API mocking in tests.\n');
  });

  after(() => {
    cleanDir(orgDir);
    cleanDir(teamDir);
    cleanDir(repoDir);
  });

  // ── Core: does the resolver find upstream content? ──

  it('resolveUpstreams() discovers both org and team upstreams', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    assert.ok(resolved, 'resolver should return results');
    assert.equal(resolved.upstreams.length, 2, 'should find 2 upstreams');
    assert.equal(resolved.upstreams[0].name, 'org');
    assert.equal(resolved.upstreams[1].name, 'team');
  });

  // ── Skills: org skills are discoverable ──

  it('resolves org skills with full content', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const org = resolved.upstreams.find(u => u.name === 'org');

    assert.equal(org.skills.length, 2, 'org should have 2 skills');
    const skillNames = org.skills.map(s => s.name);
    assert.ok(skillNames.includes('error-handling'), 'should find error-handling skill');
    assert.ok(skillNames.includes('auth-patterns'), 'should find auth-patterns skill');

    const errorSkill = org.skills.find(s => s.name === 'error-handling');
    assert.ok(errorSkill.content.includes('ProblemDetails'), 'skill content should contain ProblemDetails');
    assert.ok(errorSkill.content.includes('RFC 7807'), 'skill content should contain RFC reference');
  });

  it('resolves team skills with full content', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const team = resolved.upstreams.find(u => u.name === 'team');

    assert.equal(team.skills.length, 1, 'team should have 1 skill');
    assert.equal(team.skills[0].name, 'react-testing');
    assert.ok(team.skills[0].content.includes('React Testing Library'), 'should contain RTL reference');
  });

  // ── Decisions: org decisions are readable ──

  it('resolves org decisions with all entries', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const org = resolved.upstreams.find(u => u.name === 'org');

    assert.ok(org.decisions, 'org decisions should be present');
    assert.ok(org.decisions.includes('TypeScript mandatory'), 'should contain TypeScript decision');
    assert.ok(org.decisions.includes('No class-based components'), 'should contain components decision');
    assert.ok(org.decisions.includes('PostgreSQL default'), 'should contain DB decision');
  });

  it('resolves team decisions', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const team = resolved.upstreams.find(u => u.name === 'team');

    assert.ok(team.decisions, 'team decisions should be present');
    assert.ok(team.decisions.includes('Zustand'), 'should contain state management decision');
  });

  // ── Wisdom: org wisdom patterns and anti-patterns are readable ──

  it('resolves org wisdom with patterns and anti-patterns', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const org = resolved.upstreams.find(u => u.name === 'org');

    assert.ok(org.wisdom, 'org wisdom should be present');
    assert.ok(org.wisdom.includes('exponential backoff'), 'should contain retry pattern');
    assert.ok(org.wisdom.includes('structured logging'), 'should contain logging pattern');
    assert.ok(org.wisdom.includes('Feature flags'), 'should contain feature flags pattern');
    assert.ok(org.wisdom.includes('SELECT *'), 'should contain SELECT * anti-pattern');
  });

  // ── Casting policy: org defaults are readable ──

  it('resolves org casting policy', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const org = resolved.upstreams.find(u => u.name === 'org');

    assert.ok(org.castingPolicy, 'org casting policy should be present');
    assert.deepStrictEqual(org.castingPolicy.universe_allowlist, ['aliens', 'blade-runner']);
    assert.equal(org.castingPolicy.max_capacity, 10);
  });

  // ── Routing: org fallback routes are readable ──

  it('resolves org routing with fallback rules', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const org = resolved.upstreams.find(u => u.name === 'org');

    assert.ok(org.routing, 'org routing should be present');
    assert.ok(org.routing.includes('Security'), 'should contain security route');
    assert.ok(org.routing.includes('Compliance'), 'should contain compliance route');
    assert.ok(org.routing.includes('Accessibility'), 'should contain a11y route');
  });

  // ── Spawn prompt: INHERITED CONTEXT block is generated correctly ──

  it('builds correct INHERITED CONTEXT block for spawn prompts', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const block = buildInheritedContextBlock(resolved);

    assert.ok(block.includes('INHERITED CONTEXT:'), 'should have header');
    assert.ok(block.includes('org:'), 'should list org');
    assert.ok(block.includes('team:'), 'should list team');
    assert.ok(block.includes('skills (2)'), 'org should show 2 skills');
    assert.ok(block.includes('skills (1)'), 'team should show 1 skill');
    assert.ok(block.includes('decisions ✓'), 'should show decisions');
    assert.ok(block.includes('wisdom ✓'), 'should show wisdom');
    assert.ok(block.includes('routing ✓'), 'should show routing');
  });

  // ── Closest-wins: local content exists alongside upstream ──

  it('local decisions exist alongside inherited decisions (closest-wins)', () => {
    // Local decisions
    const localDecisions = fs.readFileSync(path.join(repoDir, '.squad', 'decisions.md'), 'utf8');
    assert.ok(localDecisions.includes('Vite'), 'local decisions should exist');

    // Upstream decisions also available
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const orgDecisions = resolved.upstreams.find(u => u.name === 'org').decisions;
    assert.ok(orgDecisions.includes('TypeScript'), 'org decisions also available');

    // Both coexist — coordinator presents both, local wins on conflict
  });

  it('local wisdom exists alongside inherited wisdom (closest-wins)', () => {
    const localWisdom = fs.readFileSync(path.join(repoDir, '.squad', 'identity', 'wisdom.md'), 'utf8');
    assert.ok(localWisdom.includes('MSW'), 'local wisdom should exist');

    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const orgWisdom = resolved.upstreams.find(u => u.name === 'org').wisdom;
    assert.ok(orgWisdom.includes('exponential backoff'), 'org wisdom also available');
  });

  // ── Live updates: org changes visible immediately ──

  it('org updates are visible in next resolve() call without sync', () => {
    // Add new skill to org
    const newSkillDir = path.join(orgDir, '.squad', 'skills', 'ci-cd-standards');
    fs.mkdirSync(newSkillDir, { recursive: true });
    fs.writeFileSync(path.join(newSkillDir, 'SKILL.md'),
      '---\nname: ci-cd-standards\nconfidence: low\n---\n\n# CI/CD Standards\n\nAll PRs must pass CI before merge.\n');

    // Append decision
    fs.appendFileSync(path.join(orgDir, '.squad', 'decisions.md'),
      '\n### 2025-03-15: Require PR reviews\n**What:** All PRs need at least one approval.\n');

    // Resolve again — should see the new content immediately
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const org = resolved.upstreams.find(u => u.name === 'org');

    assert.equal(org.skills.length, 3, 'should now find 3 skills (added ci-cd-standards)');
    assert.ok(org.skills.some(s => s.name === 'ci-cd-standards'), 'new skill should be visible');
    assert.ok(org.decisions.includes('PR reviews'), 'new decision should be visible');
  });

  // ── No upstream = no problem ──

  it('returns null when no upstream.json exists', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-resolver-empty-'));
    try {
      fs.mkdirSync(path.join(emptyDir, '.squad'), { recursive: true });
      const resolved = resolveUpstreams(path.join(emptyDir, '.squad'));
      assert.equal(resolved, null, 'should return null when no upstream.json');
    } finally {
      cleanDir(emptyDir);
    }
  });

  it('buildInheritedContextBlock returns empty for null', () => {
    const block = buildInheritedContextBlock(null);
    assert.equal(block, '', 'should return empty string');
  });

  // ── Session display: user sees upstream context on start ──

  it('buildSessionDisplay shows upstream summary for user greeting', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const display = buildSessionDisplay(resolved);

    assert.ok(display.includes('📡 Inherited context:'), 'should have header with emoji');
    assert.ok(display.includes('org (local)'), 'should show org name and type');
    assert.ok(display.includes('team (local)'), 'should show team name and type');
    assert.ok(display.includes('decisions'), 'should list decisions');
    assert.ok(display.includes('wisdom'), 'should list wisdom');
    assert.ok(display.includes('skill'), 'should list skills');
  });

  it('buildSessionDisplay shows skill count correctly', () => {
    const resolved = resolveUpstreams(path.join(repoDir, '.squad'));
    const display = buildSessionDisplay(resolved);

    // org has 3 skills (2 original + ci-cd-standards added in live update test)
    assert.ok(display.includes('3 skills'), `org should show 3 skills in: ${display}`);
    // team has 1 skill
    assert.ok(display.includes('1 skill') && !display.includes('1 skills'), `team should show "1 skill" (no plural): ${display}`);
  });

  it('buildSessionDisplay returns empty when no upstreams', () => {
    const display = buildSessionDisplay(null);
    assert.equal(display, '');
  });

  it('buildSessionDisplay marks unreachable sources with warning', () => {
    // Create a resolver result with an empty upstream (simulating unreachable)
    const fakeResolved = {
      upstreams: [
        { name: 'dead-org', type: 'git', skills: [], decisions: null, wisdom: null, castingPolicy: null, routing: null }
      ]
    };
    const display = buildSessionDisplay(fakeResolved);
    assert.ok(display.includes('⚠️'), 'should show warning for unreachable source');
    assert.ok(display.includes('dead-org'), 'should show the name');
  });
});
