---
default: minor
---

Added a permission-editing checkbox UI for roles: check/uncheck the specific permissions a role grants (project.edit, social.manage, moderation.act, and 16 others). Fixed a real bug found while testing where a failed save could silently close the editor without showing the error.
