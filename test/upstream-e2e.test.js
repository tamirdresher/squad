const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
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

function cleanDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

describe('E2E: Org → Repo upstream inheritance (local path)', () => {
  let orgDir;
  let repoDir;

  before(() => {
    // === ORG-LEVEL REPO ===
    orgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-e2e-org-'));

    // Initialize as a git repo so it feels real
    execSync('git init', { cwd: orgDir, stdio: 'pipe' });
    execSync('git config user.name "E2E Test"', { cwd: orgDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: orgDir, stdio: 'pipe' });

    // Create org-level .squad/ with shared context
    const orgSquad = path.join(orgDir, '.squad');

    // Org skill: API conventions
    fs.mkdirSync(path.join(orgSquad, 'skills', 'api-conventions'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'skills', 'api-conventions', 'SKILL.md'),
      '---\nname: api-conventions\nconfidence: high\n---\n\n# API Conventions\n\n' +
      '- Use kebab-case for URL paths\n- Return ProblemDetails on errors\n- Version APIs via URL prefix /v1/\n');

    // Org skill: Testing standards
    fs.mkdirSync(path.join(orgSquad, 'skills', 'testing-standards'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'skills', 'testing-standards', 'SKILL.md'),
      '---\nname: testing-standards\nconfidence: medium\n---\n\n# Testing Standards\n\n' +
      '- Minimum 80% code coverage\n- Use arrange-act-assert pattern\n- Name tests: should_{expected}_when_{condition}\n');

    // Org decisions
    fs.writeFileSync(path.join(orgSquad, 'decisions.md'),
      '# Org-Wide Decisions\n\n' +
      '### 2025-01-15: TypeScript mandatory\n**By:** CTO\n**What:** All new projects must use TypeScript.\n\n' +
      '### 2025-02-01: PostgreSQL as default DB\n**By:** Platform Lead\n**What:** Use PostgreSQL unless there is a specific reason not to.\n');

    // Org wisdom
    fs.mkdirSync(path.join(orgSquad, 'identity'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'identity', 'wisdom.md'),
      '# Org Wisdom\n\n## Patterns\n\n' +
      '**Pattern:** Always add retry logic for external HTTP calls. **Context:** Production reliability.\n\n' +
      '**Pattern:** Use structured logging (JSON format). **Context:** Observability.\n\n' +
      '## Anti-Patterns\n\n' +
      '**Avoid:** Storing secrets in environment variables without a vault. **Why:** Security audit failures.\n');

    // Org casting policy
    fs.mkdirSync(path.join(orgSquad, 'casting'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'casting', 'policy.json'),
      JSON.stringify({ universe_allowlist: ['aliens', 'blade-runner', 'the-thing'], max_capacity: 12 }, null, 2) + '\n');

    // Org routing
    fs.writeFileSync(path.join(orgSquad, 'routing.md'),
      '# Org Routing Defaults\n\n' +
      '| Work Type | Route To | Examples |\n|-----------|----------|----------|\n' +
      '| Security review | SecLead | Auth changes, encryption, access control |\n' +
      '| Compliance | ComplianceBot | GDPR, SOC2, data retention |\n');

    // Commit everything in the org repo
    execSync('git add -A && git commit -m "Initial org squad setup"', { cwd: orgDir, stdio: 'pipe' });

    // === CHILD REPO ===
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-e2e-repo-'));

    // Initialize as a git repo
    execSync('git init', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.name "E2E Test"', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.email "test@test.com"', { cwd: repoDir, stdio: 'pipe' });

    // Run squad init in the child repo
    const initResult = runSquad([], repoDir);
    assert.equal(initResult.exitCode, 0, `Child repo init should succeed: ${initResult.stdout}`);
  });

  after(() => {
    cleanDir(orgDir);
    cleanDir(repoDir);
  });

  it('step 1: add org as local upstream', () => {
    const result = runSquad(['upstream', 'add', orgDir, '--name', 'org'], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.ok(result.stdout.includes('Added upstream'), result.stdout);
    assert.ok(result.stdout.includes('org'), result.stdout);
    assert.ok(result.stdout.includes('local'), result.stdout);
    assert.ok(result.stdout.includes('read') || result.stdout.includes('live'), 'should mention live reading');
  });

  it('step 2: upstream.json is created with correct config', () => {
    const upstreamPath = path.join(repoDir, '.squad', 'upstream.json');
    assert.ok(fs.existsSync(upstreamPath), 'upstream.json should exist');

    const data = JSON.parse(fs.readFileSync(upstreamPath, 'utf8'));
    assert.equal(data.upstreams.length, 1);
    assert.equal(data.upstreams[0].name, 'org');
    assert.equal(data.upstreams[0].type, 'local');
    assert.ok(data.upstreams[0].source.includes(path.basename(orgDir)), 'should reference org dir');
  });

  it('step 3: sync validates org content is readable', () => {
    const result = runSquad(['upstream', 'sync'], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.ok(result.stdout.includes('1/1'), 'should show 1/1 synced');
    assert.ok(result.stdout.includes('2 skills'), 'should find 2 skills');
    assert.ok(result.stdout.includes('decisions'), 'should find decisions');
    assert.ok(result.stdout.includes('wisdom'), 'should find wisdom');
    assert.ok(result.stdout.includes('casting policy'), 'should find casting policy');
    assert.ok(result.stdout.includes('routing'), 'should find routing');
  });

  it('step 4: no _inherited/ directory created (live read model)', () => {
    assert.ok(!fs.existsSync(path.join(repoDir, '.squad', '_inherited')),
      'should NOT create _inherited/ for local upstreams');
  });

  it('step 5: coordinator can read org skills directly from upstream path', () => {
    // Simulate what the coordinator does: read upstream.json, resolve path, read skills
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    const orgSource = data.upstreams[0].source;

    // Find .squad/ in the org source
    const orgSquadDir = path.join(orgSource, '.squad');
    assert.ok(fs.existsSync(orgSquadDir), 'org .squad/ should be accessible');

    // Read skills
    const skillsDir = path.join(orgSquadDir, 'skills');
    const skillNames = fs.readdirSync(skillsDir);
    assert.ok(skillNames.includes('api-conventions'), 'should find api-conventions skill');
    assert.ok(skillNames.includes('testing-standards'), 'should find testing-standards skill');

    // Read skill content
    const apiSkill = fs.readFileSync(path.join(skillsDir, 'api-conventions', 'SKILL.md'), 'utf8');
    assert.ok(apiSkill.includes('kebab-case'), 'api-conventions should contain kebab-case rule');
    assert.ok(apiSkill.includes('ProblemDetails'), 'api-conventions should contain ProblemDetails rule');
  });

  it('step 6: coordinator can read org decisions directly', () => {
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    const decisions = fs.readFileSync(path.join(data.upstreams[0].source, '.squad', 'decisions.md'), 'utf8');
    assert.ok(decisions.includes('TypeScript mandatory'), 'should contain TypeScript decision');
    assert.ok(decisions.includes('PostgreSQL'), 'should contain PostgreSQL decision');
  });

  it('step 7: coordinator can read org wisdom directly', () => {
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    const wisdom = fs.readFileSync(path.join(data.upstreams[0].source, '.squad', 'identity', 'wisdom.md'), 'utf8');
    assert.ok(wisdom.includes('retry logic'), 'should contain retry pattern');
    assert.ok(wisdom.includes('structured logging'), 'should contain logging pattern');
    assert.ok(wisdom.includes('secrets'), 'should contain secrets anti-pattern');
  });

  it('step 8: coordinator can read org casting policy directly', () => {
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    const policy = JSON.parse(fs.readFileSync(
      path.join(data.upstreams[0].source, '.squad', 'casting', 'policy.json'), 'utf8'));
    assert.ok(Array.isArray(policy.universe_allowlist));
    assert.ok(policy.universe_allowlist.includes('aliens'));
    assert.equal(policy.max_capacity, 12);
  });

  it('step 9: coordinator can read org routing directly', () => {
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    const routing = fs.readFileSync(path.join(data.upstreams[0].source, '.squad', 'routing.md'), 'utf8');
    assert.ok(routing.includes('Security review'), 'should contain security routing');
    assert.ok(routing.includes('Compliance'), 'should contain compliance routing');
  });

  it('step 10: org changes are visible live WITHOUT re-sync', () => {
    // Add a new skill to the org repo
    const newSkillDir = path.join(orgDir, '.squad', 'skills', 'new-org-skill');
    fs.mkdirSync(newSkillDir, { recursive: true });
    fs.writeFileSync(path.join(newSkillDir, 'SKILL.md'),
      '---\nname: new-org-skill\nconfidence: low\n---\n\n# New Org Skill\n\nAdded after initial setup.\n');

    // Append a new decision
    fs.appendFileSync(path.join(orgDir, '.squad', 'decisions.md'),
      '\n### 2025-03-01: Use Tailwind CSS\n**By:** Design Lead\n**What:** Standardize on Tailwind for all frontends.\n');

    // Now read from the child repo's perspective — should see new content immediately
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    const orgSource = data.upstreams[0].source;

    // New skill visible?
    const skillNames = fs.readdirSync(path.join(orgSource, '.squad', 'skills'));
    assert.ok(skillNames.includes('new-org-skill'), 'new skill should be visible immediately');

    // New decision visible?
    const decisions = fs.readFileSync(path.join(orgSource, '.squad', 'decisions.md'), 'utf8');
    assert.ok(decisions.includes('Tailwind CSS'), 'new decision should be visible immediately');
  });

  it('step 11: local repo skills coexist with org skills', () => {
    // Create a local skill in the child repo
    const localSkillDir = path.join(repoDir, '.squad', 'skills', 'local-project-patterns');
    fs.mkdirSync(localSkillDir, { recursive: true });
    fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'),
      '---\nname: local-project-patterns\nconfidence: medium\n---\n\n# Local Patterns\n\nProject-specific conventions.\n');

    // Local skills exist
    const localSkills = fs.readdirSync(path.join(repoDir, '.squad', 'skills'))
      .filter(d => fs.statSync(path.join(repoDir, '.squad', 'skills', d)).isDirectory());
    assert.ok(localSkills.includes('local-project-patterns'), 'local skill should exist');

    // Org skills still accessible via upstream path
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    const orgSkills = fs.readdirSync(path.join(data.upstreams[0].source, '.squad', 'skills'));
    assert.ok(orgSkills.includes('api-conventions'), 'org skill should still be accessible');

    // Both sources available — coordinator would merge at session start
    assert.ok(localSkills.length >= 1, 'should have local skills');
    assert.ok(orgSkills.length >= 2, 'should have org skills');
  });

  it('step 12: upstream list shows the configured org', () => {
    const result = runSquad(['upstream', 'list'], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.ok(result.stdout.includes('org'), result.stdout);
    assert.ok(result.stdout.includes('local'), result.stdout);
  });

  it('step 13: remove upstream cleans up', () => {
    const result = runSquad(['upstream', 'remove', 'org'], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.ok(result.stdout.includes('Removed upstream'), result.stdout);

    // Verify upstream.json is empty
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    assert.equal(data.upstreams.length, 0);

    // List should show no upstreams
    const listResult = runSquad(['upstream', 'list'], repoDir);
    assert.ok(listResult.stdout.includes('No upstreams configured'), listResult.stdout);
  });

  it('step 14: re-add after remove works', () => {
    const addResult = runSquad(['upstream', 'add', orgDir, '--name', 'org-restored'], repoDir);
    assert.equal(addResult.exitCode, 0, addResult.stdout);

    const syncResult = runSquad(['upstream', 'sync'], repoDir);
    assert.equal(syncResult.exitCode, 0, syncResult.stdout);
    // Should find the skills including the one added in step 10
    assert.ok(syncResult.stdout.includes('3 skills'), `should find 3 skills after re-add: ${syncResult.stdout}`);
  });
});

describe('E2E: Org → Team → Repo multi-level hierarchy', () => {
  let orgDir;
  let teamDir;
  let repoDir;

  before(() => {
    // === ORG LEVEL ===
    orgDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-e2e-org2-'));
    execSync('git init', { cwd: orgDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: orgDir, stdio: 'pipe' });
    execSync('git config user.email "t@t.com"', { cwd: orgDir, stdio: 'pipe' });

    const orgSquad = path.join(orgDir, '.squad');
    fs.mkdirSync(path.join(orgSquad, 'skills', 'org-logging'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'skills', 'org-logging', 'SKILL.md'),
      '---\nname: org-logging\nconfidence: high\n---\n\n# Org Logging\n\nUse structured JSON logging.\n');
    fs.writeFileSync(path.join(orgSquad, 'decisions.md'),
      '# Org Decisions\n\n### Use TypeScript\n');
    fs.mkdirSync(path.join(orgSquad, 'identity'), { recursive: true });
    fs.writeFileSync(path.join(orgSquad, 'identity', 'wisdom.md'),
      '# Org Wisdom\n\nAlways add health check endpoints.\n');
    execSync('git add -A && git commit -m "org"', { cwd: orgDir, stdio: 'pipe' });

    // === TEAM LEVEL ===
    teamDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-e2e-team-'));
    execSync('git init', { cwd: teamDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: teamDir, stdio: 'pipe' });
    execSync('git config user.email "t@t.com"', { cwd: teamDir, stdio: 'pipe' });

    const teamSquad = path.join(teamDir, '.squad');
    fs.mkdirSync(path.join(teamSquad, 'skills', 'team-react-patterns'), { recursive: true });
    fs.writeFileSync(path.join(teamSquad, 'skills', 'team-react-patterns', 'SKILL.md'),
      '---\nname: team-react-patterns\nconfidence: medium\n---\n\n# Team React Patterns\n\nUse custom hooks for data fetching.\n');
    fs.writeFileSync(path.join(teamSquad, 'decisions.md'),
      '# Team Decisions\n\n### Use React 19\n**What:** Standardize on React 19 with Server Components.\n');
    fs.mkdirSync(path.join(teamSquad, 'identity'), { recursive: true });
    fs.writeFileSync(path.join(teamSquad, 'identity', 'wisdom.md'),
      '# Team Wisdom\n\nPrefer Zustand over Redux for state management.\n');
    execSync('git add -A && git commit -m "team"', { cwd: teamDir, stdio: 'pipe' });

    // === REPO LEVEL ===
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-e2e-repo2-'));
    execSync('git init', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.email "t@t.com"', { cwd: repoDir, stdio: 'pipe' });
    runSquad([], repoDir);
  });

  after(() => {
    cleanDir(orgDir);
    cleanDir(teamDir);
    cleanDir(repoDir);
  });

  it('connects to both org and team upstreams', () => {
    const r1 = runSquad(['upstream', 'add', orgDir, '--name', 'org'], repoDir);
    assert.equal(r1.exitCode, 0, r1.stdout);

    const r2 = runSquad(['upstream', 'add', teamDir, '--name', 'team'], repoDir);
    assert.equal(r2.exitCode, 0, r2.stdout);

    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    assert.equal(data.upstreams.length, 2);
  });

  it('sync validates both levels', () => {
    const result = runSquad(['upstream', 'sync'], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.ok(result.stdout.includes('2/2'), result.stdout);
  });

  it('all three levels of skills are independently accessible', () => {
    // Create a local skill
    const localSkillDir = path.join(repoDir, '.squad', 'skills', 'repo-specific');
    fs.mkdirSync(localSkillDir, { recursive: true });
    fs.writeFileSync(path.join(localSkillDir, 'SKILL.md'),
      '---\nname: repo-specific\n---\n\n# Repo Specific\n');

    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));
    const orgSource = data.upstreams.find(u => u.name === 'org').source;
    const teamSource = data.upstreams.find(u => u.name === 'team').source;

    // Repo level
    const localSkills = fs.readdirSync(path.join(repoDir, '.squad', 'skills'))
      .filter(d => { try { return fs.statSync(path.join(repoDir, '.squad', 'skills', d)).isDirectory(); } catch { return false; } });
    assert.ok(localSkills.includes('repo-specific'), 'local skill should exist');

    // Team level
    const teamSkills = fs.readdirSync(path.join(teamSource, '.squad', 'skills'));
    assert.ok(teamSkills.includes('team-react-patterns'), 'team skill should be accessible');

    // Org level
    const orgSkills = fs.readdirSync(path.join(orgSource, '.squad', 'skills'));
    assert.ok(orgSkills.includes('org-logging'), 'org skill should be accessible');
  });

  it('all three levels of decisions are independently readable', () => {
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));

    const orgDecisions = fs.readFileSync(
      path.join(data.upstreams.find(u => u.name === 'org').source, '.squad', 'decisions.md'), 'utf8');
    assert.ok(orgDecisions.includes('TypeScript'), 'org decisions accessible');

    const teamDecisions = fs.readFileSync(
      path.join(data.upstreams.find(u => u.name === 'team').source, '.squad', 'decisions.md'), 'utf8');
    assert.ok(teamDecisions.includes('React 19'), 'team decisions accessible');
  });

  it('all three levels of wisdom are independently readable', () => {
    const data = JSON.parse(fs.readFileSync(path.join(repoDir, '.squad', 'upstream.json'), 'utf8'));

    const orgWisdom = fs.readFileSync(
      path.join(data.upstreams.find(u => u.name === 'org').source, '.squad', 'identity', 'wisdom.md'), 'utf8');
    assert.ok(orgWisdom.includes('health check'), 'org wisdom accessible');

    const teamWisdom = fs.readFileSync(
      path.join(data.upstreams.find(u => u.name === 'team').source, '.squad', 'identity', 'wisdom.md'), 'utf8');
    assert.ok(teamWisdom.includes('Zustand'), 'team wisdom accessible');
  });

  it('upstream list shows both levels', () => {
    const result = runSquad(['upstream', 'list'], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.ok(result.stdout.includes('org'), result.stdout);
    assert.ok(result.stdout.includes('team'), result.stdout);
  });
});

describe('E2E: Git URL upstream with auto-clone', () => {
  let bareRepoDir;
  let repoDir;
  let defaultBranch;

  before(() => {
    // Create a bare git repo to simulate a remote
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-e2e-work-'));
    bareRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-e2e-bare-'));
    // bare clone needs an empty target — remove the mkdtemp dir
    fs.rmSync(bareRepoDir, { recursive: true, force: true });

    try {
      // Init a working repo, add squad content, push to bare
      execSync('git init', { cwd: workDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: workDir, stdio: 'pipe' });
      execSync('git config user.email "t@t.com"', { cwd: workDir, stdio: 'pipe' });

      const squadDir = path.join(workDir, '.squad');
      fs.mkdirSync(path.join(squadDir, 'skills', 'git-upstream-skill'), { recursive: true });
      fs.writeFileSync(path.join(squadDir, 'skills', 'git-upstream-skill', 'SKILL.md'),
        '---\nname: git-upstream-skill\nconfidence: high\n---\n\n# Git Upstream Skill\n\nFrom a git remote.\n');
      fs.writeFileSync(path.join(squadDir, 'decisions.md'),
        '# Git Upstream Decisions\n\n### Always use main branch\n');

      execSync('git add -A && git commit -m "initial"', { cwd: workDir, stdio: 'pipe' });

      // Detect the default branch name (master or main)
      defaultBranch = execSync('git branch --show-current', { cwd: workDir, encoding: 'utf8', stdio: 'pipe' }).trim();

      // Create a bare clone
      execSync(`git clone --bare "${workDir}" "${bareRepoDir}"`, { stdio: 'pipe' });
    } finally {
      cleanDir(workDir);
    }

    // Create the child repo
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'squad-e2e-gitrepo-'));
    execSync('git init', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.name "Test"', { cwd: repoDir, stdio: 'pipe' });
    execSync('git config user.email "t@t.com"', { cwd: repoDir, stdio: 'pipe' });
    runSquad([], repoDir);
  });

  after(() => {
    cleanDir(bareRepoDir);
    cleanDir(repoDir);
  });

  it('adds git upstream and auto-clones', () => {
    // Use file:// URL so detectSourceType recognizes it as git
    const fileUrl = 'file://' + bareRepoDir.replace(/\\/g, '/');
    const result = runSquad(['upstream', 'add', fileUrl, '--name', 'git-org', '--ref', defaultBranch], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.ok(result.stdout.includes('Added upstream'), result.stdout);

    // Should have cloned into _upstream_repos/
    const cloneDir = path.join(repoDir, '.squad', '_upstream_repos', 'git-org');
    assert.ok(fs.existsSync(cloneDir), 'clone should exist at _upstream_repos/git-org');
    assert.ok(fs.existsSync(path.join(cloneDir, '.git')), 'should be a git repo');
  });

  it('gitignore entry added for _upstream_repos/', () => {
    const gitignore = fs.readFileSync(path.join(repoDir, '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('_upstream_repos/'), '.gitignore should contain _upstream_repos/');
  });

  it('coordinator can read from the auto-cloned repo', () => {
    const cloneDir = path.join(repoDir, '.squad', '_upstream_repos', 'git-org');
    const skillPath = path.join(cloneDir, '.squad', 'skills', 'git-upstream-skill', 'SKILL.md');
    assert.ok(fs.existsSync(skillPath), 'skill should be readable from clone');

    const content = fs.readFileSync(skillPath, 'utf8');
    assert.ok(content.includes('git remote'), 'skill content should match');
  });

  it('sync pulls latest for git upstreams', () => {
    const result = runSquad(['upstream', 'sync'], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);
    assert.ok(result.stdout.includes('git — cloned'), result.stdout);
    assert.ok(result.stdout.includes('1 skills'), result.stdout);
  });

  it('remove cleans up the clone', () => {
    const result = runSquad(['upstream', 'remove', 'git-org'], repoDir);
    assert.equal(result.exitCode, 0, result.stdout);

    const cloneDir = path.join(repoDir, '.squad', '_upstream_repos', 'git-org');
    assert.ok(!fs.existsSync(cloneDir), 'clone should be removed');
  });
});
