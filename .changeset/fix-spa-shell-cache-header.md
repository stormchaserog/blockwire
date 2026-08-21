---
default: patch
---

Fixed a real cause of the app getting stuck on an old version: the page you actually load was missing the strict no-cache header that only the literal /index.html path had. Every real page in this app should now always fetch fresh.
