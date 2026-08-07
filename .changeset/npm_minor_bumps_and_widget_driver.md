---
default: patch
---

Updated 35 dependencies and adapted to two breaking changes that arrived inside
them: matrix-widget-api dropped the `parentDelayId` argument from
`sendDelayedEvent`, and dotlottie now needs an IntersectionObserver at mount.
Also made the global flag explicit on the URL regex used with `matchAll`, which
throws a TypeError without it
