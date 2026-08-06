---
default: patch
---

Every merge to dev now deploys blockwire.chat automatically through CI, including the domain alias step the manual ritual kept forgetting. Requires the VERCEL_TOKEN repository secret; skips cleanly until it is set
