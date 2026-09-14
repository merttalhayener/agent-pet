# Agent Pet v0.10.2 — Reload after chats finish

- Reload each VS Code window automatically after an in-app update once its tracked chats finish.
- Add a 15-second countdown with Later and an autoReloadAfterUpdate preference.
- Postpone reload for new/uncertain activity, disabled tracking, unsaved changes, running VS Code tasks or debugging.
- Check activity again immediately before reload and keep windows independent.

**Upgrading from 0.10.1 or earlier:** finish active chats and run **Developer: Reload Window** once in each open window. The old running extension does not yet contain the automatic reload controller. Subsequent in-app updates reload automatically when each window is ready.

Choose **Later** during the countdown to postpone that version, or disable `codexPet.autoReloadAfterUpdate` in VS Code settings. Unknown or quiet chats do not trigger automatic reload.

Apple Silicon · macOS 26+ · English / Türkçe · Beta.
