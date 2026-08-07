---
default: patch
---

Dependency updates now arrive one major at a time. Every Dependabot group was a
catch-all, so majors were bundled with patches and shipped under a `chore:`
prefix; one such PR carried React 18 to 19, react-router-dom 6 to 7, i18next 25
to 26 and react-leaflet 4 to 5 at once. Groups are now restricted to minor and
patch updates, and the nix hash workflow skips cleanly instead of failing when
its GitHub App credentials are absent
