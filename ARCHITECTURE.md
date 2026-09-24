# BlockWire architecture

BlockWire is a Matrix-based messaging client. This public repository contains the React/TypeScript/Vite web application and Tauri client source. Its independently operated services remain in separate private repositories.

## Components and ownership

| Component                     | Source / configuration                                        | Boundary                                                                 |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Web client                    | `src/`, `package.json`, `vite.config.ts`                      | This repository; static output served by Vercel                          |
| Product configuration         | `config.json`                                                 | Public branding, homeserver discovery, and client endpoint configuration |
| Native client                 | `src-tauri/`                                                  | This repository; separate native build/release lifecycle                 |
| Matrix discovery              | `public/.well-known/matrix/`, build copy rules, `vercel.json` | Public delegation consumed by clients                                    |
| Homeserver and infrastructure | Private `blockwire-infra` repository                          | Deployment and data operations; private runbook owns operational details |
| Bot platform                  | Private `blockwire-botgw` repository                          | Bot API and registration/directory/interaction backend                   |
| Push delivery                 | Private `blockwire-push` repository                           | Web-push delivery service                                                |

The public client declares Matrix SDK dependencies and uses the configured homeserver. It does not own the backend database lifecycle. Backend topology, access details, and recovery procedures belong in the private infrastructure runbook.

## Request and release flow

1. Vercel serves the client at `blockwire.chat` from a build of this repository.
2. Public Matrix delegation and product configuration identify the homeserver/services.
3. The client authenticates and communicates using the configured Matrix interfaces; bot/push/call services have their own runtime owners.
4. The service worker caches client assets. A deployed build is not necessarily the version already cached by a user's installed app.

`vercel.json` explicitly serves delegation documents as JSON and routes application paths to `index.html`. `vite.config.ts` is responsible for copying required public resources because the app uses a customized asset pipeline. Output is `dist` from the repository root. See [DEPLOY.md](DEPLOY.md) for the known path, alias, and precache traps.

## Toolchain and verification

`package.json` declares the Node runtime constraints, pnpm version, and application scripts; `mise.toml` configures CI tool setup. `.github/workflows/quality-checks.yml` runs formatting, lint, type checking, unused-code analysis, tests, and a build. Native and end-to-end workflows are separate. A web build does not verify actual device push, background calls, or native store readiness.

## Other products

Block Social is a different application. Jungle Ops and the WCLAW website are also separate. Shared ownership or token/community references do not justify copying their code into this client or exposing private service internals here. Any necessary integration should have an explicit public API contract and independently reviewable changes in the owning repositories.

## Recovery

Keep a known serving web deployment before changing the production domain assignment. Verify Matrix delegation, login, navigation, and cache/update behavior after an authorized release. Backend or native rollback is a separate operation with separate compatibility checks; switching the web deployment does not undo server data or gateway changes.
