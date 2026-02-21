#!/usr/bin/env node

/**
 * Squad SDK — CLI entry point and exports
 * Programmable multi-agent runtime for GitHub Copilot
 */

const VERSION = '0.6.0-alpha.0';

// Export public API
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
export * from './cli/index.js';
export * from './marketplace/index.js';
export * from './build/index.js';

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('--version') || args.includes('-v')) {
    console.log(`squad ${VERSION}`);
    process.exit(0);
  }

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
squad ${VERSION} — Programmable multi-agent runtime for GitHub Copilot

Usage:
  squad [command] [options]

Commands:
  start       Start the Squad orchestrator
  status      Show agent session status
  init        Initialize a new Squad project

Options:
  -v, --version   Show version
  -h, --help      Show this help

Documentation:
  https://github.com/bradygaster/squad
`.trim());
    process.exit(0);
  }

  // TODO: Implement subcommand routing
  console.error(`Unknown command: ${args[0]}`);
  process.exit(1);
}

main();
