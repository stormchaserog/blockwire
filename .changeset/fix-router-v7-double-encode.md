---
default: patch
---

Fixed room and space links being unusable after the react-router v7 upgrade.
generatePath now percent-encodes params itself, so the manual encodeURIComponent
in pathUtils double-encoded room ids and every room open showed a Join screen
that failed with a 400. Ids are now encoded once and open correctly.
