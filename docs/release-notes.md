# Agent Pet v0.10.0 — Focus controls and updates

- Add status and workspace filters without affecting notification tracking or totals.
- Add persistent per-chat workspace overrides for grouping and window navigation.
- Add optional status labels, including Stopped, and a menu bar running/waiting counter.
- Add opt-in native macOS waiting notifications with per-chat mute and click-to-chat routing.
- Add daily GitHub beta update checks and one-click checksum-verified VSIX installation.
- Package the native helper as an application bundle and preserve upgrades from older helpers.

After installation, finish active chats and run **Developer: Reload Window** in each open VS Code window. Windows are never reloaded automatically.

Enable waiting notifications under **Notifications → Notify when waiting for me**, then grant macOS permission. Background checks contact GitHub once daily; disable them with `codexPet.checkForUpdates`. Chat records remain local.

Apple Silicon · macOS 26+ · English / Türkçe · Beta. No Developer ID signing/notarization yet.
