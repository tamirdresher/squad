# syntax=docker/dockerfile:1.7
#
# Squad CLI — Phase 1 lean container image
#
# Optimisations vs the initial Phase 1 build (was 1.28 GB):
#   1. Base bumped node:22-alpine → node:24-alpine to match @github/copilot's
#      Node 24 requirement (drops the `--entrypoint node /app/.../app.js`
#      workaround; `copilot` runs via the standard npm-loader entrypoint).
#   2. `npm prune --omit=dev` AFTER build → drops typescript, eslint, vitest,
#      playwright, @cspell, @esbuild, @shikijs, @babel, etc. (~200 MB).
#   3. Strip non-Linux prebuilds from @github/copilot (we only run on Linux
#      containers) — saves ~60-80 MB of cross-platform native binaries.
#
# Not optimised yet (Phase 2):
#   - @opentelemetry/* are real runtime deps of squad-sdk (~256 MB) — needs
#     tree-shaking, not prunable with --omit=dev
#   - Runtime base is full node:24-alpine, not distroless
#   - No esbuild bundling
#
# Build:  docker build -t squad:lean .
# Verify: docker run --rm -e GITHUB_TOKEN=$TOKEN \
#                       -v /path/to/project:/workspace \
#                       --entrypoint copilot \
#                       squad:lean \
#                       -p "show me the team" --agent squad --allow-all-tools

# ─── Builder stage ────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /build

# Workspace manifests first → maximises layer cache when source changes
# without dependency churn.
COPY package.json package-lock.json ./
COPY packages/squad-sdk/package.json packages/squad-sdk/
COPY packages/squad-cli/package.json packages/squad-cli/

# Install all workspace deps INCLUDING devDeps — typescript/tsc is required
# to compile the SDK + CLI. We prune after build.
# --ignore-scripts so the squad-cli postinstall (vscode-jsonrpc ESM patch +
# ink rendering patch) does not run on a tree that has no dist/ yet; we run
# the ESM patch explicitly below.
RUN npm ci --ignore-scripts

# Run the Node 22+ ESM compatibility patch deterministically.
COPY packages/squad-cli/scripts packages/squad-cli/scripts/
RUN node packages/squad-cli/scripts/patch-esm-imports.mjs

# Copy the rest of the source tree. CI=true suppresses the root build-bump
# (scripts/bump-build.mjs respects CI=true) so the image version matches the
# committed package.json.
#
# We invoke the workspace package builds DIRECTLY rather than `npm run build`
# at the root. The root build runs a `prebuild` that calls
# scripts/sync-skill-templates.mjs, which hard-fails when `.squad/skills/` is
# absent — it always is in a clean image (we .dockerignore .squad/ to avoid
# baking project-specific state into the image). The package template dirs
# (packages/*/templates/skills/) are already committed in the repo, so the
# sync is redundant here.
COPY . .
ENV CI=true
RUN npm run build -w packages/squad-sdk && npm run build -w packages/squad-cli

# Prune devDeps now that build is done. typescript, eslint, vitest, etc. were
# needed for the build but are dead weight in the runtime image.
RUN npm prune --omit=dev

# Strip cross-platform prebuilds — we only run on Linux. @github/copilot
# ships prebuilds for darwin-{x64,arm64}, win32-{x64,arm64}, linux-{x64,arm64},
# linuxmusl-{x64,arm64}. Container is Linux (specifically musl/Alpine), so
# darwin + win32 variants are dead weight (~67 MB).
#
# We KEEP both linux-* (glibc) and linuxmusl-* (Alpine) variants so the image
# can be rebased on a glibc Linux without surgery. Removing only linuxmusl-*
# would save another ~22 MB but couple the image to Alpine forever.
#
# Tolerant: missing prebuilds dir doesn't fail the build.
RUN if [ -d /build/node_modules/@github/copilot/prebuilds ]; then \
      find /build/node_modules/@github/copilot/prebuilds -mindepth 1 -maxdepth 1 \
        \( -name 'darwin-*' -o -name 'win32-*' \) -exec rm -rf {} + ; \
    fi

# ─── Runtime stage ────────────────────────────────────────────
FROM node:24-alpine

# Non-root user for least-privilege execution. ACA Sandbox runs containers
# unprivileged anyway, but this is hygiene for any other runtime too.
RUN addgroup -S squad && adduser -S squad -G squad

WORKDIR /app

# Built artifacts + templates + pruned (production) node_modules from builder.
COPY --from=builder --chown=squad:squad /build/package.json ./
COPY --from=builder --chown=squad:squad /build/node_modules ./node_modules
COPY --from=builder --chown=squad:squad /build/packages/squad-sdk/package.json packages/squad-sdk/
COPY --from=builder --chown=squad:squad /build/packages/squad-sdk/dist packages/squad-sdk/dist
COPY --from=builder --chown=squad:squad /build/packages/squad-sdk/templates packages/squad-sdk/templates
COPY --from=builder --chown=squad:squad /build/packages/squad-cli/package.json packages/squad-cli/
COPY --from=builder --chown=squad:squad /build/packages/squad-cli/dist packages/squad-cli/dist
COPY --from=builder --chown=squad:squad /build/packages/squad-cli/templates packages/squad-cli/templates
COPY --from=builder --chown=squad:squad /build/packages/squad-cli/scripts packages/squad-cli/scripts

# Add bundled .bin to PATH so `copilot` and `squad` both work without
# fully-qualified paths. ENTRYPOINT can be overridden at run time.
ENV PATH="/app/node_modules/.bin:${PATH}"

# /workspace is where the user mounts their project (with .squad/, .github/agents/squad.agent.md, etc.)
RUN mkdir -p /workspace && chown squad:squad /workspace
VOLUME /workspace
WORKDIR /workspace

USER squad

# Storage provider selector — env var name locked in for Phase 2 consumption.
ENV SQUAD_STORAGE=fs

# Default entrypoint: the Squad CLI. To run a one-shot Copilot prompt with the
# squad agent, override at runtime:
#   docker run --rm -e GITHUB_TOKEN=$T -v $PWD:/workspace --entrypoint copilot \
#     squad:lean -p "..." --agent squad --allow-all-tools
ENTRYPOINT ["node", "/app/packages/squad-cli/dist/cli-entry.js"]
CMD ["--help"]
