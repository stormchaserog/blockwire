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

**Open pull requests:**

- Dependabot #1–#4. #1 (node 24→26 in Docker) and #2 fail every check; #3 and
  #4 are clean. Worth rebasing onto the fixed `dev` now that the peer-dep issue
  is resolved — some of those failures may have been the same environmental
  cause.

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
