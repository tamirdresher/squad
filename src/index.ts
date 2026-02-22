#!/usr/bin/env node

/**
 * Squad SDK — CLI entry point and exports
 * Programmable multi-agent runtime for GitHub Copilot
 */

const VERSION = '0.6.2'; // TODO: use getPackageVersion() when not a barrel export file

// Export public API
export { resolveSquad, resolveGlobalSquadPath, ensureSquadPath } from './resolution.js';
export * from './config/index.js';
export * from './agents/onboarding.js';
export * from './casting/index.js';
export * from './skills/index.js';
export { selectResponseTier, getTier } from './coordinator/response-tiers.js';
export type { ResponseTier, TierName, TierContext, ModelTierSuggestion } from './coordinator/response-tiers.js';
export { loadConfig, loadConfigSync } from './runtime/config.js';
export type { ConfigLoadResult, ConfigValidationError } from './runtime/config.js';
export * from './runtime/streaming.js';
export * from './runtime/cost-tracker.js';
export * from './runtime/telemetry.js';
export * from './runtime/offline.js';
export * from './runtime/i18n.js';
export * from './runtime/benchmarks.js';
export {
  type ReleaseChannel,
  type SDKUpdateInfo,
  type SDKUpgradeOptions,
  checkForUpdate,
  performUpgrade,
  success,
  error,
  warn,
  info,
  dim,
  bold,
  fatal,
  detectSquadDir,
  ghAvailable,
  ghAuthenticated,
  ghIssueList,
  ghIssueEdit,
  runWatch,
  runUpgrade
} from './cli/index.js';
export * from './marketplace/index.js';
export * from './build/index.js';
export * from './sharing/index.js';

