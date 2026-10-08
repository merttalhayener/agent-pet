# Agent Pet v0.19.3 — Keep Claude background work running

## What’s new

- **Claude background agents stay in view.** When Claude Code launches background agents or a workflow and replies "started", the chat keeps running until that work reports back and Claude finishes. It no longer shows as completed while Claude is still working.
- **One timer per task.** Background reports continue the open chat's work timer instead of starting a new one.
- **Servers stay quiet.** Long-running background shell commands, such as development servers, still do not keep a chat running.

Includes custom pets and the shared chat panel for Codex, Claude Code and the official Google Antigravity VS Code extension.

## Install

Download `agent-pet-marketplace-0.19.3-darwin-arm64.vsix` below. In VS Code, choose **Extensions → … → Install from VSIX…**, then reload the window when your active work has finished.

Requires **Apple Silicon, macOS 26+ and VS Code 1.96.2+**.

[User guide](https://github.com/merttalhayener/agent-pet/blob/v0.19.3/docs/usage.md) · [Türkçe](https://github.com/merttalhayener/agent-pet/blob/v0.19.3/README.tr.md) · [Full changelog](https://github.com/merttalhayener/agent-pet/blob/v0.19.3/CHANGELOG.md)
