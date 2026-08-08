# BlockWire — Roadmap & Status

This is the working plan for BlockWire. It lives in the repo so every machine
— the MacBook, the Mac mini, and any cloud session — reads the same copy.
Update it here; pull it everywhere (`git fetch origin dev && git pull`).

_Last updated: 2026-08-06._

## What BlockWire is

A self-owned messaging platform for crypto communities: Telegram-shaped UX,
Matrix underneath (deliberately invisible), one locked homeserver
(blockwire.chat, federation off), E2EE DMs, no phone numbers, and a
first-class bot platform as the differentiator. There is no on-chain
functionality and none is implied — "crypto" is the audience; the bot
platform plus self-owned infra is the product.

Four repos: `blockwire` (this one, public, AGPL — the client, forked from
Sable/Cinny), plus private `blockwire-botgw` (Bot API + BotMama),
`blockwire-push`, and `blockwire-infra`.

North star: listed on the Apple App Store and Google Play, with optional
paid membership tiers (KYC-backed Blue badge, premium Gold badge), built to
make crypto traders want the platform while fighting spam and scammers.
Every feature ships store-compliant by default.

## Goals

- **G1 — Proven, in hand:** push notifications fire on a real phone; an
  inline-keyboard tap works in the shipped UI; a native iOS build runs a
  call that survives backgrounding.
- **G2 — Fully ours:** no machinery points at upstream; a release cut
  tomorrow lands in this repo, signed with our keys, updating from our
  endpoint.
- **G3 — First stable release:** `v1.21.0` tagged with artifacts for
  web/desktop/Android/iOS, AltStore stable channel populated, desktop
  auto-update verified against our endpoint. Gated on G1's push and
  keyboard proofs.
- **G4 — Deliberate upstream policy:** written tracking policy
  (`docs/UPSTREAM.md`) and the inherited changeset queue resolved into the
  first release.
- **G5 — First-user surface:** bot platform usable end-to-end from the
  client, featured communities non-empty, onboarding that reads as
  BlockWire.

## Where things stand

**Done and merged:**

- PR #5 — native builds repaired (Android package rename, Linux CEF
  packaging, iOS token fallbacks) and pre-existing CI failures fixed.
- PR #6 — release machinery is ours: knope targets this repo, the desktop
  updater endpoint points at our releases, Android/updater build without
  fork secrets, `docs/UPSTREAM.md` written (G2 ~done, G4 done).
- **PR #8 — quality sprint** (merged 2026-08-06). Fourteen fixes: faster GIF
  sending, redacted-tombstone banner, timeline scroll-jump and failed-send
  visibility, backdrop-dismissible mobile dialogs, picker toggles, mic
  double-fire, live home-list re-sorting, member-churn debounce, lighter
  composer keystrokes, theme tokens.
- **PR #7 — store compliance** (merged 2026-08-06). In-app account deletion
  (UIA-gated, requires typing your own user id, `erase` opt-in), public
  `/privacy` and `/terms`, product-only welcome, and `vercel-deploy.yml`.
  The workflow is **dormant** until the `VERCEL_TOKEN` secret exists — its
  preflight job checks for it and the deploy job is gated on that.

**Also landed the same day, outside the PRs:**

- **The test suite was environmentally broken and is now green.** 82 of 228
  test files failed to load with `Cannot find module '@testing-library/dom'`.
  `@testing-library/react` v16 made that an explicit peer dependency, and this
  project must install with `--legacy-peer-deps` (folds@2.7.1 pins an older
  `@vanilla-extract/css`), under which npm does not install peers. Declaring it
  took the suite from 146/228 to **228/228**. This is why CI looked
  untrustworthy: with a third of the suite failing for environmental reasons,
  a real regression had nowhere to stand out.
- **🔴 `/source`, `/privacy` and `/terms` were unreachable without an account.**
  All three redirected a logged-out visitor to `/login/<server>` — exactly the
  visitor they exist for. They were children of the auth route group, and
  `AuthLayout` assumes everything beneath it is a sign-in screen: it rewrites
  the URL to `<currentAuthPath>/:server` when the path has no `:server` param,
  and `currentAuthPath` falls back to `LOGIN_PATH` for anything unrecognised.
  **The AGPL §13 source offer had never worked**, and the store-required
  privacy URL would have failed review, since Apple and Google fetch it logged
  out. Now standalone public routes; verified in a browser.
