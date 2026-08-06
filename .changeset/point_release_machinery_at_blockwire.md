---
default: patch
---

Point the release machinery at BlockWire instead of upstream: knope now cuts releases in this repo, the desktop updater checks our releases, AltStore sources carry our developer name, package.json carries our identity, and the infra defaults target blockwire.chat. Added docs/UPSTREAM.md with the tracking policy and the list of identifiers that deliberately still say sable
