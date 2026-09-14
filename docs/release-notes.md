# Agent Pet v0.14.1 — Helper update and uninstall cleanup

The macOS companion now follows its extension's lifecycle. An installed update replaces the older running helper; removing the extension from all profiles closes the removed helper even if an old window still sends snapshots.

Closing every connected VS Code window closes the helper after a reconnect grace period of about one minute. Other connected windows and normal window reloads keep the shared panel available. The uninstall hook stops and unregisters only its own package, preserving a newer installed app.

The app lives inside the extension, with no separate Applications-folder copy. VS Code handles final file deletion and can defer cleanup until restart. Pet preferences are retained by Agent Pet; no conversation files are deleted by this change.

Apple Silicon · macOS 26+ · English / Türkçe · Regular release.

Marketplace upload of `agent-pet-marketplace-0.14.1-darwin-arm64.vsix` is pending. Existing installations receive these protections after installing this version; native handover does not require interrupting active chats.

Validation: 64 Node tests; native UI checks; isolated native uninstall/disconnect tests; real macOS process handover; VSIX contents, matching native version and ad-hoc signature checked.