- Earlier the same day: bot persistence (Postgres, survives restarts), inline
  keyboards rendering + callback round-trip, bot directory in room settings,
  crypto GIF defaults, call wake-lock and media session, the Klipy key moved
  server-side and rotated, CORS added to `/_blockwire/*` on both the gateway
  and the push service (push could never have been enabled before that), and
  the upstream branding sweep.

**⚠️ A verification lesson worth keeping:** `vercel.json` rewrites every path
to `index.html`, so **every** URL on blockwire.chat returns 200 — including
routes that redirect away or do not exist. A 200 from `curl` proves the rewrite
and nothing else. The broken legal pages passed a curl check and were caught
only by loading them in a browser. The same shape hid two CORS bugs that day.
Verify user-facing behaviour in a browser.

**Dependency updates — the config was the bug (2026-08-06):**

All four open Dependabot PRs showed every check red, which read as four broken
updates. It was one cause, and it was ours: the `@testing-library/dom` peer-dep
fix updated `package.json` and `package-lock.json` but not `pnpm-lock.yaml`, and
CI installs with `pnpm --frozen-lockfile`. Every branch cut from `dev` died at
the install step — `ERR_PNPM_OUTDATED_LOCKFILE ... 1 dependencies were added`
— so a Docker base-image bump that touches no JavaScript reported Lint,
Typecheck, Build, Knip and Tests all failing. Fixed in PR #11.

With that noise gone, the real picture:

- **#10** (github-actions) — 4 pinned-SHA patch bumps. Recreated on the fixed
  `dev`, green, merged.
- **#12** (tauri-plugin-devtools 2.0.0 → 2.1.0) — opened _after_ the config
  fix below and was green on arrival, including Rust check and Clippy. Merged.
- **#4** (npm) — closed. Labelled "bump the npm group with 54 updates";
  actually React 18→19, react-router-dom 6→7, i18next 25→26,
  react-i18next 16→17, react-leaflet 4→5 and jest-dom 6→7. Around
  thirty typecheck errors of the classic React 19 shape (`Cannot find namespace
'JSX'`, `RefObject<T | null>`, `useRef` wanting an initial value) plus 2
  failing test files.
- **#3** (cargo) — closed. Three genuine compile errors from three unrelated
  crate majors: `Body::wrap_stream` removed, an `AsFilename` trait bound, and a
  struct turned non-exhaustive.
- **#1** (node 24→26 in Docker) — Dependabot closed it itself once the
  config changed: _"Looks like node is no longer updatable."_ A major Node jump
  is a real decision and will return as its own reviewable PR.

**The fix is in `.github/dependabot.yml`.** Every group was a catch-all with no
`update-types` filter, so majors rode in beside patches under a `chore:` prefix
— which is how a React 19 migration arrived looking like housekeeping. Groups
are now minor/patch only, leaving majors to open individually. #12 appearing
green within minutes of the change is that working as intended.

`flake-lock-fix.yml` is now gated on `secrets.APP_ID`. It needs a GitHub App
inherited from upstream that this repo does not have, so it failed at its first
step and left a red run on `dev` after every lockfile change. It skips cleanly
now, via the same preflight pattern `vercel-deploy.yml` uses; adding the secrets
switches it back on with no further edits.

**The nightly iOS build had to move first.** Turning the checks on immediately
broke it: the job commits `altstore-source-nightly.json` to `dev` with
`[skip ci]`, so that commit can never satisfy a required check, and the push
came back `GH006: Protected branch update failed` — which fails the whole iOS
job. Exempting the bot is not possible here; GitHub only allows ruleset bypass
actors on organization-owned repositories, and this is a user repo. The
manifest now accumulates on an `altstore-manifests` branch instead. Nothing
about sideloading changes — AltStore reads the manifest from the release asset,
which is uploaded exactly as before; the branch only preserves version history.

**`dev` now requires status checks** — Lint, Typecheck, Tests, Build, Knip and
Format check must pass before a merge. Deliberately _not_ `require-changeset`:
it fails on every Dependabot PR by design and would block all of them.

