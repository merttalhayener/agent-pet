# Agent Pet v0.11.4 — Replace the running panel after updates

Once this version is active, the desktop panel checks for an installed Marketplace update every five seconds. It closes the older helper and opens the new version without interrupting chats. Visibility preferences, workspace groups and the live window snapshots are preserved. A deliberately quit helper stays closed.

Repeated starts reuse the existing helper. Older VS Code windows cannot downgrade a newer running helper, and a missing replacement executable leaves the working helper running.

**First upgrade:** Users on 0.11.3 or earlier still need a window reload to activate this mechanism. The extension host continues to use the safe idle reload with a 15-second countdown; active chats are not forcibly reloaded.

Includes the independent Hide pet / Hide panel / Hide all controls and menu label fixes from 0.11.1–0.11.3.

Apple Silicon · macOS 26+ · English / Türkçe · Prerelease.

Validation: Node regression tests and a real macOS process/lock handover test, including background detection during active chat snapshots, hidden state preservation, old-process termination, and a stale second window.

Marketplace upload is pending. Use `agent-pet-marketplace-0.11.4-darwin-arm64.vsix` instead of the previous package.
