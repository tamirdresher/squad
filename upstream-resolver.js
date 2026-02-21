/**
 * Upstream resolver — implements the exact logic the coordinator follows
 * at session start to discover and read inherited context from upstreams.
 *
 * This matches the behavior described in squad.agent.md § "Inherited Context".
 * The coordinator reads upstream.json, resolves each source, and collects
 * skills, decisions, wisdom, casting policy, and routing from each upstream.
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve all upstream context for a squad directory.
 * Returns an object with merged context from all upstreams.
 *
 * @param {string} squadDir - The .squad/ directory of the child repo
 * @returns {{ upstreams: Array<{ name, type, skills: Array<{name, content}>, decisions: string|null, wisdom: string|null, castingPolicy: object|null, routing: string|null }> }} | null
 */
function resolveUpstreams(squadDir) {
  const upstreamFile = path.join(squadDir, 'upstream.json');
  if (!fs.existsSync(upstreamFile)) return null;

  let config;
  try {
    config = JSON.parse(fs.readFileSync(upstreamFile, 'utf8'));
  } catch {
    return null;
  }

  if (!config.upstreams || !Array.isArray(config.upstreams)) return null;

  const results = [];

  for (const upstream of config.upstreams) {
    const resolved = { name: upstream.name, type: upstream.type, skills: [], decisions: null, wisdom: null, castingPolicy: null, routing: null };

    // Step 1: Resolve the upstream's .squad/ directory
    let upstreamSquadDir = null;

    if (upstream.type === 'local') {
      // Read directly from the source path
      const srcSquad = path.join(upstream.source, '.squad');
      const srcAiTeam = path.join(upstream.source, '.ai-team');
      if (fs.existsSync(srcSquad)) upstreamSquadDir = srcSquad;
      else if (fs.existsSync(srcAiTeam)) upstreamSquadDir = srcAiTeam;
    } else if (upstream.type === 'git') {
      // Read from the cached clone
      const cloneDir = path.join(squadDir, '_upstream_repos', upstream.name);
      const cloneSquad = path.join(cloneDir, '.squad');
      const cloneAiTeam = path.join(cloneDir, '.ai-team');
      if (fs.existsSync(cloneSquad)) upstreamSquadDir = cloneSquad;
      else if (fs.existsSync(cloneAiTeam)) upstreamSquadDir = cloneAiTeam;
    } else if (upstream.type === 'export') {
      // Export files don't have a .squad/ dir — read from the JSON
      try {
        const manifest = JSON.parse(fs.readFileSync(upstream.source, 'utf8'));
        if (Array.isArray(manifest.skills)) {
          for (const skillContent of manifest.skills) {
            const nameMatch = skillContent.match(/^name:\s*["']?(.+?)["']?\s*$/m);
            const skillName = nameMatch ? nameMatch[1].trim() : 'unknown';
            resolved.skills.push({ name: skillName, content: skillContent });
          }
        }
        if (manifest.casting && manifest.casting.policy) {
          resolved.castingPolicy = manifest.casting.policy;
        }
      } catch {}
      results.push(resolved);
      continue;
    }

    if (!upstreamSquadDir) {
      results.push(resolved); // Empty — source not found
      continue;
    }

    // Step 2: Read each content type from the upstream's .squad/

    // Skills
    const skillsDir = path.join(upstreamSquadDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      try {
        for (const entry of fs.readdirSync(skillsDir)) {
          const skillFile = path.join(skillsDir, entry, 'SKILL.md');
          if (fs.existsSync(skillFile)) {
            resolved.skills.push({ name: entry, content: fs.readFileSync(skillFile, 'utf8') });
          }
        }
      } catch {}
    }

    // Decisions
    const decisionsFile = path.join(upstreamSquadDir, 'decisions.md');
    if (fs.existsSync(decisionsFile)) {
      resolved.decisions = fs.readFileSync(decisionsFile, 'utf8');
    }

    // Wisdom
    const wisdomFile = path.join(upstreamSquadDir, 'identity', 'wisdom.md');
    if (fs.existsSync(wisdomFile)) {
      resolved.wisdom = fs.readFileSync(wisdomFile, 'utf8');
    }

    // Casting policy
    const policyFile = path.join(upstreamSquadDir, 'casting', 'policy.json');
    if (fs.existsSync(policyFile)) {
      try {
        resolved.castingPolicy = JSON.parse(fs.readFileSync(policyFile, 'utf8'));
      } catch {}
    }

    // Routing
    const routingFile = path.join(upstreamSquadDir, 'routing.md');
    if (fs.existsSync(routingFile)) {
      resolved.routing = fs.readFileSync(routingFile, 'utf8');
    }

    results.push(resolved);
  }

  return { upstreams: results };
}

/**
 * Build the INHERITED CONTEXT block for a spawn prompt.
 * This is what the coordinator includes when spawning agents.
 */
function buildInheritedContextBlock(resolved) {
  if (!resolved || resolved.upstreams.length === 0) return '';

  const lines = ['INHERITED CONTEXT:'];
  for (const u of resolved.upstreams) {
    const parts = [];
    if (u.skills.length > 0) parts.push(`skills (${u.skills.length})`);
    if (u.decisions) parts.push('decisions ✓');
    if (u.wisdom) parts.push('wisdom ✓');
    if (u.castingPolicy) parts.push('casting ✓');
    if (u.routing) parts.push('routing ✓');
    lines.push(`  ${u.name}: ${parts.join(', ') || '(empty)'}`);
  }
  return lines.join('\n');
}

module.exports = { resolveUpstreams, buildInheritedContextBlock };
