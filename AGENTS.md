# BlockWire agent instructions

## Read first

Read [README.md](README.md), [ARCHITECTURE.md](ARCHITECTURE.md), [PROJECT_STATUS.md](PROJECT_STATUS.md), and [DEPLOY.md](DEPLOY.md). Treat [STATUS.md](STATUS.md) as dated historical evidence, not automatic proof of the current runtime.

## Product and visibility boundaries

This public repository owns the BlockWire client: web/PWA and the Tauri client source. The canonical remote is `stormchaserog/blockwire`. Block Social, Jungle Ops, and the WCLAW website are separate products and must not be copied here.

The bot gateway, push gateway, and deployment infrastructure have separate private repositories. Do not copy their operational files, host addresses, access details, credentials, or private implementation into this public repo. Document only the public interfaces already intended for client use. Preserve the source attribution and license files for the Sable-derived client.

## Source and release identity

The current default and Vercel production branch is `dev`; the production project is `blockwire` and the public domain is `blockwire.chat`. Use task branches and PRs against `dev`. Do not rename the production branch or retarget deployments as incidental cleanup.

Check current commits and open PRs before editing. Do not bulk-delete stale-looking branches or overwrite another contributor's work. Release and dependency PRs must be reconciled separately from a product-boundary change.

## Verification

Use the toolchain constraints in `package.json` and the setup in `mise.toml`. CI installs with `pnpm install --frozen-lockfile`; see `.github/actions/setup/action.yml`. The existing npm alternative and lockfile constraints are described in `DEPLOY.md`.

For application changes, run the relevant CI checks: formatting, lint, typecheck, tests, and build. Use the specific scripts in `package.json`. Do not rewrite unrelated code to make a documentation check pass. For documentation-only changes, validate changed-file formatting, relative links, source facts, and `git diff --check`; describe the limits of that verification.

Do not fabricate a changeset for a user-facing release when the change is internal documentation. Follow the repository's existing changeset workflow and its documented internal-change handling.

## Deployment invariants

- Build and deploy from the repository root with `dist` as the output directory. Never create a Vercel project by deploying from inside generated `dist/`.
- Preserve Matrix delegation files and SPA routing. Do not add an `/index.html` redirect that breaks service-worker precaching.
- Production-target deployment and custom-domain assignment are separate checks. Follow `DEPLOY.md` and verify the actual domain before declaring a release live.
- Preserve the previous serving deployment as a rollback reference; web rollback does not restore homeserver, bot, push, or native-client state.
- Test service-worker-sensitive changes in a fresh profile or with deliberate cache handling; do not mistake cached assets for release verification.

## Documentation maintenance

Update `PROJECT_STATUS.md` with a dated, evidenced release baseline when a release changes it. Update `ARCHITECTURE.md` when service boundaries change. Keep private operational detail in the private infrastructure runbook. Distinguish a built feature, a historically tested feature, and a freshly verified production behavior.
