# BlockWire — where we left off

Last updated: 2026-08-06

> Operational details (addresses, how to reach each box, deploy commands) are in
> the **private** `blockwire-infra` repo at `OPS.md` — this repo is public, so
> they don't belong here.

---

## Shipped and verified live

All of this is on blockwire.chat right now and was checked against the running
system, not just assumed.

**Bots survive restarts.** The gateway ran on in-memory storage, so every deploy
silently wiped every registered bot. It's on Postgres now. Verified by restarting
three times and confirming the same record with an unchanged creation timestamp.

**Inline keyboards work end to end.** The gateway had always attached buttons to
messages; nothing in the client rendered them, so every bot that answers with
buttons looked broken. The client renders them now and sends the tap back. Proven
with a real bot: created it, posted a message with buttons, tapped one, watched
the bot receive it.

**GIF picker opens with crypto GIFs.** It used to open empty — the load path bailed
out unless you'd arrived via the `/gif` command, which is never how anyone opens it.

**Calls hold a screen wake lock** and declare a media session, so the screen no
longer sleeps mid-call. Helps on Android; iOS still suspends a backgrounded PWA.

**GIF API key is off the client.** It used to ship in `config.json` to every
visitor. It's now server-side behind our own endpoint, and the old key is revoked.

**Space upgrade banner fixed.** It said "Join the new space" forever even after
you'd joined, because it read the room once at render and never updated.

**Update notifications** now offer Update now / Later / Always update
automatically, with a matching toggle in Settings.

**Two CORS bugs found and fixed.** Nothing under `/_blockwire/*` had ever sent
CORS headers, so browsers silently discarded those responses. This had been
quietly breaking invite links and the bot directory. Worse, it meant push
notifications could _never_ be enabled — the very first call in that flow was
being dropped. That's a strong candidate for why push never worked.

---

## Bot platform — tested end to end

Ran the whole flow as a real user and cleaned up after: created a bot through
BotMama, set a description, published it, approved it as an admin, added it to a
room, sent buttons, tapped one.

Governance held under pressure: publishing does not self-approve, non-admins get
403, approved listings expose no tokens or owner data, re-approving returns 409,
rate limiting fires at the threshold with a proper `retry_after`, and deleting a
bot soft-deletes so the audit trail survives.

---

## Repos

| Repo              | Visibility | What                                             |
| ----------------- | ---------- | ------------------------------------------------ |
| `blockwire`       | public     | The client. Public because AGPL-3.0 requires it. |
| `blockwire-botgw` | private    | Bot API gateway.                                 |
| `blockwire-push`  | private    | Web push gateway.                                |
| `blockwire-infra` | private    | Deploy config. See `OPS.md` there.               |

---

## Next up

1. **Prove push on a real device.** Newly unblocked — worth testing before
   assuming iOS is the blocker, since the CORS bug may have been the real cause
   all along.
2. **Tap a button in the actual app.** The data contract is proven on both sides;
   the pixels aren't.
3. **Native iOS build** (`src-tauri` already in the client repo). The only real
   fix for calls surviving app backgrounding on iPhone.
4. **Rotate the appservice tokens** if you ever want belt-and-braces — they were
   never exposed, but they're long-lived.

## Known caveats

- Rate limits now persist across restarts (they live in Postgres). You can't
  reset your quota by bouncing the service — intended, but new.
- The client's `gifs.proxyUrl` setting must stay unset. It's a _media_ proxy that
  needs federation, and federation is off — setting it breaks sending GIFs.
- Version string in the client footer is baked at build time. Build after
  committing or it reports the previous commit.
