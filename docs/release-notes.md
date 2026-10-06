# Agent Pet v0.16.5 — Follow agents in the integrated terminal

Codex CLI and Claude Code chats started in VS Code’s integrated terminal now appear alongside extension chats, labeled **Codex · Terminal** or **Claude Code · Terminal**. Click a row to bring its window forward and reveal the terminal running it.

Chats belong to their window through the terminal’s process tree, including when the agent changes folders. A row stays while its terminal is open, even after the CLI exits. Closing the terminal removes it. Agents running in other terminal apps and cloud sessions remain outside tracking.

Reload existing VS Code windows after updating to enable the updated tracker and terminal navigation.

Apple Silicon · macOS 26+ · English / Türkçe · Regular release.

Package: `agent-pet-marketplace-0.16.5-darwin-arm64.vsix`. Marketplace publication awaits publisher authentication.

Validation: 90 Node tests pass. The native dashboard self-test passes, including terminal navigation, row removal after terminal closure/disconnection, mixed providers and overflow. VSIX identity/version, regular channel, platform, packaged sources, native bundle version and signature were checked.
