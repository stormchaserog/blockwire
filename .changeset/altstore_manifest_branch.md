---
default: patch
---

The nightly AltStore manifest now records its version history on a dedicated
branch instead of dev, so required status checks on dev cannot block the iOS
build. Distribution is unchanged: AltStore reads the manifest from the release
asset, which is still uploaded exactly as before
