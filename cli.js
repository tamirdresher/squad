#!/usr/bin/env node

// Deprecation notice for GitHub-native distribution
console.error('\x1b[33m');
console.error('⚠  DEPRECATION NOTICE');
console.error('   npx github:bradygaster/squad is deprecated.');
console.error('   Switch to: npm install -g @bradygaster/squad-cli');
console.error('   Or use:    npx @bradygaster/squad-cli');
console.error('\x1b[0m');

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// dist/cli/core/output.js
function success(msg) {
  console.log(`${GREEN}\u2713${RESET} ${msg}`);
}
function warn(msg) {
  console.log(`${YELLOW}\u26A0\uFE0F${RESET} ${msg}`);
}
function info(msg) {
  console.log(msg);
}
function dim(msg) {
  console.log(`${DIM}${msg}${RESET}`);
}
function bold(msg) {
  console.log(`${BOLD}${msg}${RESET}`);
}
var GREEN, RED, YELLOW, DIM, BOLD, RESET;
var init_output = __esm({
  "dist/cli/core/output.js"() {
    "use strict";
    GREEN = "\x1B[32m";
    RED = "\x1B[31m";
    YELLOW = "\x1B[33m";
    DIM = "\x1B[2m";
    BOLD = "\x1B[1m";
    RESET = "\x1B[0m";
  }
});

// dist/cli/core/errors.js
function fatal(msg) {
  console.error(`${RED}\u2717${RESET} ${msg}`);
  process.exit(1);
}
var init_errors = __esm({
  "dist/cli/core/errors.js"() {
    "use strict";
    init_output();
  }
});

// dist/cli/core/detect-squad-dir.js
import fs from "node:fs";
import path from "node:path";
function detectSquadDir(dest) {
  const squadDir = path.join(dest, ".squad");
  const aiTeamDir = path.join(dest, ".ai-team");
  if (fs.existsSync(squadDir)) {
    return { path: squadDir, name: ".squad", isLegacy: false };
  }
  if (fs.existsSync(aiTeamDir)) {
    return { path: aiTeamDir, name: ".ai-team", isLegacy: true };
  }
  return { path: squadDir, name: ".squad", isLegacy: false };
}
var init_detect_squad_dir = __esm({
  "dist/cli/core/detect-squad-dir.js"() {
    "use strict";
  }
});

// dist/cli/core/templates.js
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
function getTemplatesDir() {
  const currentFile2 = fileURLToPath(import.meta.url);
  let dir = dirname(currentFile2);
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "templates");
    if (existsSync(candidate))
      return candidate;
    const parent = dirname(dir);
    if (parent === dir)
      break;
    dir = parent;
  }
  throw new Error("Templates directory not found \u2014 installation may be corrupted");
}
var TEMPLATE_MANIFEST;
var init_templates = __esm({
  "dist/cli/core/templates.js"() {
    "use strict";
    TEMPLATE_MANIFEST = [
      // Core coordinator
      {
        source: "squad.agent.md",
        destination: "../.github/agents/squad.agent.md",
        overwriteOnUpgrade: true,
        description: "Squad coordinator agent prompt"
      },
      // Casting system (squad-owned, overwrite on upgrade)
      {
        source: "casting-history.json",
        destination: "casting-history.json",
        overwriteOnUpgrade: true,
        description: "Casting history tracking"
      },
      {
        source: "casting-policy.json",
        destination: "casting-policy.json",
        overwriteOnUpgrade: true,
        description: "Casting policy configuration"
      },
      {
        source: "casting-registry.json",
        destination: "casting-registry.json",
        overwriteOnUpgrade: true,
        description: "Universe-based character registry"
      },
      // Template files (squad-owned, overwrite on upgrade)
      {
        source: "charter.md",
        destination: "charter.md",
        overwriteOnUpgrade: true,
        description: "Agent charter template"
      },
      {
        source: "constraint-tracking.md",
        destination: "constraint-tracking.md",
        overwriteOnUpgrade: true,
        description: "Constraint tracking template"
      },
      {
        source: "copilot-instructions.md",
        destination: "copilot-instructions.md",
        overwriteOnUpgrade: true,
        description: "Copilot instructions template"
      },
      {
        source: "history.md",
        destination: "history.md",
        overwriteOnUpgrade: true,
        description: "Agent history template"
      },
      {
        source: "mcp-config.md",
        destination: "mcp-config.md",
        overwriteOnUpgrade: true,
        description: "MCP configuration template"
      },
      {
        source: "multi-agent-format.md",
        destination: "multi-agent-format.md",
        overwriteOnUpgrade: true,
        description: "Multi-agent format specification"
      },
      {
        source: "orchestration-log.md",
        destination: "orchestration-log.md",
        overwriteOnUpgrade: true,
        description: "Orchestration log template"
      },
      {
        source: "plugin-marketplace.md",
        destination: "plugin-marketplace.md",
        overwriteOnUpgrade: true,
        description: "Plugin marketplace template"
      },
      {
        source: "raw-agent-output.md",
        destination: "raw-agent-output.md",
        overwriteOnUpgrade: true,
        description: "Raw agent output template"
      },
      {
        source: "roster.md",
        destination: "roster.md",
        overwriteOnUpgrade: true,
        description: "Team roster template"
      },
      {
        source: "run-output.md",
        destination: "run-output.md",
        overwriteOnUpgrade: true,
        description: "Run output template"
      },
      {
        source: "scribe-charter.md",
        destination: "scribe-charter.md",
        overwriteOnUpgrade: true,
        description: "Scribe charter template"
      },
      {
        source: "skill.md",
        destination: "skill.md",
        overwriteOnUpgrade: true,
        description: "Skill definition template"
      },
      // User-owned files (never overwrite)
      {
        source: "ceremonies.md",
        destination: "ceremonies.md",
        overwriteOnUpgrade: false,
        description: "Team ceremonies configuration"
      },
      {
        source: "routing.md",
        destination: "routing.md",
        overwriteOnUpgrade: false,
        description: "Agent routing rules"
      },
      // Identity subdirectory (user-owned)
      {
        source: "identity/now.md",
        destination: "identity/now.md",
        overwriteOnUpgrade: false,
        description: "Agent current focus"
      },
      {
        source: "identity/wisdom.md",
        destination: "identity/wisdom.md",
        overwriteOnUpgrade: false,
        description: "Agent accumulated wisdom"
      },
      // Skills subdirectory (squad-owned)
      {
        source: "skills/squad-conventions/SKILL.md",
        destination: "skills/squad-conventions/SKILL.md",
        overwriteOnUpgrade: true,
        description: "Squad conventions skill definition"
      },
      // Workflows (squad-owned, overwrite on upgrade)
      {
        source: "workflows/squad-ci.yml",
        destination: "../.github/workflows/squad-ci.yml",
        overwriteOnUpgrade: true,
        description: "Squad CI workflow"
      },
      {
        source: "workflows/squad-docs.yml",
        destination: "../.github/workflows/squad-docs.yml",
        overwriteOnUpgrade: true,
        description: "Squad docs workflow"
      },
      {
        source: "workflows/squad-heartbeat.yml",
        destination: "../.github/workflows/squad-heartbeat.yml",
        overwriteOnUpgrade: true,
        description: "Squad heartbeat workflow"
      },
      {
        source: "workflows/squad-insider-release.yml",
        destination: "../.github/workflows/squad-insider-release.yml",
        overwriteOnUpgrade: true,
        description: "Squad insider release workflow"
      },
      {
        source: "workflows/squad-issue-assign.yml",
        destination: "../.github/workflows/squad-issue-assign.yml",
        overwriteOnUpgrade: true,
        description: "Squad issue auto-assignment workflow"
      },
      {
        source: "workflows/squad-label-enforce.yml",
        destination: "../.github/workflows/squad-label-enforce.yml",
        overwriteOnUpgrade: true,
        description: "Squad label enforcement workflow"
      },
      {
        source: "workflows/squad-main-guard.yml",
        destination: "../.github/workflows/squad-main-guard.yml",
        overwriteOnUpgrade: true,
        description: "Squad main branch protection workflow"
      },
      {
        source: "workflows/squad-preview.yml",
        destination: "../.github/workflows/squad-preview.yml",
        overwriteOnUpgrade: true,
        description: "Squad preview workflow"
      },
      {
        source: "workflows/squad-promote.yml",
        destination: "../.github/workflows/squad-promote.yml",
        overwriteOnUpgrade: true,
        description: "Squad promotion workflow"
      },
      {
        source: "workflows/squad-release.yml",
        destination: "../.github/workflows/squad-release.yml",
        overwriteOnUpgrade: true,
        description: "Squad release workflow"
      },
      {
        source: "workflows/squad-triage.yml",
        destination: "../.github/workflows/squad-triage.yml",
        overwriteOnUpgrade: true,
        description: "Squad issue triage workflow"
      },
      {
        source: "workflows/sync-squad-labels.yml",
        destination: "../.github/workflows/sync-squad-labels.yml",
        overwriteOnUpgrade: true,
        description: "Squad label sync workflow"
      }
    ];
  }
});

