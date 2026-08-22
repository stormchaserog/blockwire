---
default: patch
---

Fixed the new Bubble message layout default not actually applying for existing sessions -- a stale value in localStorage was overriding it. New sessions AND existing ones now get real bubbles unless they've explicitly chosen a different layout.
