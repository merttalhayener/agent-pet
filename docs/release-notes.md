# Agent Pet v0.16.4 — Follow Claude plugin progress

Claude plugin and MCP tool calls now confirm running status from matching progress records after the monitor reconnects to an unfinished call. Tool results marked as metadata are processed as well, including results that resolve blocking questions. A message containing a tool call cannot also mark the chat completed.

Unrelated progress and late background updates after completion or interruption do not restart the chat. Ordinary plugin calls, results and reasoning remain running until an explicit finish.

This addresses reproduced parser gaps. The externally reported session was not available for replay; Claude versions that do not write progress records still require a new assistant or tool-result record to confirm work after reload.

Includes the 0.16.3 fix for Codex continuing to work while an asynchronous question remains open.

After updating, finish active work and reload existing VS Code windows to load the updated tracker.

Apple Silicon · macOS 26+ · English / Türkçe · Regular release.

Marketplace upload of `agent-pet-marketplace-0.16.4-darwin-arm64.vsix` is pending.

Validation: 82 Node tests pass, including synthetic plugin/reload/progress/metadata-result regressions. Two new regression cases fail against the previous parser. VSIX version, target platform, bundled sources and native signature are checked during packaging.
