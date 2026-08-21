---
default: patch
---

Fixed the "Add to Home Screen" icon on iOS -- Safari's home-screen icon references were pointing at files that do not exist and were silently falling back to a broken state.
