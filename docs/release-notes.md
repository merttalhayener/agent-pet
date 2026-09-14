# Agent Pet v0.12.0 — Regular release

Agent Pet now uses the regular release channel. Marketplace packages no longer carry the prerelease flag, and the installation documentation no longer asks users to install a preview.

This version includes all 0.11.4 fixes:

- Hide pet, Hide panel and Hide all work independently, with menu labels refreshed immediately.
- A running desktop helper detects installed updates and switches to the newer version without interrupting chats.
- Visibility preferences, workspace groups and live chat snapshots are preserved.

Existing 0.11.4 users can receive the higher 0.12.0 release through VS Code updates. Users on 0.11.3 or earlier need one window reload to activate automatic helper handover. Active chats continue to postpone extension-host reloads.

Apple Silicon · macOS 26+ · English / Türkçe.

Marketplace upload is pending. Upload `agent-pet-marketplace-0.12.0-darwin-arm64.vsix` using the existing extension’s Update action.