// dist/cli/core/email-scrub.js
var email_scrub_exports = {};
__export(email_scrub_exports, {
  scrubEmails: () => scrubEmails
});
import fs5 from "node:fs";
import path5 from "node:path";
async function scrubEmails(dir) {
  const scrubbedFiles = [];
  const filesToScrub = [
    "team.md",
    "decisions.md",
    "routing.md",
    "ceremonies.md"
  ];
  for (const file of filesToScrub) {
    const filePath = path5.join(dir, file);
    if (fs5.existsSync(filePath)) {
      if (scrubFile(filePath)) {
        scrubbedFiles.push(file);
      }
    }
  }
  const agentsDir = path5.join(dir, "agents");
  if (fs5.existsSync(agentsDir)) {
    try {
      for (const agentName of fs5.readdirSync(agentsDir)) {
        const historyPath = path5.join(agentsDir, agentName, "history.md");
        if (fs5.existsSync(historyPath)) {
          if (scrubFile(historyPath)) {
            scrubbedFiles.push(path5.join("agents", agentName, "history.md"));
          }
        }
      }
    } catch {
    }
  }
  const logDir = path5.join(dir, "log");
  if (fs5.existsSync(logDir)) {
    try {
      const logFiles = fs5.readdirSync(logDir).filter((f) => f.endsWith(".md") || f.endsWith(".txt") || f.endsWith(".log"));
      for (const file of logFiles) {
        const filePath = path5.join(logDir, file);
        if (scrubFile(filePath)) {
          scrubbedFiles.push(path5.join("log", file));
        }
      }
    } catch {
    }
  }
  return scrubbedFiles.length;
}
function scrubFile(filePath) {
  try {
    let content = fs5.readFileSync(filePath, "utf8");
    let modified = false;
    const beforeNameEmail = content;
    content = content.replace(NAME_WITH_EMAIL_PATTERN, "$1");
    if (content !== beforeNameEmail)
      modified = true;
    const lines = content.split("\n");
    const scrubbed = lines.map((line) => {
      if (line.includes("http://") || line.includes("https://") || line.includes("```") || line.includes("example.com") || line.trim().startsWith("//") || line.trim().startsWith("#")) {
        return line;
      }
      const before = line;
      const after = line.replace(EMAIL_PATTERN, "[email scrubbed]");
      if (before !== after)
        modified = true;
      return after;
    });
    if (modified) {
      fs5.writeFileSync(filePath, scrubbed.join("\n"));
    }
    return modified;
  } catch {
    return false;
  }
}
var EMAIL_PATTERN, NAME_WITH_EMAIL_PATTERN;
var init_email_scrub = __esm({
  "dist/cli/core/email-scrub.js"() {
    "use strict";
    EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    NAME_WITH_EMAIL_PATTERN = /([a-zA-Z0-9_-]+)\s*\(([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/g;
  }
});

// dist/cli/core/migrations.js
import fs6 from "node:fs";
import path6 from "node:path";
function compareSemver(a, b) {
  const stripPre = (v) => v.split("-")[0];
  const pa = stripPre(a).split(".").map(Number);
  const pb = stripPre(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0))
      return -1;
    if ((pa[i] || 0) > (pb[i] || 0))
      return 1;
  }
  return 0;
}
async function runMigrations(squadDir, oldVersion, newVersion) {
  const applicable = migrations.filter((m) => compareSemver(m.version, oldVersion) > 0 && compareSemver(m.version, newVersion) <= 0).sort((a, b) => compareSemver(a.version, b.version));
  const applied = [];
  for (const m of applicable) {
    try {
      await m.run(squadDir);
      applied.push(`${m.version}: ${m.description}`);
    } catch (err) {
      console.error(`\u2717 Migration failed (${m.version}: ${m.description}): ${err.message}`);
    }
  }
  return applied;
}
var migrations;
var init_migrations = __esm({
  "dist/cli/core/migrations.js"() {
    "use strict";
    init_output();
    init_email_scrub();
    migrations = [
      {
        version: "0.2.0",
        description: "Create skills/ directory",
        run(squadDir) {
          const skillsDir = path6.join(squadDir, "skills");
          fs6.mkdirSync(skillsDir, { recursive: true });
        }
      },
      {
        version: "0.4.0",
        description: "Create plugins/ directory",
        run(squadDir) {
          const pluginsDir = path6.join(squadDir, "plugins");
          fs6.mkdirSync(pluginsDir, { recursive: true });
        }
      },
      {
        version: "0.5.0",
        description: "Scrub email addresses from Squad state files (privacy fix)",
        async run(squadDir) {
          if (fs6.existsSync(squadDir)) {
            const scrubbedCount = await scrubEmails(squadDir);
            if (scrubbedCount > 0) {
              success(`Privacy migration: scrubbed email addresses from ${scrubbedCount} file(s)`);
            }
          }
        }
      }
    ];
  }
});

// dist/cli/core/upgrade.js
var upgrade_exports = {};
__export(upgrade_exports, {
  runUpgrade: () => runUpgrade
});
import fs7 from "node:fs";
import path7 from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { dirname as dirname2 } from "node:path";
function readInstalledVersion(agentPath) {
  try {
    if (!fs7.existsSync(agentPath))
      return "0.0.0";
    const content = fs7.readFileSync(agentPath, "utf8");
    const commentMatch = content.match(/<!-- version: ([0-9.]+(?:-[a-z]+(?:\.\d+)?)?) -->/);
    if (commentMatch)
      return commentMatch[1];
    const frontmatterMatch = content.match(/^version:\s*"([^"]+)"/m);
    return frontmatterMatch ? frontmatterMatch[1] : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function compareSemver2(a, b) {
  const stripPre = (v) => v.split("-")[0];
  const pa = stripPre(a).split(".").map(Number);
  const pb = stripPre(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) < (pb[i] || 0))
      return -1;
    if ((pa[i] || 0) > (pb[i] || 0))
      return 1;
  }
  const aPre = a.includes("-");
  const bPre = b.includes("-");
  if (aPre && !bPre)
    return -1;
  if (!aPre && bPre)
    return 1;
  if (aPre && bPre)
    return a < b ? -1 : a > b ? 1 : 0;
  return 0;
}
function stampVersion2(filePath, version) {
  let content = fs7.readFileSync(filePath, "utf8");
  content = content.replace(/<!-- version: [^>]+ -->/m, `<!-- version: ${version} -->`);
  content = content.replace(/- \*\*Version:\*\* [0-9.]+(?:-[a-z]+(?:\.\d+)?)?/m, `- **Version:** ${version}`);
  content = content.replace(/`Squad v\{version\}`/g, `\`Squad v${version}\``);
  fs7.writeFileSync(filePath, content);
}
function detectProjectType2(dir) {
  if (fs7.existsSync(path7.join(dir, "package.json")))
    return "npm";
  if (fs7.existsSync(path7.join(dir, "go.mod")))
    return "go";
  if (fs7.existsSync(path7.join(dir, "requirements.txt")) || fs7.existsSync(path7.join(dir, "pyproject.toml")))
    return "python";
  if (fs7.existsSync(path7.join(dir, "pom.xml")) || fs7.existsSync(path7.join(dir, "build.gradle")) || fs7.existsSync(path7.join(dir, "build.gradle.kts")))
    return "java";
  try {
    const entries = fs7.readdirSync(dir);
    if (entries.some((e) => e.endsWith(".csproj") || e.endsWith(".sln") || e.endsWith(".slnx") || e.endsWith(".fsproj") || e.endsWith(".vbproj")))
      return "dotnet";
  } catch {
  }
  return "unknown";
}
function generateProjectWorkflowStub2(workflowFile, projectType) {
  const typeLabel = projectType === "unknown" ? "Project type was not detected" : projectType + " project";
  const todoBuildCmd = projectType === "unknown" ? "# TODO: Project type was not detected \u2014 add your build/test commands here" : "# TODO: Add your " + projectType + " build/test commands here";
  const buildHints = [
    "          # Go:            go test ./...",
    "          # Python:        pip install -r requirements.txt && pytest",
    "          # .NET:          dotnet test",
    "          # Java (Maven):  mvn test",
    "          # Java (Gradle): ./gradlew test"
  ].join("\n");
  if (workflowFile === "squad-ci.yml") {
    return "name: Squad CI\n# " + typeLabel + " \u2014 configure build/test commands below\n\non:\n  pull_request:\n    branches: [dev, preview, main, insider]\n    types: [opened, synchronize, reopened]\n  push:\n    branches: [dev, insider]\n\npermissions:\n  contents: read\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build and test\n        run: |\n          " + todoBuildCmd + "\n" + buildHints + '\n          echo "No build commands configured \u2014 update squad-ci.yml"\n';
  }
  if (workflowFile === "squad-release.yml") {
    return "name: Squad Release\n# " + typeLabel + " \u2014 configure build, test, and release commands below\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: write\n\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n\n      - name: Build and test\n        run: |\n          " + todoBuildCmd + "\n" + buildHints + '\n          echo "No build commands configured \u2014 update squad-release.yml"\n\n      - name: Create release\n        env:\n          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: |\n          # TODO: Add your release commands here (e.g., git tag, gh release create)\n          echo "No release commands configured \u2014 update squad-release.yml"\n';
  }
  if (workflowFile === "squad-preview.yml") {
    return "name: Squad Preview Validation\n# " + typeLabel + " \u2014 configure build, test, and validation commands below\n\non:\n  push:\n    branches: [preview]\n\npermissions:\n  contents: read\n\njobs:\n  validate:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build and test\n        run: |\n          " + todoBuildCmd + "\n" + buildHints + '\n          echo "No build commands configured \u2014 update squad-preview.yml"\n\n      - name: Validate\n        run: |\n          # TODO: Add pre-release validation commands here\n          echo "No validation commands configured \u2014 update squad-preview.yml"\n';
  }
  if (workflowFile === "squad-insider-release.yml") {
    return "name: Squad Insider Release\n# " + typeLabel + " \u2014 configure build, test, and insider release commands below\n\non:\n  push:\n    branches: [insider]\n\npermissions:\n  contents: write\n\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n\n      - name: Build and test\n        run: |\n          " + todoBuildCmd + "\n" + buildHints + '\n          echo "No build commands configured \u2014 update squad-insider-release.yml"\n\n      - name: Create insider release\n        env:\n          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: |\n          # TODO: Add your insider/pre-release commands here\n          echo "No release commands configured \u2014 update squad-insider-release.yml"\n';
  }
  if (workflowFile === "squad-docs.yml") {
    return "name: Squad Docs \u2014 Build & Deploy\n# " + typeLabel + ` \u2014 configure documentation build commands below

on:
  workflow_dispatch:
  push:
    branches: [preview]
    paths:
      - 'docs/**'
      - '.github/workflows/squad-docs.yml'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build docs
        run: |
          # TODO: Add your documentation build commands here
          # This workflow is optional \u2014 remove or customize it for your project
          echo "No docs build commands configured \u2014 update or remove squad-docs.yml"
`;
  }
  return null;
}
function writeWorkflowFile2(file, srcPath, destPath, projectType) {
  if (projectType !== "npm" && PROJECT_TYPE_SENSITIVE_WORKFLOWS2.has(file)) {
    const stub = generateProjectWorkflowStub2(file, projectType);
    if (stub) {
      fs7.writeFileSync(destPath, stub);
      return;
    }
  }
  fs7.copyFileSync(srcPath, destPath);
}
function getCLIVersion() {
  try {
    const pkgPath = path7.join(currentDir, "..", "..", "..", "package.json");
    const pkg = JSON.parse(fs7.readFileSync(pkgPath, "utf8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}
async function runUpgrade(dest, options = {}) {
  const cliVersion = getCLIVersion();
  const filesUpdated = [];
  const squadDirInfo = detectSquadDir(dest);
  if (squadDirInfo.isLegacy) {
    warn("DEPRECATION: .ai-team/ is deprecated and will be removed in v1.0.0");
    warn("Run 'squad upgrade --migrate-directory' to migrate to .squad/");
    console.log();
  }
  if (!fs7.existsSync(squadDirInfo.path)) {
    fatal("No squad found \u2014 run init first.");
  }
  const agentDest = path7.join(dest, ".github", "agents", "squad.agent.md");
  const oldVersion = readInstalledVersion(agentDest);
  const isAlreadyCurrent = oldVersion && oldVersion !== "0.0.0" && compareSemver2(oldVersion, cliVersion) === 0;
  const projectType = detectProjectType2(dest);
  if (isAlreadyCurrent) {
    info(`Already up to date (v${cliVersion})`);
    const migrationsApplied2 = await runMigrations(squadDirInfo.path, oldVersion, cliVersion);
    const templatesDir2 = getTemplatesDir();
    const workflowsSrc2 = path7.join(templatesDir2, "workflows");
    const workflowsDest2 = path7.join(dest, ".github", "workflows");
    if (fs7.existsSync(workflowsSrc2)) {
      const wfFiles = fs7.readdirSync(workflowsSrc2).filter((f) => f.endsWith(".yml"));
      fs7.mkdirSync(workflowsDest2, { recursive: true });
      for (const file of wfFiles) {
        writeWorkflowFile2(file, path7.join(workflowsSrc2, file), path7.join(workflowsDest2, file), projectType);
      }
      success(`upgraded squad workflows (${wfFiles.length} files)`);
      filesUpdated.push(`workflows (${wfFiles.length} files)`);
    }
    const agentSrc2 = path7.join(templatesDir2, "squad.agent.md");
    if (fs7.existsSync(agentSrc2)) {
      fs7.mkdirSync(path7.dirname(agentDest), { recursive: true });
      fs7.copyFileSync(agentSrc2, agentDest);
      stampVersion2(agentDest, cliVersion);
      success("upgraded squad.agent.md");
      filesUpdated.push("squad.agent.md");
    }
    return {
      fromVersion: oldVersion,
      toVersion: cliVersion,
      filesUpdated,
      migrationsRun: migrationsApplied2
    };
  }
  const templatesDir = getTemplatesDir();
  const agentSrc = path7.join(templatesDir, "squad.agent.md");
  if (!fs7.existsSync(agentSrc)) {
    fatal("squad.agent.md not found in templates \u2014 installation may be corrupted");
  }
  fs7.mkdirSync(path7.dirname(agentDest), { recursive: true });
  fs7.copyFileSync(agentSrc, agentDest);
  stampVersion2(agentDest, cliVersion);
  const fromLabel = oldVersion === "0.0.0" || !oldVersion ? "unknown" : oldVersion;
  success(`upgraded coordinator from ${fromLabel} to ${cliVersion}`);
  filesUpdated.push("squad.agent.md");
  const filesToUpgrade = TEMPLATE_MANIFEST.filter((f) => f.overwriteOnUpgrade);
  for (const file of filesToUpgrade) {
    const srcPath = path7.join(templatesDir, file.source);
    const destPath = path7.join(squadDirInfo.path, file.destination);
    if (!fs7.existsSync(srcPath))
      continue;
    fs7.mkdirSync(path7.dirname(destPath), { recursive: true });
    fs7.copyFileSync(srcPath, destPath);
    filesUpdated.push(file.destination);
  }
  if (filesToUpgrade.length > 0) {
    success(`upgraded ${filesToUpgrade.length} squad-owned files`);
  }
  const workflowsSrc = path7.join(templatesDir, "workflows");
  const workflowsDest = path7.join(dest, ".github", "workflows");
  if (fs7.existsSync(workflowsSrc)) {
    const wfFiles = fs7.readdirSync(workflowsSrc).filter((f) => f.endsWith(".yml"));
    fs7.mkdirSync(workflowsDest, { recursive: true });
    for (const file of wfFiles) {
      writeWorkflowFile2(file, path7.join(workflowsSrc, file), path7.join(workflowsDest, file), projectType);
    }
    success(`upgraded squad workflows (${wfFiles.length} files)`);
    filesUpdated.push(`workflows (${wfFiles.length} files)`);
  }
  const migrationsApplied = await runMigrations(squadDirInfo.path, oldVersion, cliVersion);
  const copilotInstructionsSrc = path7.join(templatesDir, "copilot-instructions.md");
  const copilotInstructionsDest = path7.join(dest, ".github", "copilot-instructions.md");
  const teamMdPath = path7.join(squadDirInfo.path, "team.md");
  if (fs7.existsSync(teamMdPath)) {
    const teamContent = fs7.readFileSync(teamMdPath, "utf8");
    const copilotEnabled = teamContent.includes("\u{1F916} Coding Agent");
    if (copilotEnabled && fs7.existsSync(copilotInstructionsSrc)) {
      fs7.mkdirSync(path7.dirname(copilotInstructionsDest), { recursive: true });
      fs7.copyFileSync(copilotInstructionsSrc, copilotInstructionsDest);
      success("upgraded .github/copilot-instructions.md");
      filesUpdated.push("copilot-instructions.md");
    }
  }
  console.log();
  info(`Upgrade complete: v${fromLabel} \u2192 v${cliVersion}`);
  dim("Never touches user state: team.md, decisions/, agents/*/history.md");
  console.log();
  return {
    fromVersion: fromLabel,
    toVersion: cliVersion,
    filesUpdated,
    migrationsRun: migrationsApplied
  };
}
var currentFile, currentDir, PROJECT_TYPE_SENSITIVE_WORKFLOWS2;
var init_upgrade = __esm({
  "dist/cli/core/upgrade.js"() {
    "use strict";
    init_output();
    init_errors();
    init_detect_squad_dir();
    init_templates();
    init_migrations();
    currentFile = fileURLToPath3(import.meta.url);
    currentDir = dirname2(currentFile);
    PROJECT_TYPE_SENSITIVE_WORKFLOWS2 = /* @__PURE__ */ new Set([
      "squad-ci.yml",
      "squad-release.yml",
      "squad-preview.yml",
      "squad-insider-release.yml",
      "squad-docs.yml"
    ]);
  }
});

// dist/cli/core/migrate-directory.js
var migrate_directory_exports = {};
__export(migrate_directory_exports, {
  migrateDirectory: () => migrateDirectory
});
import fs8 from "node:fs";
import path8 from "node:path";
async function migrateDirectory(dest) {
  const aiTeamDir = path8.join(dest, ".ai-team");
  const squadDir = path8.join(dest, ".squad");
  if (!fs8.existsSync(aiTeamDir)) {
    fatal("No .ai-team/ directory found \u2014 nothing to migrate.");
  }
  if (fs8.existsSync(squadDir)) {
    fatal(".squad/ directory already exists \u2014 migration appears to be complete.");
  }
  dim("Migrating .ai-team/ \u2192 .squad/...");
  fs8.renameSync(aiTeamDir, squadDir);
  success("Renamed .ai-team/ \u2192 .squad/");
  const gitattributes = path8.join(dest, ".gitattributes");
  if (fs8.existsSync(gitattributes)) {
    let content = fs8.readFileSync(gitattributes, "utf8");
    const updated = content.replace(/\.ai-team\//g, ".squad/");
    if (content !== updated) {
      fs8.writeFileSync(gitattributes, updated);
      success("Updated .gitattributes");
    }
  }
  const gitignore = path8.join(dest, ".gitignore");
  if (fs8.existsSync(gitignore)) {
    let content = fs8.readFileSync(gitignore, "utf8");
    const updated = content.replace(/\.ai-team\//g, ".squad/");
    if (content !== updated) {
      fs8.writeFileSync(gitignore, updated);
      success("Updated .gitignore");
    }
  }
  dim("Scrubbing email addresses from .squad/ files...");
  const scrubbedCount = await scrubEmails(squadDir);
  if (scrubbedCount > 0) {
    success(`Scrubbed email addresses from ${scrubbedCount} file(s)`);
  } else {
    success("No email addresses found");
  }
  const aiTeamTemplatesDir = path8.join(dest, ".ai-team-templates");
  const squadTemplatesDir = path8.join(dest, ".squad-templates");
  if (fs8.existsSync(aiTeamTemplatesDir)) {
    fs8.renameSync(aiTeamTemplatesDir, squadTemplatesDir);
    success("Renamed .ai-team-templates/ \u2192 .squad-templates/");
  }
  console.log();
  console.log(`${bold("Migration complete.")}`);
  dim("Commit the change:");
  console.log("  git add -A");
  console.log('  git commit -m "chore: migrate .ai-team/ \u2192 .squad/"');
  console.log();
}
var init_migrate_directory = __esm({
  "dist/cli/core/migrate-directory.js"() {
    "use strict";
    init_output();
    init_errors();
    init_email_scrub();
  }
});

// dist/cli/core/gh-cli.js
import { execFile } from "node:child_process";
import { promisify } from "node:util";
async function ghAvailable() {
  try {
    await execFileAsync("gh", ["--version"]);
    return true;
  } catch {
    return false;
  }
}
async function ghAuthenticated() {
  try {
    await execFileAsync("gh", ["auth", "status"]);
    return true;
  } catch {
    return false;
  }
}
async function ghIssueList(options = {}) {
  const args = ["issue", "list", "--json", "number,title,labels,assignees"];
  if (options.label) {
    args.push("--label", options.label);
  }
  if (options.state) {
    args.push("--state", options.state);
  }
  if (options.limit) {
    args.push("--limit", String(options.limit));
  }
  const { stdout } = await execFileAsync("gh", args);
  return JSON.parse(stdout || "[]");
}
async function ghIssueEdit(issueNumber, options) {
  const args = ["issue", "edit", String(issueNumber)];
  if (options.addLabel) {
    args.push("--add-label", options.addLabel);
  }
  if (options.removeLabel) {
    args.push("--remove-label", options.removeLabel);
  }
  if (options.addAssignee) {
    args.push("--add-assignee", options.addAssignee);
  }
  if (options.removeAssignee) {
    args.push("--remove-assignee", options.removeAssignee);
  }
  await execFileAsync("gh", args);
}
var execFileAsync;
var init_gh_cli = __esm({
  "dist/cli/core/gh-cli.js"() {
    "use strict";
    execFileAsync = promisify(execFile);
  }
});

// dist/cli/commands/watch.js
var watch_exports = {};
__export(watch_exports, {
  runWatch: () => runWatch
});
import fs9 from "node:fs";
import path9 from "node:path";
function parseMembers(text) {
  const lines = text.split("\n");
  const members = [];
  let inMembersTable = false;
  for (const line of lines) {
    if (line.startsWith("## Members")) {
      inMembersTable = true;
      continue;
    }
    if (inMembersTable && line.startsWith("## "))
      break;
    if (inMembersTable && line.startsWith("|") && !line.includes("---") && !line.includes("Name")) {
      const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
      if (cells.length >= 2 && !["Scribe", "Ralph"].includes(cells[0])) {
        members.push({
          name: cells[0],
          role: cells[1],
          label: `squad:${cells[0].toLowerCase()}`
        });
      }
    }
  }
  return members;
}
function triageIssue(issue, members) {
  const issueText = issue.title.toLowerCase();
  for (const member of members) {
    const role = member.role.toLowerCase();
    if ((role.includes("frontend") || role.includes("ui")) && (issueText.includes("ui") || issueText.includes("frontend") || issueText.includes("css"))) {
      return { member, reason: "frontend/UI domain" };
    }
    if ((role.includes("backend") || role.includes("api") || role.includes("server")) && (issueText.includes("api") || issueText.includes("backend") || issueText.includes("database"))) {
      return { member, reason: "backend/API domain" };
    }
    if ((role.includes("test") || role.includes("qa")) && (issueText.includes("test") || issueText.includes("bug") || issueText.includes("fix"))) {
      return { member, reason: "testing/QA domain" };
    }
  }
  const lead = members.find((m) => m.role.toLowerCase().includes("lead") || m.role.toLowerCase().includes("architect"));
  if (lead) {
    return { member: lead, reason: "no domain match \u2014 routed to Lead" };
  }
  return null;
}
async function runCheck(members, hasCopilot2, autoAssign) {
  const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  try {
    const issues = await ghIssueList({ label: "squad", state: "open", limit: 20 });
    const memberLabels = members.map((m) => m.label);
    const untriaged = issues.filter((issue) => {
      const issueLabels = issue.labels.map((l) => l.name);
      return !memberLabels.some((ml) => issueLabels.includes(ml));
    });
    let unassignedCopilot = [];
    if (hasCopilot2 && autoAssign) {
      try {
        const copilotIssues = await ghIssueList({ label: "squad:copilot", state: "open", limit: 10 });
        unassignedCopilot = copilotIssues.filter((i) => !i.assignees || i.assignees.length === 0);
      } catch {
      }
    }
    if (untriaged.length === 0 && unassignedCopilot.length === 0) {
      console.log(`${DIM}[${timestamp}]${RESET} \u{1F4CB} Board is clear \u2014 no pending work`);
      return;
    }
    for (const issue of untriaged) {
      const triage = triageIssue(issue, members);
      if (triage) {
        try {
          await ghIssueEdit(issue.number, { addLabel: triage.member.label });
          console.log(`${GREEN}\u2713${RESET} [${timestamp}] Triaged #${issue.number} "${issue.title}" \u2192 ${triage.member.name} (${triage.reason})`);
        } catch (e) {
          const err = e;
          console.error(`${RED}\u2717${RESET} [${timestamp}] Failed to label #${issue.number}: ${err.message}`);
        }
      }
    }
    for (const issue of unassignedCopilot) {
      try {
        await ghIssueEdit(issue.number, { addAssignee: "copilot-swe-agent" });
        console.log(`${GREEN}\u2713${RESET} [${timestamp}] Assigned @copilot to #${issue.number} "${issue.title}"`);
      } catch (e) {
        const err = e;
        console.error(`${RED}\u2717${RESET} [${timestamp}] Failed to assign @copilot to #${issue.number}: ${err.message}`);
      }
    }
  } catch (e) {
    const err = e;
    console.error(`${RED}\u2717${RESET} [${timestamp}] Check failed: ${err.message}`);
  }
}
async function runWatch(dest, intervalMinutes) {
  if (isNaN(intervalMinutes) || intervalMinutes < 1) {
    fatal("--interval must be a positive number of minutes");
  }
  const squadDirInfo = detectSquadDir(dest);
  const teamMd = path9.join(squadDirInfo.path, "team.md");
  if (!fs9.existsSync(teamMd)) {
    fatal("No squad found \u2014 run init first.");
  }
  if (!await ghAvailable()) {
    fatal("gh CLI not found \u2014 install from https://cli.github.com");
  }
  if (!await ghAuthenticated()) {
    console.error(`${YELLOW}\u26A0\uFE0F${RESET} gh CLI not authenticated`);
    console.error(`   Run: ${BOLD}gh auth login${RESET}
`);
    fatal("gh authentication required");
  }
  const content = fs9.readFileSync(teamMd, "utf8");
  const members = parseMembers(content);
  if (members.length === 0) {
    fatal("No squad members found in team.md");
  }
  const hasCopilot2 = content.includes("\u{1F916} Coding Agent") || content.includes("@copilot");
  const autoAssign = content.includes("<!-- copilot-auto-assign: true -->");
  console.log(`
${BOLD}\u{1F504} Ralph \u2014 Watch Mode${RESET}`);
  console.log(`${DIM}Polling every ${intervalMinutes} minute(s) for squad work. Ctrl+C to stop.${RESET}
`);
  await runCheck(members, hasCopilot2, autoAssign);
  const intervalId = setInterval(async () => {
    await runCheck(members, hasCopilot2, autoAssign);
  }, intervalMinutes * 60 * 1e3);
  const shutdown = () => {
    clearInterval(intervalId);
    console.log(`
${DIM}\u{1F504} Ralph \u2014 Watch stopped${RESET}`);
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
var init_watch = __esm({
  "dist/cli/commands/watch.js"() {
    "use strict";
    init_detect_squad_dir();
    init_errors();
    init_output();
    init_gh_cli();
  }
});

// dist/cli/commands/export.js
var export_exports = {};
__export(export_exports, {
  runExport: () => runExport
});
import fs10 from "node:fs";
import path10 from "node:path";
async function runExport(dest, outPath) {
  const squadInfo = detectSquadDir(dest);
  const teamMd = path10.join(squadInfo.path, "team.md");
  if (!fs10.existsSync(teamMd)) {
    fatal("No squad found \u2014 run init first");
  }
  const manifest = {
    version: "1.0",
    exported_at: (/* @__PURE__ */ new Date()).toISOString(),
    squad_version: "0.6.0",
    casting: {},
    agents: {},
    skills: []
  };
  const castingDir = path10.join(squadInfo.path, "casting");
  for (const file of ["registry.json", "policy.json", "history.json"]) {
    const filePath = path10.join(castingDir, file);
    try {
      if (fs10.existsSync(filePath)) {
        manifest.casting[file.replace(".json", "")] = JSON.parse(fs10.readFileSync(filePath, "utf8"));
      }
    } catch (err) {
      console.error(`Warning: could not read casting/${file}: ${err.message}`);
    }
  }
  const agentsDir = path10.join(squadInfo.path, "agents");
  try {
    if (fs10.existsSync(agentsDir)) {
      for (const entry of fs10.readdirSync(agentsDir)) {
        const agentDir = path10.join(agentsDir, entry);
        if (!fs10.statSync(agentDir).isDirectory())
          continue;
        const agent = {};
        const charterPath = path10.join(agentDir, "charter.md");
        const historyPath = path10.join(agentDir, "history.md");
        if (fs10.existsSync(charterPath))
          agent.charter = fs10.readFileSync(charterPath, "utf8");
        if (fs10.existsSync(historyPath))
          agent.history = fs10.readFileSync(historyPath, "utf8");
        manifest.agents[entry] = agent;
      }
    }
  } catch (err) {
    console.error(`Warning: could not read agents: ${err.message}`);
  }
  const skillsDir = path10.join(squadInfo.path, "skills");
  try {
    if (fs10.existsSync(skillsDir)) {
      for (const entry of fs10.readdirSync(skillsDir)) {
        const skillFile = path10.join(skillsDir, entry, "SKILL.md");
        if (fs10.existsSync(skillFile)) {
          manifest.skills.push(fs10.readFileSync(skillFile, "utf8"));
        }
      }
    }
  } catch (err) {
    console.error(`Warning: could not read skills: ${err.message}`);
  }
  const finalOutPath = outPath || path10.join(dest, "squad-export.json");
  try {
    fs10.writeFileSync(finalOutPath, JSON.stringify(manifest, null, 2) + "\n");
  } catch (err) {
    fatal(`Failed to write export file: ${err.message}`);
  }
  const displayPath = path10.relative(dest, finalOutPath) || path10.basename(finalOutPath);
  success(`Exported squad to ${displayPath}`);
  warn("Review agent histories before sharing \u2014 they may contain project-specific information");
}
var init_export = __esm({
  "dist/cli/commands/export.js"() {
    "use strict";
    init_detect_squad_dir();
    init_output();
    init_errors();
  }
});

// dist/cli/core/history-split.js
function splitHistory(history, sourceProject) {
  const lines = history.split("\n");
  const portable = [];
  const projectLearnings = [];
  const projectSectionPatterns = [
    /^##\s*key file paths/i,
    /^##\s*sprint/i,
    /^##\s*pr\s*#/i,
    /^##\s*file system/i,
    /^##\s*session/i,
    /^###\s*key file paths/i,
    /^###\s*sprint/i,
    /^###\s*pr\s*#/i,
    /^###\s*file system/i,
    /^###\s*session/i
  ];
  const portableSectionPatterns = [
    /^##\s*learnings/i,
    /^##\s*portable knowledge/i,
    /^###\s*runtime architecture/i,
    /^###\s*windows compatibility/i,
    /^###\s*critical paths/i,
    /^###\s*forwardability/i,
    /^##\s*team updates/i
  ];
  let inProjectSection = false;
  for (const line of lines) {
    if (/^#{1,3}\s/.test(line)) {
      const isProjectSection = projectSectionPatterns.some((p) => p.test(line));
      const isPortableSection = portableSectionPatterns.some((p) => p.test(line));
      if (isProjectSection) {
        inProjectSection = true;
      } else if (isPortableSection) {
        inProjectSection = false;
      }
    }
    if (inProjectSection) {
      projectLearnings.push(line);
    } else {
      portable.push(line);
    }
  }
  let result = "";
  if (portable.length > 0) {
    result += portable.join("\n");
  }
  if (projectLearnings.length > 0) {
    result += `

## Project Learnings (from import \u2014 ${sourceProject})

`;
    result += projectLearnings.join("\n");
  }
  return result;
}
var init_history_split = __esm({
  "dist/cli/core/history-split.js"() {
    "use strict";
  }
});

// dist/cli/commands/import.js
var import_exports = {};
__export(import_exports, {
  runImport: () => runImport
});
import fs11 from "node:fs";
import path11 from "node:path";
async function runImport(dest, importPath, force) {
  const resolvedPath = path11.resolve(importPath);
  if (!fs11.existsSync(resolvedPath)) {
    fatal(`Import file not found: ${importPath}`);
  }
  let manifest;
  try {
    manifest = JSON.parse(fs11.readFileSync(resolvedPath, "utf8"));
  } catch (err) {
    fatal(`Invalid JSON in import file: ${err.message}`);
  }
  if (manifest.version !== "1.0") {
    fatal(`Unsupported export version: ${manifest.version || "missing"} (expected 1.0)`);
  }
  if (!manifest.agents || typeof manifest.agents !== "object") {
    fatal('Invalid export file: missing or invalid "agents" field');
  }
  if (!manifest.casting || typeof manifest.casting !== "object") {
    fatal('Invalid export file: missing or invalid "casting" field');
  }
  if (!Array.isArray(manifest.skills)) {
    fatal('Invalid export file: missing or invalid "skills" field');
  }
  const squadInfo = detectSquadDir(dest);
  const squadDir = squadInfo.path;
  if (fs11.existsSync(squadDir)) {
    if (!force) {
      fatal("A squad already exists here. Use --force to replace (current squad will be archived).");
    }
    const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/:/g, "-").replace(/\./g, "-");
    const archiveDir = path11.join(dest, `${squadInfo.name}-archive-${ts}`);
    fs11.renameSync(squadDir, archiveDir);
    info(`Archived existing squad to ${path11.basename(archiveDir)}`);
  }
  fs11.mkdirSync(path11.join(squadDir, "casting"), { recursive: true });
  fs11.mkdirSync(path11.join(squadDir, "decisions", "inbox"), { recursive: true });
  fs11.mkdirSync(path11.join(squadDir, "orchestration-log"), { recursive: true });
  fs11.mkdirSync(path11.join(squadDir, "log"), { recursive: true });
  fs11.mkdirSync(path11.join(squadDir, "skills"), { recursive: true });
  fs11.writeFileSync(path11.join(squadDir, "decisions.md"), "");
  fs11.writeFileSync(path11.join(squadDir, "team.md"), "");
  for (const [key, value] of Object.entries(manifest.casting)) {
    fs11.writeFileSync(path11.join(squadDir, "casting", `${key}.json`), JSON.stringify(value, null, 2) + "\n");
  }
  const sourceProject = path11.basename(resolvedPath, ".json");
  const importDate = (/* @__PURE__ */ new Date()).toISOString();
  const agentNames = Object.keys(manifest.agents);
  for (const name of agentNames) {
    const agent = manifest.agents[name];
    const agentDir = path11.join(squadDir, "agents", name);
    fs11.mkdirSync(agentDir, { recursive: true });
    if (agent.charter) {
      fs11.writeFileSync(path11.join(agentDir, "charter.md"), agent.charter);
    }
    let historyContent = "";
    if (agent.history) {
      historyContent = splitHistory(agent.history, sourceProject);
    }
    historyContent = `\u{1F4CC} Imported from ${sourceProject} on ${importDate}. Portable knowledge carried over; project learnings from previous project preserved below.

` + historyContent;
    fs11.writeFileSync(path11.join(agentDir, "history.md"), historyContent);
  }
  for (const skillContent of manifest.skills) {
    const nameMatch = skillContent.match(/^name:\s*["']?(.+?)["']?\s*$/m);
    const skillName = nameMatch ? nameMatch[1].trim().toLowerCase().replace(/\s+/g, "-") : `skill-${manifest.skills.indexOf(skillContent)}`;
    const skillDir = path11.join(squadDir, "skills", skillName);
    fs11.mkdirSync(skillDir, { recursive: true });
    fs11.writeFileSync(path11.join(skillDir, "SKILL.md"), skillContent);
  }
  let universe = "unknown";
  if (manifest.casting.policy && typeof manifest.casting.policy === "object") {
    const policy = manifest.casting.policy;
    if (policy.universe) {
      universe = String(policy.universe);
    }
  }
  success(`Imported squad from ${path11.basename(resolvedPath)}`);
  info(`  ${agentNames.length} agents: ${agentNames.join(", ")}`);
  info(`  ${manifest.skills.length} skills imported`);
  info(`  Casting: ${universe} universe preserved`);
  console.log();
  warn("Project-specific learnings are marked in agent histories \u2014 review if needed");
  console.log();
  info("Next steps:");
  info("  1. Open Copilot and select Squad");
  info("  2. Tell the team about this project \u2014 they'll adapt");
  console.log();
}
var init_import = __esm({
  "dist/cli/commands/import.js"() {
    "use strict";
    init_detect_squad_dir();
    init_output();
    init_errors();
    init_history_split();
  }
});

// dist/cli/commands/plugin.js
var plugin_exports = {};
__export(plugin_exports, {
  runPlugin: () => runPlugin
});
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync as existsSync2 } from "node:fs";
import { join as join2 } from "node:path";
import { execFile as execFile2 } from "node:child_process";
import { promisify as promisify2 } from "node:util";
async function runPlugin(dest, args) {
  const subCmd = args[0];
  const action = args[1];
  if (subCmd !== "marketplace" || !action) {
    fatal("Usage: squad plugin marketplace add|remove|list|browse");
  }
  const squadDirInfo = detectSquadDir(dest);
  const pluginsDir = join2(squadDirInfo.path, "plugins");
  const marketplacesFile = join2(pluginsDir, "marketplaces.json");
  async function readMarketplaces() {
    if (!existsSync2(marketplacesFile)) {
      return { marketplaces: [] };
    }
    try {
      const content = await readFile(marketplacesFile, "utf8");
      return JSON.parse(content);
    } catch {
      return { marketplaces: [] };
    }
  }
  async function writeMarketplaces(data) {
    await mkdir(pluginsDir, { recursive: true });
    await writeFile(marketplacesFile, JSON.stringify(data, null, 2) + "\n", "utf8");
  }
  if (action === "add") {
    const source = args[2];
    if (!source || !source.includes("/")) {
      fatal("Usage: squad plugin marketplace add <owner/repo>");
    }
    const data = await readMarketplaces();
    const name = source.split("/").pop();
    if (data.marketplaces.some((m) => m.source === source)) {
      info(`${DIM}${source} is already registered${RESET}`);
      return;
    }
    data.marketplaces.push({
      name,
      source,
      added_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    await writeMarketplaces(data);
    success(`Registered marketplace: ${BOLD}${name}${RESET} (${source})`);
    return;
  }
  if (action === "remove") {
    const name = args[2];
    if (!name) {
      fatal("Usage: squad plugin marketplace remove <name>");
    }
    const data = await readMarketplaces();
    const before = data.marketplaces.length;
    data.marketplaces = data.marketplaces.filter((m) => m.name !== name);
    if (data.marketplaces.length === before) {
      fatal(`Marketplace "${name}" not found`);
    }
    await writeMarketplaces(data);
    success(`Removed marketplace: ${BOLD}${name}${RESET}`);
    return;
  }
  if (action === "list") {
    const data = await readMarketplaces();
    if (data.marketplaces.length === 0) {
      info(`${DIM}No marketplaces registered${RESET}`);
      console.log(`
Add one with: ${BOLD}squad plugin marketplace add <owner/repo>${RESET}`);
      return;
    }
    console.log(`
${BOLD}Registered marketplaces:${RESET}
`);
    for (const m of data.marketplaces) {
      const date = m.added_at ? ` ${DIM}(added ${m.added_at.split("T")[0]})${RESET}` : "";
      console.log(`  ${BOLD}${m.name}${RESET}  \u2192  ${m.source}${date}`);
    }
    console.log();
    return;
  }
  if (action === "browse") {
    const name = args[2];
    if (!name) {
      fatal("Usage: squad plugin marketplace browse <name>");
    }
    const data = await readMarketplaces();
    const marketplace = data.marketplaces.find((m) => m.name === name);
    if (!marketplace) {
      fatal(`Marketplace "${name}" not found. Run "squad plugin marketplace list" to see registered marketplaces.`);
    }
    if (!await ghAvailable()) {
      fatal("GitHub CLI (gh) is required but not found. Install from https://cli.github.com/");
    }
    if (!await ghAuthenticated()) {
      fatal('GitHub CLI is not authenticated. Run "gh auth login" first.');
    }
    let entries;
    try {
      const { stdout } = await execFileAsync2("gh", ["api", `repos/${marketplace.source}/contents`, "--jq", '[.[] | select(.type == "dir") | .name]'], { timeout: 15e3 });
      entries = JSON.parse(stdout.trim());
    } catch (err) {
      fatal(`Could not browse ${marketplace.source} \u2014 ${err.message}`);
    }
    if (!entries || entries.length === 0) {
      info(`${DIM}No plugins found in ${marketplace.source}${RESET}`);
      return;
    }
    console.log(`
${BOLD}Plugins in ${marketplace.name}${RESET} (${marketplace.source}):
`);
    for (const entry of entries) {
      console.log(`  \u{1F4E6} ${entry}`);
    }
    console.log(`
${DIM}${entries.length} plugin(s) available${RESET}
`);
    return;
  }
  fatal(`Unknown action: ${action}. Usage: squad plugin marketplace add|remove|list|browse`);
}
var execFileAsync2;
var init_plugin = __esm({
  "dist/cli/commands/plugin.js"() {
    "use strict";
    init_output();
    init_errors();
    init_detect_squad_dir();
    init_gh_cli();
    execFileAsync2 = promisify2(execFile2);
  }
});

// dist/cli/core/team-md.js
import fs12 from "node:fs";
import path12 from "node:path";
function readTeamMd(squadDir) {
  const teamMdPath = path12.join(squadDir, "team.md");
  if (!fs12.existsSync(teamMdPath)) {
    throw new Error("team.md not found \u2014 run init first");
  }
  return fs12.readFileSync(teamMdPath, "utf8");
}
function writeTeamMd(squadDir, content) {
  const teamMdPath = path12.join(squadDir, "team.md");
  fs12.writeFileSync(teamMdPath, content, "utf8");
}
function hasCopilot(content) {
  return content.includes("\u{1F916} Coding Agent");
}
function insertCopilotSection(content, autoAssign = false) {
  const autoAssignValue = autoAssign ? "true" : "false";
  const copilotSection = `
## Coding Agent

<!-- copilot-auto-assign: ${autoAssignValue} -->

| Name | Role | Charter | Status |
|------|------|---------|--------|
| @copilot | Coding Agent | \u2014 | \u{1F916} Coding Agent |

### Capabilities

**\u{1F7E2} Good fit \u2014 auto-route when enabled:**
- Bug fixes with clear reproduction steps
- Test coverage (adding missing tests, fixing flaky tests)
- Lint/format fixes and code style cleanup
- Dependency updates and version bumps
- Small isolated features with clear specs
- Boilerplate/scaffolding generation
- Documentation fixes and README updates

**\u{1F7E1} Needs review \u2014 route to @copilot but flag for squad member PR review:**
- Medium features with clear specs and acceptance criteria
- Refactoring with existing test coverage
- API endpoint additions following established patterns
- Migration scripts with well-defined schemas

**\u{1F534} Not suitable \u2014 route to squad member instead:**
- Architecture decisions and system design
- Multi-system integration requiring coordination
- Ambiguous requirements needing clarification
- Security-critical changes (auth, encryption, access control)
- Performance-critical paths requiring benchmarking
- Changes requiring cross-team discussion

`;
  if (content.includes("## Project Context")) {
    return content.replace("## Project Context", copilotSection + "## Project Context");
  } else {
    return content.trimEnd() + "\n" + copilotSection;
  }
}
function removeCopilotSection(content) {
  return content.replace(/\n## Coding Agent\n[\s\S]*?(?=\n## |\n*$)/, "");
}
function setAutoAssign(content, enabled) {
  const targetValue = enabled ? "true" : "false";
  const oppositeValue = enabled ? "false" : "true";
  return content.replace(`<!-- copilot-auto-assign: ${oppositeValue} -->`, `<!-- copilot-auto-assign: ${targetValue} -->`);
}
var init_team_md = __esm({
  "dist/cli/core/team-md.js"() {
    "use strict";
  }
});

// dist/cli/commands/copilot.js
var copilot_exports = {};
__export(copilot_exports, {
  runCopilot: () => runCopilot
});
import fs13 from "node:fs";
import path13 from "node:path";
async function runCopilot(dest, flags) {
  const squadDirInfo = detectSquadDir(dest);
  const squadDir = squadDirInfo.path;
  if (!fs13.existsSync(squadDir)) {
    throw new Error("No squad found \u2014 run init first, then add the copilot agent.");
  }
  let content = readTeamMd(squadDir);
  const copilotExists = hasCopilot(content);
  if (flags.off) {
    if (!copilotExists) {
      console.log(`${DIM}Copilot coding agent is not on the team \u2014 nothing to remove${RESET}`);
      return;
    }
    content = removeCopilotSection(content);
    writeTeamMd(squadDir, content);
    success("Removed @copilot from the team roster");
    const instructionsDest2 = path13.join(dest, ".github", "copilot-instructions.md");
    if (fs13.existsSync(instructionsDest2)) {
      fs13.unlinkSync(instructionsDest2);
      success("Removed .github/copilot-instructions.md");
    }
    return;
  }
  if (copilotExists) {
    if (flags.autoAssign) {
      content = setAutoAssign(content, true);
      writeTeamMd(squadDir, content);
      success("Enabled @copilot auto-assign");
    } else {
      console.log(`${DIM}@copilot is already on the team${RESET}`);
    }
    return;
  }
  content = insertCopilotSection(content, flags.autoAssign);
  writeTeamMd(squadDir, content);
  success("Added @copilot (Coding Agent) to team roster");
  if (flags.autoAssign) {
    success("Auto-assign enabled \u2014 squad-labeled issues will be assigned to @copilot");
  }
  const currentFileUrl = new URL(import.meta.url);
  const currentFilePath = currentFileUrl.pathname.startsWith("/") && process.platform === "win32" ? currentFileUrl.pathname.substring(1) : currentFileUrl.pathname;
  const templatesSrc = path13.resolve(path13.dirname(currentFilePath), "..", "..", "..", "templates");
  const instructionsSrc = path13.join(templatesSrc, "copilot-instructions.md");
  const instructionsDest = path13.join(dest, ".github", "copilot-instructions.md");
  if (fs13.existsSync(instructionsSrc)) {
    fs13.mkdirSync(path13.dirname(instructionsDest), { recursive: true });
    fs13.copyFileSync(instructionsSrc, instructionsDest);
    success(".github/copilot-instructions.md");
  }
  console.log();
  console.log(`${BOLD}@copilot is on the team.${RESET}`);
  console.log(`The coding agent will pick up issues matching its capability profile.`);
  if (!flags.autoAssign) {
    console.log(`Run with ${BOLD}--auto-assign${RESET} to auto-assign @copilot on squad-labeled issues.`);
  }
  console.log();
  console.log(`${BOLD}Required:${RESET} Add a classic PAT (repo scope) as a repo secret for auto-assignment:`);
  console.log(`  1. Create token:  ${DIM}https://github.com/settings/tokens/new${RESET}`);
  console.log(`  2. Set secret:    ${DIM}gh secret set COPILOT_ASSIGN_TOKEN${RESET}`);
  console.log();
}
var init_copilot = __esm({
  "dist/cli/commands/copilot.js"() {
    "use strict";
    init_output();
    init_detect_squad_dir();
    init_team_md();
  }
});

// dist/cli-entry.js
init_errors();
init_output();

// dist/cli/core/init.js
init_detect_squad_dir();
init_templates();
init_output();
init_errors();
import fs4 from "node:fs/promises";
import fsSync from "node:fs";
import path4 from "node:path";

// dist/cli/core/project-type.js
import fs2 from "node:fs";
import path2 from "node:path";
function detectProjectType(dir) {
  if (fs2.existsSync(path2.join(dir, "package.json")))
    return "npm";
  if (fs2.existsSync(path2.join(dir, "go.mod")))
    return "go";
  if (fs2.existsSync(path2.join(dir, "requirements.txt")) || fs2.existsSync(path2.join(dir, "pyproject.toml")))
    return "python";
  if (fs2.existsSync(path2.join(dir, "pom.xml")) || fs2.existsSync(path2.join(dir, "build.gradle")) || fs2.existsSync(path2.join(dir, "build.gradle.kts")))
    return "java";
  try {
    const entries = fs2.readdirSync(dir);
    if (entries.some((e) => e.endsWith(".csproj") || e.endsWith(".sln") || e.endsWith(".slnx") || e.endsWith(".fsproj") || e.endsWith(".vbproj")))
      return "dotnet";
  } catch {
  }
  return "unknown";
}

// dist/cli/core/version.js
import fs3 from "node:fs";
import path3 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
function getPackageVersion() {
  const currentFile2 = fileURLToPath2(import.meta.url);
  let dir = path3.dirname(currentFile2);
  for (let i = 0; i < 6; i++) {
    const candidate = path3.join(dir, "package.json");
    if (fs3.existsSync(candidate)) {
      const pkg = JSON.parse(fs3.readFileSync(candidate, "utf8"));
      return pkg.version;
    }
    const parent = path3.dirname(dir);
    if (parent === dir)
      break;
    dir = parent;
  }
  return "0.0.0";
}
function stampVersion(filePath, version) {
  let content = fs3.readFileSync(filePath, "utf8");
  content = content.replace(/<!-- version: [^>]+ -->/m, `<!-- version: ${version} -->`);
  content = content.replace(/- \*\*Version:\*\* [0-9.]+(?:-[a-z]+)?/m, `- **Version:** ${version}`);
  content = content.replace(/`Squad v\{version\}`/g, `\`Squad v${version}\``);
  fs3.writeFileSync(filePath, content);
}

// dist/cli/core/workflows.js
var PROJECT_TYPE_SENSITIVE_WORKFLOWS = /* @__PURE__ */ new Set([
  "squad-ci.yml",
  "squad-release.yml",
  "squad-preview.yml",
  "squad-insider-release.yml",
  "squad-docs.yml"
]);
function generateProjectWorkflowStub(workflowFile, projectType) {
  const typeLabel = projectType === "unknown" ? "Project type was not detected" : projectType + " project";
  const todoBuildCmd = projectType === "unknown" ? "# TODO: Project type was not detected \u2014 add your build/test commands here" : "# TODO: Add your " + projectType + " build/test commands here";
  const buildHints = [
    "          # Go:            go test ./...",
    "          # Python:        pip install -r requirements.txt && pytest",
    "          # .NET:          dotnet test",
    "          # Java (Maven):  mvn test",
    "          # Java (Gradle): ./gradlew test"
  ].join("\n");
  if (workflowFile === "squad-ci.yml") {
    return "name: Squad CI\n# " + typeLabel + " \u2014 configure build/test commands below\n\non:\n  pull_request:\n    branches: [dev, preview, main, insider]\n    types: [opened, synchronize, reopened]\n  push:\n    branches: [dev, insider]\n\npermissions:\n  contents: read\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build and test\n        run: |\n          " + todoBuildCmd + "\n" + buildHints + '\n          echo "No build commands configured \u2014 update squad-ci.yml"\n';
  }
  if (workflowFile === "squad-release.yml") {
    return "name: Squad Release\n# " + typeLabel + " \u2014 configure build, test, and release commands below\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: write\n\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n\n      - name: Build and test\n        run: |\n          " + todoBuildCmd + "\n" + buildHints + '\n          echo "No build commands configured \u2014 update squad-release.yml"\n\n      - name: Create release\n        env:\n          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: |\n          # TODO: Add your release commands here (e.g., git tag, gh release create)\n          echo "No release commands configured \u2014 update squad-release.yml"\n';
  }
  if (workflowFile === "squad-preview.yml") {
    return "name: Squad Preview Validation\n# " + typeLabel + " \u2014 configure build, test, and validation commands below\n\non:\n  push:\n    branches: [preview]\n\npermissions:\n  contents: read\n\njobs:\n  validate:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build and test\n        run: |\n          " + todoBuildCmd + "\n" + buildHints + '\n          echo "No build commands configured \u2014 update squad-preview.yml"\n\n      - name: Validate\n        run: |\n          # TODO: Add pre-release validation commands here\n          echo "No validation commands configured \u2014 update squad-preview.yml"\n';
  }
  if (workflowFile === "squad-insider-release.yml") {
    return "name: Squad Insider Release\n# " + typeLabel + " \u2014 configure build, test, and insider release commands below\n\non:\n  push:\n    branches: [insider]\n\npermissions:\n  contents: write\n\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          fetch-depth: 0\n\n      - name: Build and test\n        run: |\n          " + todoBuildCmd + "\n" + buildHints + '\n          echo "No build commands configured \u2014 update squad-insider-release.yml"\n\n      - name: Create insider release\n        env:\n          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n        run: |\n          # TODO: Add your insider/pre-release commands here\n          echo "No release commands configured \u2014 update squad-insider-release.yml"\n';
  }
  if (workflowFile === "squad-docs.yml") {
    return "name: Squad Docs \u2014 Build & Deploy\n# " + typeLabel + ` \u2014 configure documentation build commands below

on:
  workflow_dispatch:
  push:
    branches: [preview]
    paths:
      - 'docs/**'
      - '.github/workflows/squad-docs.yml'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build docs
        run: |
          # TODO: Add your documentation build commands here
          # This workflow is optional \u2014 remove or customize it for your project
          echo "No docs build commands configured \u2014 update or remove squad-docs.yml"
`;
  }
  return null;
}

// dist/cli/core/init.js
function showDeprecationWarning() {
  console.log();
  console.log(`${YELLOW}\u26A0\uFE0F  DEPRECATION: .ai-team/ is deprecated and will be removed in v1.0.0${RESET}`);
  console.log(`${YELLOW}    Run 'npx github:bradygaster/squad-sdk upgrade --migrate-directory' to migrate to .squad/${RESET}`);
  console.log(`${YELLOW}    Details: https://github.com/bradygaster/squad/issues/101${RESET}`);
  console.log();
}
async function copyRecursive(src, target) {
  const stat = await fs4.stat(src);
  if (stat.isDirectory()) {
    await fs4.mkdir(target, { recursive: true });
    const entries = await fs4.readdir(src);
    for (const entry of entries) {
      await copyRecursive(path4.join(src, entry), path4.join(target, entry));
    }
  } else {
    await fs4.mkdir(path4.dirname(target), { recursive: true });
    await fs4.copyFile(src, target);
  }
}
async function writeWorkflowFile(file, srcPath, destPath, projectType) {
  if (projectType !== "npm" && PROJECT_TYPE_SENSITIVE_WORKFLOWS.has(file)) {
    const stub = generateProjectWorkflowStub(file, projectType);
    if (stub) {
      await fs4.writeFile(destPath, stub);
      return;
    }
  }
  await fs4.copyFile(srcPath, destPath);
}
async function runInit(dest) {
  const version = getPackageVersion();
  const projectType = detectProjectType(dest);
  try {
    await fs4.access(dest, fsSync.constants.W_OK);
  } catch {
    fatal(`Cannot write to ${dest} \u2014 check directory permissions`);
  }
  const templatesDir = getTemplatesDir();
  const agentSrc = path4.join(templatesDir, "squad.agent.md");
  try {
    await fs4.access(templatesDir);
    await fs4.access(agentSrc);
  } catch {
    fatal(`Templates directory missing or corrupted \u2014 installation may be corrupted`);
  }
  const squadInfo = detectSquadDir(dest);
  if (squadInfo.isLegacy) {
    showDeprecationWarning();
  }
  const agentDest = path4.join(dest, ".github", "agents", "squad.agent.md");
  if (fsSync.existsSync(agentDest)) {
    console.log(`${DIM}squad.agent.md already exists \u2014 skipping (run 'upgrade' to update)${RESET}`);
  } else {
    try {
      await fs4.mkdir(path4.dirname(agentDest), { recursive: true });
      await fs4.copyFile(agentSrc, agentDest);
      stampVersion(agentDest, version);
      success(`.github/agents/squad.agent.md (v${version})`);
    } catch (err) {
      fatal(`Failed to create squad.agent.md: ${err.message}`);
    }
  }
  const inboxDir = path4.join(squadInfo.path, "decisions", "inbox");
  const orchLogDir = path4.join(squadInfo.path, "orchestration-log");
  const castingDir = path4.join(squadInfo.path, "casting");
  const skillsDir = path4.join(squadInfo.path, "skills");
  const pluginsDir = path4.join(squadInfo.path, "plugins");
  const identityDir = path4.join(squadInfo.path, "identity");
  try {
    await fs4.mkdir(inboxDir, { recursive: true });
    await fs4.mkdir(orchLogDir, { recursive: true });
    await fs4.mkdir(castingDir, { recursive: true });
    await fs4.mkdir(skillsDir, { recursive: true });
    await fs4.mkdir(pluginsDir, { recursive: true });
    await fs4.mkdir(identityDir, { recursive: true });
  } catch (err) {
    fatal(`Failed to create ${squadInfo.name}/ directories: ${err.message}`);
  }
  const skillsSrc = path4.join(templatesDir, "skills");
  try {
    if (fsSync.existsSync(skillsSrc)) {
      const existingSkills = await fs4.readdir(skillsDir);
      if (existingSkills.length === 0) {
        await copyRecursive(skillsSrc, skillsDir);
        success(`${squadInfo.name}/skills/ (starter skills)`);
      }
    }
  } catch {
  }
  const nowMdPath = path4.join(identityDir, "now.md");
  const wisdomMdPath = path4.join(identityDir, "wisdom.md");
  if (!fsSync.existsSync(nowMdPath)) {
    const nowTemplate = `---
updated_at: ${(/* @__PURE__ */ new Date()).toISOString()}
focus_area: Initial setup
active_issues: []
---

# What We're Focused On

Getting started. Updated by coordinator at session start.
`;
    await fs4.mkdir(identityDir, { recursive: true });
    await fs4.writeFile(nowMdPath, nowTemplate);
    success(`${squadInfo.name}/identity/now.md`);
  }
  if (!fsSync.existsSync(wisdomMdPath)) {
    const wisdomTemplate = `---
last_updated: ${(/* @__PURE__ */ new Date()).toISOString()}
---

# Team Wisdom

Reusable patterns and heuristics learned through work. NOT transcripts \u2014 each entry is a distilled, actionable insight.

## Patterns

<!-- Append entries below. Format: **Pattern:** description. **Context:** when it applies. -->

## Anti-Patterns

<!-- Things we tried that didn't work. **Avoid:** description. **Why:** reason. -->
`;
    await fs4.mkdir(identityDir, { recursive: true });
    await fs4.writeFile(wisdomMdPath, wisdomTemplate);
    success(`${squadInfo.name}/identity/wisdom.md`);
  }
  const mcpDir = path4.join(dest, ".copilot");
  const mcpConfigPath = path4.join(mcpDir, "mcp-config.json");
  if (!fsSync.existsSync(mcpConfigPath)) {
    try {
      await fs4.mkdir(mcpDir, { recursive: true });
      const mcpSample = {
        mcpServers: {
          "EXAMPLE-trello": {
            command: "npx",
            args: ["-y", "@trello/mcp-server"],
            env: {
              TRELLO_API_KEY: "${TRELLO_API_KEY}",
              TRELLO_TOKEN: "${TRELLO_TOKEN}"
            }
          }
        }
      };
      await fs4.writeFile(mcpConfigPath, JSON.stringify(mcpSample, null, 2) + "\n");
      success(".copilot/mcp-config.json (MCP sample \u2014 rename EXAMPLE-trello to enable)");
    } catch (err) {
    }
  } else {
    console.log(`${DIM}mcp-config.json already exists \u2014 skipping${RESET}`);
  }
  const ceremoniesDest = path4.join(squadInfo.path, "ceremonies.md");
  if (!fsSync.existsSync(ceremoniesDest)) {
    const ceremoniesSrc = path4.join(templatesDir, "ceremonies.md");
    await fs4.copyFile(ceremoniesSrc, ceremoniesDest);
    success(`${squadInfo.name}/ceremonies.md`);
  } else {
    console.log(`${DIM}ceremonies.md already exists \u2014 skipping${RESET}`);
  }
  const gitattributesPath = path4.join(dest, ".gitattributes");
  const unionRules = [
    `${squadInfo.name}/decisions.md merge=union`,
    `${squadInfo.name}/agents/*/history.md merge=union`,
    `${squadInfo.name}/log/** merge=union`,
    `${squadInfo.name}/orchestration-log/** merge=union`
  ];
  let existing = "";
  try {
    existing = await fs4.readFile(gitattributesPath, "utf8");
  } catch {
  }
  const missing = unionRules.filter((rule) => !existing.includes(rule));
  if (missing.length) {
    const block = (existing && !existing.endsWith("\n") ? "\n" : "") + "# Squad: union merge for append-only team state files\n" + missing.join("\n") + "\n";
    await fs4.appendFile(gitattributesPath, block);
    success(".gitattributes (merge=union rules)");
  } else {
    console.log(`${DIM}.gitattributes merge rules already present \u2014 skipping${RESET}`);
  }
  const gitignorePath = path4.join(dest, ".gitignore");
  const ignoreEntries = [
    `${squadInfo.name}/orchestration-log/`,
    `${squadInfo.name}/log/`
  ];
  let existingIgnore = "";
  try {
    existingIgnore = await fs4.readFile(gitignorePath, "utf8");
  } catch {
  }
  const missingIgnore = ignoreEntries.filter((entry) => !existingIgnore.includes(entry));
  if (missingIgnore.length) {
    const block = (existingIgnore && !existingIgnore.endsWith("\n") ? "\n" : "") + "# Squad: ignore generated logs\n" + missingIgnore.join("\n") + "\n";
    await fs4.appendFile(gitignorePath, block);
    success(".gitignore (log exclusions)");
  }
  const templatesDestName = squadInfo.isLegacy ? ".ai-team-templates" : ".squad-templates";
  const templatesDest = path4.join(dest, templatesDestName);
  if (fsSync.existsSync(templatesDest)) {
    console.log(`${DIM}${templatesDestName}/ already exists \u2014 skipping (run 'upgrade' to update)${RESET}`);
  } else {
    await copyRecursive(templatesDir, templatesDest);
    success(`${templatesDestName}/`);
  }
  const workflowsSrc = path4.join(templatesDir, "workflows");
  const workflowsDest = path4.join(dest, ".github", "workflows");
  if (fsSync.existsSync(workflowsSrc) && fsSync.statSync(workflowsSrc).isDirectory()) {
    const workflowFiles = (await fs4.readdir(workflowsSrc)).filter((f) => f.endsWith(".yml"));
    await fs4.mkdir(workflowsDest, { recursive: true });
    let copied = 0;
    for (const file of workflowFiles) {
      const destFile = path4.join(workflowsDest, file);
      if (fsSync.existsSync(destFile)) {
        console.log(`${DIM}${file} already exists \u2014 skipping (run 'upgrade' to update)${RESET}`);
      } else {
        await writeWorkflowFile(file, path4.join(workflowsSrc, file), destFile, projectType);
        success(`.github/workflows/${file}`);
        copied++;
      }
    }
    if (copied === 0 && workflowFiles.length > 0) {
      console.log(`${DIM}all squad workflows already exist \u2014 skipping${RESET}`);
    }
  }
  console.log();
  console.log(`${BOLD}Squad is ready.${RESET}`);
  console.log();
  if (squadInfo.isLegacy) {
    showDeprecationWarning();
  }
  console.log(`Next steps:`);
  console.log(`  1. Open Copilot:  ${DIM}copilot${RESET}`);
  console.log(`  2. Type ${BOLD}/agent${RESET} (CLI) or ${BOLD}/agents${RESET} (VS Code) and select ${BOLD}Squad${RESET}`);
  console.log(`  3. Tell it what you're building`);
  console.log();
}

// dist/cli-entry.js
var VERSION = "0.6.0-alpha.0";
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (cmd === "--version" || cmd === "-v") {
    console.log(`squad ${VERSION}`);
    process.exit(0);
  }
  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    console.log(`
${BOLD}squad${RESET} v${VERSION} \u2014 Add an AI agent team to any project
`);
    console.log(`Usage: npx github:bradygaster/squad-sdk [command]
`);
    console.log(`Commands:`);
    console.log(`  ${BOLD}(default)${RESET}  Initialize Squad (skip files that already exist)`);
    console.log(`  ${BOLD}upgrade${RESET}    Update Squad-owned files to latest version`);
    console.log(`             Overwrites: squad.agent.md, templates dir (.squad-templates/ or .ai-team-templates/)`);
    console.log(`             Never touches: .squad/ or .ai-team/ (your team state)`);
    console.log(`             Flags: --migrate-directory (rename .ai-team/ \u2192 .squad/)`);
    console.log(`  ${BOLD}copilot${RESET}    Add/remove the Copilot coding agent (@copilot)`);
    console.log(`             Usage: copilot [--off] [--auto-assign]`);
    console.log(`  ${BOLD}watch${RESET}      Run Ralph's work monitor as a local polling process`);
    console.log(`             Usage: watch [--interval <minutes>]`);
    console.log(`             Default: checks every 10 minutes (Ctrl+C to stop)`);
    console.log(`  ${BOLD}plugin${RESET}     Manage plugin marketplaces`);
    console.log(`             Usage: plugin marketplace add|remove|list|browse`);
    console.log(`  ${BOLD}export${RESET}     Export squad to a portable JSON snapshot`);
    console.log(`             Default: squad-export.json (use --out <path> to override)`);
    console.log(`  ${BOLD}import${RESET}     Import squad from an export file`);
    console.log(`             Usage: import <file> [--force]`);
    console.log(`  ${BOLD}scrub-emails${RESET}  Remove email addresses from Squad state files`);
    console.log(`             Usage: scrub-emails [directory] (default: .ai-team/)`);
    console.log(`  ${BOLD}help${RESET}       Show this help message`);
    console.log(`
Flags:`);
    console.log(`  ${BOLD}--version, -v${RESET}  Print version`);
    console.log(`  ${BOLD}--help, -h${RESET}     Show help`);
    console.log(`
Insider channel: npx github:bradygaster/squad-sdk#insider
`);
    process.exit(0);
  }
  if (!cmd || cmd === "init") {
    runInit(process.cwd()).catch((err) => {
      fatal(err.message);
    });
    return;
  }
  if (cmd === "upgrade") {
    const { runUpgrade: runUpgrade2 } = await Promise.resolve().then(() => (init_upgrade(), upgrade_exports));
    const { migrateDirectory: migrateDirectory2 } = await Promise.resolve().then(() => (init_migrate_directory(), migrate_directory_exports));
    const migrateDir = args.includes("--migrate-directory");
    const selfUpgrade = args.includes("--self");
    if (migrateDir) {
      await migrateDirectory2(process.cwd());
    }
    await runUpgrade2(process.cwd(), {
      migrateDirectory: migrateDir,
      self: selfUpgrade
    });
    process.exit(0);
  }
  if (cmd === "watch") {
    const { runWatch: runWatch2 } = await Promise.resolve().then(() => (init_watch(), watch_exports));
    const intervalIdx = args.indexOf("--interval");
    const intervalMinutes = intervalIdx !== -1 && args[intervalIdx + 1] ? parseInt(args[intervalIdx + 1], 10) : 10;
    await runWatch2(process.cwd(), intervalMinutes);
    return;
  }
  if (cmd === "export") {
    const { runExport: runExport2 } = await Promise.resolve().then(() => (init_export(), export_exports));
    const outIdx = args.indexOf("--out");
    const outPath = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : void 0;
    await runExport2(process.cwd(), outPath);
    process.exit(0);
  }
  if (cmd === "import") {
    const { runImport: runImport2 } = await Promise.resolve().then(() => (init_import(), import_exports));
    const importFile = args[1];
    if (!importFile) {
      fatal("Usage: squad import <file> [--force]");
    }
    const hasForce = args.includes("--force");
    await runImport2(process.cwd(), importFile, hasForce);
    process.exit(0);
  }
  if (cmd === "plugin") {
    const { runPlugin: runPlugin2 } = await Promise.resolve().then(() => (init_plugin(), plugin_exports));
    await runPlugin2(process.cwd(), args.slice(1));
    process.exit(0);
  }
  if (cmd === "copilot") {
    const { runCopilot: runCopilot2 } = await Promise.resolve().then(() => (init_copilot(), copilot_exports));
    const isOff = args.includes("--off");
    const autoAssign = args.includes("--auto-assign");
    await runCopilot2(process.cwd(), { off: isOff, autoAssign });
    process.exit(0);
  }
  if (cmd === "scrub-emails") {
    const { scrubEmails: scrubEmails2 } = await Promise.resolve().then(() => (init_email_scrub(), email_scrub_exports));
    const targetDir = args[1] || ".ai-team";
    const count = await scrubEmails2(targetDir);
    if (count > 0) {
      console.log(`Scrubbed ${count} email address(es).`);
    } else {
      console.log("No email addresses found.");
    }
    process.exit(0);
  }
  fatal(`Unknown command: ${cmd}
       Run 'squad help' for usage information.`);
}
main();