**The reissued npm group landed (#14, 2026-08-07).** Dependabot reopened the
npm group under the new minor/patch rule as #13 — 35 updates instead of 54, no
React 19. Four checks still failed, and two were real breaking changes wearing
minor version numbers:

- **`matrix-widget-api` 1.17 → 1.18 removed a parameter.**
  `WidgetDriver.sendDelayedEvent` went from
  `(delay, parentDelayId, eventType, content, stateKey, roomId)` to
  `(delay, eventType, content, stateKey?, roomId?)`, and `ClientWidgetApi` now
  logs _"Data includes parent_delay_id, but the widgetDriver ignores it"_. Both
  our drivers still declared six parameters. **The tempting fix — a cast — would
  have compiled cleanly and shifted every argument by one**, putting `eventType`
  where `parentDelayId` used to be and silently malforming every delayed event.
  For calls, delayed events are the membership heartbeat.
- **`dotlottie-react` 0.12 → 0.19** pulls `dotlottie-web` 0.78, which constructs
  an `IntersectionObserver` at mount. jsdom has none, so it threw inside the
  mount effect and took the render with it — seven lottie tests failed with an
  _empty document body_, which reads like the component vanished rather than an
  assertion failing. Polyfilled in `src/test/setup.ts` next to `ResizeObserver`.

Also fixed a genuine latent bug the newer oxlint caught: `scaleSystemEmoji` built
its URL regex with `new RegExp(URL_REG)` and passed it to `matchAll`, which
throws a `TypeError` without `/g`. The flag does survive that copy today, so
nothing was broken — but nothing would have caught it if `URL_REG` ever changed.

**Both lockfiles are now updated together.** Dependabot only maintains
`pnpm-lock.yaml`; CI installs with `pnpm --frozen-lockfile` while `DEPLOY.md`
uses `npm install --legacy-peer-deps`. Letting them drift is exactly what broke
every branch on `dev` the day before.

⚠️ 1.18 also adds `sendStickyEvent` and `sendDelayedStickyEvent` to
`WidgetDriver`. The base implementations reject, so this builds and runs — but
if Element Call starts using sticky events they will fail until implemented.

**🔴 Connecting Vercel's Git integration nearly took the site down (#15,
2026-08-07).** `vercel.json` pinned `"outputDirectory": "."`, correct only for
the old ritual of deploying from _inside_ `dist/`. A Git build runs from the
**repo root**, where `.` is the source tree. Reproduced with `vercel build`
before touching anything: the static output was `CHANGELOG.md`, `Dockerfile`,
`docs/`, `infra/`, `src/`, and an unbuilt `index.html` referencing
`/src/app/…tsx` — no `assets/`, no `.well-known/`. A real client hitting that
would show a white screen, lose homeserver discovery, and lose `rtc_foci` with
it, so calls die too. `blockwire.chat` was safe purely by accident: its alias
was set by hand long ago and no longer auto-assigns to new production
deployments — one "Promote to Production" click would have shipped it.

Fixed: `outputDirectory` is now `dist`, and `vite.config.ts` copies
`public/.well-known` into the build (`publicDir` is `false`, so nothing under
`public/` ships unless listed in `copyFiles` — these files were previously
carried across by a manual `cp` in `DEPLOY.md`, which is exactly the kind of
step a Git-triggered build skips). `vercel-deploy.yml` is removed; it existed
to automate what the Git integration now does, and keeping both would race for
the same domain. Verified the built output directly (`assets/`,
`.well-known/matrix/*.json`, `index.html` referencing a real hashed bundle),
then verified the Vercel preview for the fix PR the same way using a
`_vercel_share` bypass link, _then_ verified the resulting production
deployment's metadata matched the exact merge commit before aliasing
`blockwire.chat` to it, then verified the live domain in an actual browser with
the service worker cleared. `blockwire.chat` still does not auto-move to new
deployments — every release still ends with an explicit `vercel alias set`.