import fs from 'node:fs';
import path from 'node:path';
import { fatal } from './cli/core/errors.js';
import { BOLD, RESET, DIM } from './cli/core/output.js';
import { runInit } from './cli/core/init.js';
import { resolveSquad, resolveGlobalSquadPath } from './resolution.js';
import { runShell } from './cli/shell/index.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const hasGlobal = args.includes('--global');
  const cmd = args[0];

  // --version / -v
  if (cmd === '--version' || cmd === '-v') {
    console.log(`squad ${VERSION}`);
    process.exit(0);
  }

  // --help / -h / help
  if (cmd === '--help' || cmd === '-h' || cmd === 'help') {
    console.log(`\n${BOLD}squad${RESET} v${VERSION} — Add an AI agent team to any project\n`);
    console.log(`Usage: squad [command] [options]\n`);
    console.log(`Commands:`);
    console.log(`  ${BOLD}(default)${RESET}  Launch interactive shell (no args)`);
    console.log(`             Flags: --global (init in personal squad directory)`);
    console.log(`  ${BOLD}init${RESET}       Initialize Squad (skip files that already exist)`);
    console.log(`             Flags: --global (init in personal squad directory)`);
    console.log(`  ${BOLD}upgrade${RESET}    Update Squad-owned files to latest version`);
    console.log(`             Overwrites: squad.agent.md, templates dir (.squad-templates/ or .ai-team-templates/)`);
    console.log(`             Never touches: .squad/ or .ai-team/ (your team state)`);
    console.log(`             Flags: --global (upgrade personal squad), --migrate-directory (rename .ai-team/ → .squad/)`);
    console.log(`  ${BOLD}status${RESET}     Show which squad is active and why`);
    console.log(`  ${BOLD}triage${RESET}     Scan for work and categorize issues`);
    console.log(`             Usage: triage [--interval <minutes>]`);
    console.log(`             Default: checks every 10 minutes (Ctrl+C to stop)`);
    console.log(`  ${BOLD}loop${RESET}       Continuous work loop (Ralph mode)`);
    console.log(`             Usage: loop [--filter <label>] [--interval <minutes>]`);
    console.log(`             Default: checks every 10 minutes (Ctrl+C to stop)`);
    console.log(`  ${BOLD}hire${RESET}       Team creation wizard`);
    console.log(`             Usage: hire [--name <name>] [--role <role>]`);
    console.log(`  ${BOLD}copilot${RESET}    Add/remove the Copilot coding agent (@copilot)`);
    console.log(`             Usage: copilot [--off] [--auto-assign]`);
    console.log(`  ${BOLD}plugin${RESET}     Manage plugin marketplaces`);
    console.log(`             Usage: plugin marketplace add|remove|list|browse`);
    console.log(`  ${BOLD}export${RESET}     Export squad to a portable JSON snapshot`);
    console.log(`             Default: squad-export.json (use --out <path> to override)`);
    console.log(`  ${BOLD}import${RESET}     Import squad from an export file`);
    console.log(`             Usage: import <file> [--force]`);
    console.log(`  ${BOLD}scrub-emails${RESET}  Remove email addresses from Squad state files`);
    console.log(`             Usage: scrub-emails [directory] (default: .ai-team/)`);
    console.log(`  ${BOLD}help${RESET}       Show this help message`);
    console.log(`\nFlags:`);
    console.log(`  ${BOLD}--version, -v${RESET}  Print version`);
    console.log(`  ${BOLD}--help, -h${RESET}     Show help`);
    console.log(`  ${BOLD}--global${RESET}       Use personal (global) squad path (for init, upgrade)`);
    console.log(`\nInstallation:`);
    console.log(`  npm install --save-dev @bradygaster/squad-cli`);
    console.log(`\nInsider channel:`);
    console.log(`  npm install --save-dev @bradygaster/squad-cli@insider\n`);
    process.exit(0);
  }

  // No args → launch interactive shell
  if (!cmd) {
    await runShell();
    return;
  }

  // Route subcommands
  if (cmd === 'init') {
    const dest = hasGlobal ? resolveGlobalSquadPath() : process.cwd();
    runInit(dest).catch(err => {
      fatal(err.message);
    });
    return;
  }

  if (cmd === 'upgrade') {
    const { runUpgrade } = await import('./cli/core/upgrade.js');
    const { migrateDirectory } = await import('./cli/core/migrate-directory.js');
    
    const migrateDir = args.includes('--migrate-directory');
    const selfUpgrade = args.includes('--self');
    const dest = hasGlobal ? resolveGlobalSquadPath() : process.cwd();
    
    // Handle --migrate-directory flag
    if (migrateDir) {
      await migrateDirectory(dest);
      // Continue with regular upgrade after migration
    }
    
    // Run upgrade
    await runUpgrade(dest, { 
      migrateDirectory: migrateDir,
      self: selfUpgrade
    });
    
    process.exit(0);
  }

  if (cmd === 'triage' || cmd === 'watch') {
    console.log('🕵️ Squad triage — scanning for work... (full implementation pending)');
    process.exit(0);
  }

  if (cmd === 'loop') {
    const filterIdx = args.indexOf('--filter');
    const filter = (filterIdx !== -1 && args[filterIdx + 1]) ? args[filterIdx + 1] : undefined;
    const intervalIdx = args.indexOf('--interval');
    const intervalMinutes = (intervalIdx !== -1 && args[intervalIdx + 1])
      ? parseInt(args[intervalIdx + 1]!, 10)
      : 10;
    console.log(`🔄 Squad loop starting... (full implementation pending)`);
    if (filter) {
      console.log(`   Filter: ${filter}`);
    }
    console.log(`   Interval: ${intervalMinutes} minutes`);
    process.exit(0);
  }

  if (cmd === 'hire') {
    const nameIdx = args.indexOf('--name');
    const name = (nameIdx !== -1 && args[nameIdx + 1]) ? args[nameIdx + 1] : undefined;
    const roleIdx = args.indexOf('--role');
    const role = (roleIdx !== -1 && args[roleIdx + 1]) ? args[roleIdx + 1] : undefined;
    console.log('👋 Squad hire — team creation wizard starting... (full implementation pending)');
    if (name) {
      console.log(`   Name: ${name}`);
    }
    if (role) {
      console.log(`   Role: ${role}`);
    }
    process.exit(0);
  }

  if (cmd === 'export') {
    const { runExport } = await import('./cli/commands/export.js');
    const outIdx = args.indexOf('--out');
    const outPath = (outIdx !== -1 && args[outIdx + 1]) ? args[outIdx + 1] : undefined;
    await runExport(process.cwd(), outPath);
    process.exit(0);
  }

  if (cmd === 'import') {
    const { runImport } = await import('./cli/commands/import.js');
    const importFile = args[1];
    if (!importFile) {
      fatal('Usage: squad import <file> [--force]');
    }
    const hasForce = args.includes('--force');
    await runImport(process.cwd(), importFile, hasForce);
    process.exit(0);
  }

  if (cmd === 'plugin') {
    const { runPlugin } = await import('./cli/commands/plugin.js');
    await runPlugin(process.cwd(), args.slice(1));
    process.exit(0);
  }

  if (cmd === 'copilot') {
    const { runCopilot } = await import('./cli/commands/copilot.js');
    const isOff = args.includes('--off');
    const autoAssign = args.includes('--auto-assign');
    await runCopilot(process.cwd(), { off: isOff, autoAssign });
    process.exit(0);
  }

  if (cmd === 'scrub-emails') {
    const { scrubEmails } = await import('./cli/core/email-scrub.js');
    const targetDir = args[1] || '.ai-team';
    const count = await scrubEmails(targetDir);
    if (count > 0) {
      console.log(`Scrubbed ${count} email address(es).`);
    } else {
      console.log('No email addresses found.');
    }
    process.exit(0);
  }

  if (cmd === 'status') {
    const repoSquad = resolveSquad(process.cwd());
    const globalPath = resolveGlobalSquadPath();
    const globalSquadDir = path.join(globalPath, '.squad');
    const globalExists = fs.existsSync(globalSquadDir);

    console.log(`\n${BOLD}Squad Status${RESET}\n`);

    if (repoSquad) {
      console.log(`  Active squad: ${BOLD}repo${RESET}`);
      console.log(`  Path:         ${repoSquad}`);
      console.log(`  Reason:       Found .squad/ in repository tree`);
    } else if (globalExists) {
      console.log(`  Active squad: ${BOLD}personal (global)${RESET}`);
      console.log(`  Path:         ${globalSquadDir}`);
      console.log(`  Reason:       No repo .squad/ found; personal squad exists at global path`);
    } else {
      console.log(`  Active squad: ${DIM}none${RESET}`);
      console.log(`  Reason:       No .squad/ found in repo tree or at global path`);
    }

    console.log();
    console.log(`  ${DIM}Repo resolution:   ${repoSquad ?? 'not found'}${RESET}`);
    console.log(`  ${DIM}Global path:       ${globalPath}${RESET}`);
    console.log(`  ${DIM}Global squad:      ${globalExists ? globalSquadDir : 'not initialized'}${RESET}`);
    console.log();

    process.exit(0);
  }

  // Unknown command
  fatal(`Unknown command: ${cmd}\n       Run 'squad help' for usage information.`);
}

main();
