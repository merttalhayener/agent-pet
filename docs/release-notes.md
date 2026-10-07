# Agent Pet v0.19.2 — Keep queued work in view

## What’s new

- **Workspace groups by default.** New setups open in Extended · Workspaces. Your saved view preference is preserved.
- **Claude queue and steering fixes.** A consumed human prompt brings a completed chat back to running. Enqueued, cancelled and background-agent messages do not. Steering keeps the current work timer.
- **Safer queue handoffs.** Codex ignores a previous turn’s delayed completion; Antigravity measures new work from the observed handoff. The desktop panel accepts a new turn even when it starts in the same millisecond as the previous completion.

Includes custom pets and the shared chat panel for Codex, Claude Code and the official Google Antigravity VS Code extension.

## Install

Download `agent-pet-marketplace-0.19.2-darwin-arm64.vsix` below. In VS Code, choose **Extensions → … → Install from VSIX…**, then reload the window when your active work has finished.

Requires **Apple Silicon, macOS 26+ and VS Code 1.96.2+**.

[User guide](https://github.com/merttalhayener/agent-pet/blob/v0.19.2/docs/usage.md) · [Türkçe](https://github.com/merttalhayener/agent-pet/blob/v0.19.2/README.tr.md) · [Full changelog](https://github.com/merttalhayener/agent-pet/blob/v0.19.2/CHANGELOG.md)
