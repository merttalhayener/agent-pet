# Agent Pet v0.20.0 — Follow workflows and subagents

## What’s new

- **See inside the work.** VS Code's Claude panel doesn't show workflow progress, so Agent Pet does. Open **Agents** on a running chat to see its workflow phases and every subagent with its status, model, tokens and time.
- **Know what each chat is doing.** Instead of "Running", the subtitle says `Run unit tests`, `Editing Hero.tsx` or `Fix · verify · 9/10 agents`. Waiting chats name their question; finished chats say when they finished.
- **A calmer list.** A small color mark replaces the repeated agent name, finished chats recede, and empty running counts disappear.
- **More reliable status.** Background work survives a window reload, stopped work no longer lingers, and reports written while a window closes no longer restart finished chats.
- **Still local and private.** Only short labels, names and counts are kept. Prompts, commands, results and scripts are never stored.

Includes custom pets and the shared chat panel for Codex, Claude Code and the official Google Antigravity VS Code extension.

## Install

Download `agent-pet-marketplace-0.20.0-darwin-arm64.vsix` below. In VS Code, choose **Extensions → … → Install from VSIX…**, then reload the window when your active work has finished.

Requires **Apple Silicon, macOS 26+ and VS Code 1.96.2+**.

[User guide](https://github.com/merttalhayener/agent-pet/blob/v0.20.0/docs/usage.md) · [Türkçe](https://github.com/merttalhayener/agent-pet/blob/v0.20.0/README.tr.md) · [Full changelog](https://github.com/merttalhayener/agent-pet/blob/v0.20.0/CHANGELOG.md)
