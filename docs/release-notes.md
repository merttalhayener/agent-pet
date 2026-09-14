# Agent Pet v0.11.2 — Keep Show/Hide labels in sync

After **Show pet**, reopening the paw menu now displays **Hide pet** immediately. Pet and panel visibility remain independent. The menu refreshes before each opening and retains its items while a selection is in progress.

Apple Silicon · macOS 26+ · English / Türkçe · Prerelease.

This VSIX can be installed locally for testing. Marketplace publication of 0.11.2 is pending publisher upload.

Validation: 52 Node tests and the native dashboard suite passed. The menu regression test reuses the status menu through repeated show/hide actions in both languages, covers action delivery before/after menu close, and verifies immediate refresh without a polling delay.
