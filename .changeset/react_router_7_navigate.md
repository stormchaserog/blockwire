---
default: patch
---

Adapted to react-router-dom 7's NavigateFunction, which can now return
Promise<void> in addition to void. Sites that pass navigate() directly as a
startTransition callback wrap it in a block body so the callback stays
strictly synchronous, matching what startTransition requires
