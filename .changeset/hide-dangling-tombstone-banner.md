---
default: patch
---

The space/room upgrade banner no longer appears when its replacement no longer
exists. A tombstone pointing at a room or space that has since been removed used
to leave a permanent dead-end "Join New Space" button that only ever errored;
the banner now renders only when the replacement is actionable (known to the
client or already joined).
