# syntax=docker/dockerfile:1.7
#
# Squad CLI — Phase 1 distroless image
#
# Optimisations vs the Alpine lean build (was 973 MB):
#   1. Runtime: node:24-alpine → gcr.io/distroless/nodejs24-debian12:nonroot
#      (drops shell, busybox, apk; just node + glibc + ssl).
#   2. Builder: node:24-alpine → node:24-bookworm-slim (debian glibc) so
#      compiled native modules match the glibc runtime — REQUIRED for distroless.
#   3. Prebuild strip extended: remove linuxmusl-* too (we no longer run on
#      musl) along with darwin-* and win32-* (~89 MB total vs ~67 MB before).
#
# Trade-offs:
#   - No shell in runtime — `docker exec -it ... sh` won't work. Debug via a
#     separate sh-enabled image built from the same builder stage.
#   - Default user is `nonroot` (uid 65532); ownership baked in builder stage
#     since distroless has no chown.
#
# Not optimised yet (Phase 2 territory):
#   - @opentelemetry/* (~256 MB, real squad-sdk runtime dep — needs tree-shake)
#   - esbuild bundle (could reach ~300-400 MB total)
#
# Build:  docker build -t squad:phase1 .
# Verify: docker run --rm squad:phase1 --version
#         docker run --rm -e GITHUB_TOKEN=$T -v /proj:/workspace \
#                  --entrypoint /app/node_modules/.bin/copilot squad:phase1 \
#                  -p "show me the team" --agent squad --allow-all-tools

# ─── Builder stage (debian/glibc) ─────────────────────────────
FROM node:24-bookworm-slim AS builder

WORKDIR /build

# Workspace manifests first → maximises layer cache when source changes
# without dependency churn.
COPY package.json package-lock.json ./
COPY packages/squad-sdk/package.json packages/squad-sdk/
COPY packages/squad-cli/package.json packages/squad-cli/

# Install full workspace deps (devDeps included — typescript/tsc needed for
# the build). Pruned post-build below.
# --ignore-scripts: squad-cli postinstall (vscode-jsonrpc ESM patch + ink
# rendering patch) runs against a tree with no dist/ yet; we patch ESM
# explicitly below for determinism.
RUN npm ci --ignore-scripts

# Node 22+ ESM compatibility patch (deterministic, not in postinstall).
COPY packages/squad-cli/scripts packages/squad-cli/scripts/
RUN node packages/squad-cli/scripts/patch-esm-imports.mjs

# Copy the rest of the source. CI=true suppresses the root build-bump
# (scripts/bump-build.mjs respects CI=true) so the image version matches
# the committed package.json.
#
# We invoke the workspace package builds DIRECTLY rather than `npm run build`
# at the root. The root build runs a `prebuild` that calls
# scripts/sync-skill-templates.mjs, which hard-fails when `.squad/skills/` is
# absent (always the case in a clean image — .squad/ is .dockerignored to
# avoid baking project state). Package template dirs are already committed.
COPY . .
ENV CI=true
RUN npm run build -w packages/squad-sdk && npm run build -w packages/squad-cli

# Drop devDeps now that the build is done.
RUN npm prune --omit=dev

# Strip non-glibc-Linux prebuilds from @github/copilot. Removes darwin-*,
# win32-*, AND linuxmusl-* — the debian distroless runtime is glibc, never
# musl. Keeps only linux-{x64,arm64} (glibc). Saves ~89 MB.
RUN if [ -d /build/node_modules/@github/copilot/prebuilds ]; then \
      find /build/node_modules/@github/copilot/prebuilds -mindepth 1 -maxdepth 1 \
        ! -name 'linux-*' -exec rm -rf {} + ; \
    fi

# Pre-create /workspace owned by distroless's nonroot user (65532). Required
# because distroless has no shell to RUN chown at runtime, but we want the
# mounted volume's mount point to be writable by the default user.
RUN mkdir -p /workspace && chown 65532:65532 /workspace

# ─── Runtime stage (distroless, nonroot) ──────────────────────
FROM gcr.io/distroless/nodejs24-debian12:nonroot

WORKDIR /app

# Built artifacts + pruned node_modules + templates from builder. --chown to
# distroless's nonroot user (uid 65532, gid 65532).
COPY --from=builder --chown=65532:65532 /build/package.json ./
COPY --from=builder --chown=65532:65532 /build/node_modules ./node_modules
COPY --from=builder --chown=65532:65532 /build/packages/squad-sdk/package.json packages/squad-sdk/
COPY --from=builder --chown=65532:65532 /build/packages/squad-sdk/dist packages/squad-sdk/dist
COPY --from=builder --chown=65532:65532 /build/packages/squad-sdk/templates packages/squad-sdk/templates
COPY --from=builder --chown=65532:65532 /build/packages/squad-cli/package.json packages/squad-cli/
COPY --from=builder --chown=65532:65532 /build/packages/squad-cli/dist packages/squad-cli/dist
COPY --from=builder --chown=65532:65532 /build/packages/squad-cli/templates packages/squad-cli/templates
COPY --from=builder --chown=65532:65532 /build/packages/squad-cli/scripts packages/squad-cli/scripts
COPY --from=builder --chown=65532:65532 /workspace /workspace

# `copilot` resolvable from PATH. Distroless puts node at /nodejs/bin/node.
ENV PATH="/app/node_modules/.bin:/nodejs/bin:/usr/local/bin:/usr/bin:/bin"
ENV SQUAD_STORAGE=fs

WORKDIR /workspace
VOLUME /workspace

# Default ENTRYPOINT = squad CLI. Override at runtime for copilot:
#   docker run --entrypoint /app/node_modules/.bin/copilot squad:phase1 ...
ENTRYPOINT ["/nodejs/bin/node", "/app/packages/squad-cli/dist/cli-entry.js"]
CMD ["--help"]
