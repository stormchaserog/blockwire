# BlockWire

Messaging for crypto communities. Private groups, public channels, direct
messages, and a bot platform — on infrastructure the community owns.

Live at **[blockwire.chat](https://blockwire.chat)**.

## What it is

Instant messaging, large groups, broadcast channels, media sharing and an
in-house bot platform in one self-owned ecosystem. It looks and feels like the
chat apps crypto communities already live in, and fixes what they get wrong:

- DMs are end-to-end encrypted by default
- No phone number required to sign up, ever
- Self-owned — no single company or founder can take a community down
- An open Bot API, so bots are first-class rather than bolted on

Built on the Matrix protocol, with a custom client and a from-scratch bot
gateway. Users never need to know or care what Matrix is.

## Where things are

| | |
|---|---|
| Client (this repo) | The app served at blockwire.chat |
| Bot gateway | Bot API + BotMama, private repo |
| Push gateway | Web push delivery, private repo |
| Infrastructure | Homeserver and deploy config, private repo |

Current status and what's next: **[STATUS.md](./STATUS.md)**.

## Development

```bash
npm install --legacy-peer-deps
npm run build
```

Deployment steps and the traps worth knowing are in [DEPLOY.md](./DEPLOY.md).

## Licence

AGPL-3.0-only. This client is a modified version of
[Sable](https://github.com/SableClient/Sable), and our modifications inherit its
licence — see [LICENSE](./LICENSE). If you interact with a BlockWire server over
a network you are entitled to the corresponding source, which is this
repository; the app links here from Settings and from `/source`.

The bot gateway, push service and calls backend are separate original work, not
derived from Sable, and are not covered by the AGPL.
