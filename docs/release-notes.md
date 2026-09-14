# Agent Pet v0.14.2 — Delete the uninstalled macOS app

Uninstall now closes the pet and physically deletes that installation’s `Agent Pet.app` bundle. The previous version only stopped the process and left file deletion to VS Code.

The running helper cleans up its own bundle after VS Code marks that exact version removed from all profiles. The extension also cleans up a removed app that was already quit, and the official uninstall hook covers final cleanup. If neither component is running, cleanup follows VS Code’s hook schedule.

Other installed versions, shared preferences and conversation files are preserved. Normal Quit, closing VS Code and window reloads do not uninstall the app. Cleanup validates the package identity and refuses redirected bundle paths.

Apple Silicon · macOS 26+ · English / Türkçe · Regular release.

Marketplace upload of `agent-pet-marketplace-0.14.2-darwin-arm64.vsix` is pending.

Validation: 68 Node tests; native UI and deletion guards; real native app-directory deletion and repeated hook cleanup; preservation of the newer app and normal-disconnect files; process handover; packaged VSIX uninstall hook in an isolated CLI installation.
