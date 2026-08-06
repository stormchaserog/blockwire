---
default: patch
---

Fix Android, iOS and Linux CI builds broken by the BlockWire rename: regenerate the Android project package for the new bundle id, package the Linux CEF build into /opt/blockwire with BlockWire artifact names, fall back to the workflow token when no bot app is configured, and point the Obtainium config at our repo and APK names
