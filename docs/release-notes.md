# Agent Pet v0.16.2 — Keep ongoing turns running during silence

A chat that is still working could show **No recent activity** after 60 seconds without a new log entry. Long reasoning and tool calls can be silent for longer than that.

Confirmed, unfinished turns now keep their spinner and advancing elapsed time. The fix covers the shared Codex/Claude monitor and native panel. Connected older windows reporting the former quiet state are displayed correctly by the updated helper too.

Reloaded windows still need new progress before claiming a chat is running. Lost window connections and unreadable/removed session files become **No update**. Explicit completion and interruption records still control the final status.

The native helper updates without forcing a window reload. Existing windows load the updated monitor after a safe reload when active work finishes.

Apple Silicon · macOS 26+ · English / Türkçe · Regular release.

Marketplace upload of `agent-pet-marketplace-0.16.2-darwin-arm64.vsix` is pending.

Validation: 77 Node tests including long silence, missing source recovery, reload, interruption and Claude transitions; native lifecycle/status tests; package and signature checks.
