---
default: patch
---

Reverted vite to 7.3.5. Vite 8 defaults to its new Rolldown bundler, which
split await-to-js into two separate chunk instances and broke the OIDC login
flow with a blank white screen and an uncaught TypeError - production was
affected for several minutes before this was caught and rolled back
