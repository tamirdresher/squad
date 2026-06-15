# syntax=docker/dockerfile:1.7
#
# Squad CLI — container image (Phase 1)
#
# Goal of this phase: prove the CLI runs cleanly in a container so subsequent
# phases (squad serve, ACA Sandbox deployment) have a working foundation.
#
# Out of scope for Phase 1 (see docs/_internal/proposals/squad-headless-runner-aca.md):
#   - `squad serve` smart backend
#   - Bundled Copilot CLI / agent execution
#   - ACA deployment manifest
#   - Multi-tenant session handling
#
# Build:  docker build -t squad:phase1 .
# Verify: docker run --rm squad:phase1 --version
#         docker run --rm squad:phase1 --help

# ─── Builder stage ────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Workspace manifests first → maximises layer cache when source changes
# without dependency churn.
COPY package.json package-lock.json ./
COPY packages/squad-sdk/package.json packages/squad-sdk/
COPY packages/squad-cli/package.json packages/squad-cli/

# Install all workspace deps. --ignore-scripts so the squad-cli postinstall
# (vscode-jsonrpc ESM patch + ink rendering patch) does not run on a tree
# that has no dist/ yet; we run the ESM patch explicitly below.
RUN npm ci --ignore-scripts

# Run the Node 22+ ESM compatibility patch deterministically.
COPY packages/squad-cli/scripts packages/squad-cli/scripts/
RUN node packages/squad-cli/scripts/patch-esm-imports.mjs

# Copy the rest of the source tree. CI=1 suppresses the build-bump script
# (scripts/bump-build.mjs respects CI=true / SKIP_BUILD_BUMP=1) so the
# image version matches the committed package.json — no .dirty bumps.
#
# We invoke the workspace package builds DIRECTLY rather than `npm run build`
# at the root. The root build runs a `prebuild` that calls
# scripts/sync-skill-templates.mjs, which hard-fails when `.squad/skills/`
# is absent — it always is in a clean image (we .dockerignore .squad/ to
# avoid baking project-specific state into the image). The package
# template dirs (packages/*/templates/skills/) are already committed in
# the repo, so the sync is redundant here.
COPY . .
ENV CI=true
RUN npm run build -w packages/squad-sdk && npm run build -w packages/squad-cli

# ─── Runtime stage ────────────────────────────────────────────
FROM node:22-alpine

# Non-root user for least-privilege execution. ACA Sandbox runs containers
# unprivileged anyway, but this is hygiene for any other runtime too.
RUN addgroup -S squad && adduser -S squad -G squad

WORKDIR /app

# Built artifacts + templates + production node_modules from the builder.
COPY --from=builder --chown=squad:squad /build/package.json ./
COPY --from=builder --chown=squad:squad /build/node_modules ./node_modules
COPY --from=builder --chown=squad:squad /build/packages/squad-sdk/package.json packages/squad-sdk/
COPY --from=builder --chown=squad:squad /build/packages/squad-sdk/dist packages/squad-sdk/dist
COPY --from=builder --chown=squad:squad /build/packages/squad-sdk/templates packages/squad-sdk/templates
COPY --from=builder --chown=squad:squad /build/packages/squad-cli/package.json packages/squad-cli/
COPY --from=builder --chown=squad:squad /build/packages/squad-cli/dist packages/squad-cli/dist
COPY --from=builder --chown=squad:squad /build/packages/squad-cli/templates packages/squad-cli/templates
COPY --from=builder --chown=squad:squad /build/packages/squad-cli/scripts packages/squad-cli/scripts

# /workspace is where the user mounts their .squad/ directory (or a tmpfs for
# stateless runs). The CLI resolves .squad/ from cwd.
RUN mkdir -p /workspace && chown squad:squad /workspace
VOLUME /workspace
WORKDIR /workspace

USER squad

# Storage provider selector — declared now so the env var name is locked in
# for Phase 2 where the bridge actually consumes it. Phase 1 commands ignore.
ENV SQUAD_STORAGE=fs

ENTRYPOINT ["node", "/app/packages/squad-cli/dist/cli-entry.js"]
CMD ["--help"]
