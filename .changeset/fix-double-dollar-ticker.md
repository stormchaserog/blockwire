---
default: patch
---

Fixed a "$$WCLAW" double-dollar-sign display bug on project tickers, and corrected the underlying corrupted data. Ticker input now strips a leading "$" so this can't recur.
