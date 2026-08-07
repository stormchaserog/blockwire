---
default: patch
---

Fixed the CI install step: the pnpm lockfile was missing the newly declared @testing-library/dom dependency, which made every check on every branch fail before running