**All 16 open dependabot PRs landed (#17-#32), 2026-08-07/08.** The
dependabot.yml fix from earlier proved itself immediately: 13 were pure
minor/patch bumps and merged straight through. Three had real breaking
changes despite being "minor" version bumps under semver's own rules, and each
got a real fix rather than a cast or a skip:

- **#29** `tauri-plugin-android-fs-api` 28→29 flattened the `AndroidFs`
  namespace into top-level exports and dropped the redundant `Android` prefix
  from the dir constants. `download.ts` and its test mock updated to match.
- **#28** TypeScript 6.0 added `scrollMargin` to the `IntersectionObserver`
  interface; the jsdom polyfill in `src/test/setup.ts` (added earlier that
  same day) needed the property to keep satisfying the interface.
- **#24** react-router-dom 7 changed `NavigateFunction` from returning `void`
  to `void | Promise<void>`. Five call sites passed `navigate` directly as a
  `startTransition` callback, which React requires to be strictly
  synchronous — wrapped each in a block body to discard the return value,
  with no change in runtime behavior.

**🔴 #26 (vite 8.2.0) broke production for several minutes and was rolled
back — PR #33.** This is the one worth remembering. Typecheck, lint, 2001
tests and the build itself all passed cleanly, because none of those steps
execute the produced bundle. Deployed live, the app was a blank white screen:
`Uncaught TypeError: i is not a function` in the lazily-loaded
`oidcLoginUtil` chunk, before anything rendered. Vite 8 defaults to
**Rolldown**, its new Rust-based bundler replacing Rollup, and it split the
CJS-only `await-to-js` dependency into two separate chunk instances
(`dist-js-DP1z3Av4.js` and `dist-js-BwrDL6xD.js`) — a bundler bug, not
anything in this codebase. Caught within minutes via a manual browser check
(not curl, not CI), rolled back to the prior deployment immediately, diagnosed
from there, and reverted only the vite bump — the other 15 updates stayed.
**A green CI run and a successful `vite build` exit code do not prove the
bundle works.** Re-attempting the vite 8 bump needs a real browser render
before merging, every time — not just once more for luck.

**🔴 The White Claw space tombstone is still broken — needs a human to run
one script.** Root cause found: an earlier session tombstoned the live space
(5 real members) pointing at a replacement room that was never actually
created. Two automated repair attempts hit real snags (the first corrupted
the replacement room's state by leaving it memberless after cleanup; the
retry script was pasted into the wrong shell). The exact fix is written,
tested logic, and ready — it needs to be pasted directly into a `root@` shell
on the droplet (not into a `python3` prompt) because repeated attempts to run
it directly hit the auto-mode safety classifier, which correctly declines to
self-authorize infra account creation even with prior user approval in the
same session. **A temporary admin account (`@claude_tombstone_fix2`) is
currently live on the homeserver with an active session token** — harmless
unless someone else has the token, and the fix script's final step demotes
and cleans it up. Until that script runs, it should be treated as a small
standing exposure, not ignored.

**Blocked on a human with devices (Phase 2 — the current gate):**

- [ ] Add the `VERCEL_TOKEN` secret: GitHub repo → Settings → Secrets and
      variables → Actions → New repository secret. Token minted at
      vercel.com → Account Settings → Tokens.
- [ ] Push notification proof on a real phone (Android Chrome first, then
      iOS PWA) from blockwire.chat.
- [ ] Inline-keyboard tap in the shipped UI with a test bot.
- [ ] Sideload the nightly IPA via AltStore; verify a call survives
      backgrounding on iOS.
- [ ] Generate our minisign updater keypair (runbook: `docs/signing.md`)
      and set the signing secrets — the shipped pubkey is still upstream's
      until this happens.
- [ ] Create the `abuse@blockwire.chat` mailbox (`privacy@` is referenced
      too) — the Terms and Privacy pages point at them.
- [ ] Rotate appservice tokens (in `blockwire-infra`).
- [ ] Allow Actions to create pull requests: Settings -> Actions -> General ->
      Workflow permissions. One checkbox. It is the entire reason the
      "Create Release PR" job is red - knope gets back
      `403 GitHub Actions is not permitted to create or approve pull requests`.

## Phases

- **Phase 0 — Land what's in flight:** merge PR #7 and PR #8; confirm a
  fully green desktop-build run on dev (Android + iOS + Linux CEF).
- **Phase 1 — Fork identity:** done except the minisign keypair swap and
  the documented deliberate deferrals (deep-link schemes, internal
  constant names — see `docs/UPSTREAM.md`).
- **Phase 2 — Prove it works (G1):** the device checklist above.
- **Phase 3 — Upstream policy (G4):** done — `docs/UPSTREAM.md`.
- **Phase 4 — First stable release v1.21.0 (G3):** knope prepare-release →
  merge → tag + artifacts; verify desktop auto-update from our endpoint
  and the AltStore stable channel. Gated on Phase 2's push + keyboard
  proofs.
- **Phase 5 — Product & growth (G5):** featured communities populated, bot
  directory pagination, scripted onboarding walkthrough
  (register → featured space → DM → add a bot), GIF picker infinite
  scroll, membership tiers / Blue & Gold badge design (store-compliant:
  IAP for subscriptions, no crypto payments in-app), anti-spam and
  anti-scam posture.

## Working agreements

- Store compliance is a default, not a phase: account deletion in-app,
  public privacy policy, UIA flows for destructive actions, no crypto
  payments through the apps.
- The AGPL §13 source offer (`/source` page and the public client repo)
  stays intact while we distribute builds — it is a legal requirement of
  the fork, independent of how private the product presents itself.
- Upstream (`SableClient/Sable`) is tracked deliberately per
  `docs/UPSTREAM.md`; `@sableclient/*` dependencies stay pinned and
  reviewed.
