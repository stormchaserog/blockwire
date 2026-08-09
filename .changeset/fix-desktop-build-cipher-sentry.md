---
default: patch
---

Fixed the desktop app build (src-tauri), which failed to compile with seven
errors. Realigned the AES-CTR crypto crates after aes was accidentally bumped to
0.9 (cipher 0.5) while ctr stayed on 0.9 (cipher 0.4), and rebuilt the Sentry
ClientOptions via field assignment now that sentry 0.49 marks it non_exhaustive.
