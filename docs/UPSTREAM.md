# Upstream policy

BlockWire is a fork of [Sable](https://github.com/SableClient/Sable) (itself a
Cinny descendant). Sable is a live upstream, not history: we keep taking their
fixes, and two of our runtime dependencies are published by them. This document
is the policy for that relationship.

## What we track

- **Remote:** `https://github.com/SableClient/Sable`, branch `dev`.
- **Cadence:** review upstream monthly; merge when the queue is quiet, never in
  the same change as BlockWire feature work.
- **We take:** bug fixes, sliding-sync correctness, mobile/touch polish,
  performance work, security fixes (these we take immediately, out of cadence).
- **We do not take:** their branding, their infra/deploy config, their release
  metadata (AltStore manifests, Obtainium config, updater endpoints), or
  features that conflict with our single-homeserver, federation-off posture.

## Dependency posture

Two `@sableclient/*` packages ship in the client:

| Package                            | Role                                     | Risk posture                                                                                                                         |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `@sableclient/sable-call-embedded` | The bundled call app, loaded as a widget | **Supply-chain trust point.** Pinned exact (`1.1.8`). Review diffs before every bump; it runs with media permissions inside our app. |
| `@sableclient/twemoji-font`        | Emoji font                               | Low risk; caret-pinned.                                                                                                              |

Long-term option if upstream stalls or trust changes: fork and republish both
under our own scope.

## Deliberate residual identifiers (do not "fix" casually)

These still say `sable` on purpose. Each is either invisible to users or
breaking to change, and each has a defined migration condition:

| Identifier                                              | Where                                                           | Why it stays / when it changes                                                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deep-link schemes `sable`, `moe.sable.app`              | `src-tauri/tauri.conf.json`, Android manifest, CEF desktop file | Changing orphans every install's link handling. Migrate only alongside a native release that registers **both** old and new schemes for a deprecation window. |
| `SABLE_PRODUCT_NAME` build constant                     | `src-tauri/build.rs`, various UI strings                        | Internal name of the mechanism, not a user-visible string — it _carries_ the BlockWire name from `config.json`. Rename is churn with no user value.           |
| `sable_sentry_enabled` localStorage key                 | Sentry consent (`docs/SENTRY_PRIVACY.md`)                       | Renaming silently re-prompts (or worse, re-enables) telemetry for every existing user. Change only with a read-old-write-new migration.                       |
| `.sable.css` theme format                               | Theme loader                                                    | Renaming breaks every theme already in the wild.                                                                                                              |
| Cargo package name `sable`                              | `src-tauri/Cargo.toml`                                          | Renames the built binary; `scripts/cef/package.sh` and caches key off it. Cosmetic-only benefit.                                                              |
| CSS custom properties, Rust module names, test fixtures | Throughout                                                      | Internal identifiers nobody sees.                                                                                                                             |

Everything else that pointed at upstream (release tooling in `knope.toml`, the
Tauri updater endpoint, AltStore `developerName`, `infra/` defaults,
`package.json` identity) has been repointed at BlockWire.

**Outstanding, user-action-required:** the Tauri updater `pubkey` in
`src-tauri/tauri.conf.json` is still upstream's minisign key. It is inert until
we publish signed updater artifacts, but it MUST be replaced with our own key
(generate per `docs/signing.md`) before the first stable desktop release —
otherwise our updates would be rejected as unsigned-by-us.

## Merging upstream, mechanically

```bash
git remote add upstream https://github.com/SableClient/Sable.git  # once
git fetch upstream dev
git checkout -b merge-upstream-YYYYMM dev
git merge upstream/dev
# resolve: prefer ours for anything in the tables above and for
# config.json, README.md, STATUS.md, DEPLOY.md, docs/, altstore-*.json,
# knope.toml, .github/workflows/, infra/
```

After merging, run the branding guard (`src/app/branding.test.ts`) and
`test/boot-guard.test.mjs` — they exist to catch upstream reintroducing
their identity or breaking our link scheme.
