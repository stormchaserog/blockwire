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

**Open pull requests:**

- **PR #7** — in-app account deletion (Apple 5.1.1(v) / Play requirement),
  public `/privacy` and `/terms` pages, product-only welcome screen, and CI
  auto-deploy of blockwire.chat on every dev merge. Waiting on CI;
  merging it turns on the auto-deploy (needs the `VERCEL_TOKEN` secret).
- **PR #8** — the quality sprint: fourteen verified fixes from an
  adversarially-checked bug hunt. Faster GIF sending (smaller webp
  encoding, no redundant third transfer, instant feedback), the
  "space upgraded" dead-banner fix, timeline scroll-jump and
  failed-send-visibility fixes, mobile dialogs dismissible by backdrop
  tap, picker buttons that actually toggle closed, mic-button double-fire
  fix, home list re-sorting live, member-churn debounce, lighter composer
  keystrokes, and theme-token cleanups.

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
