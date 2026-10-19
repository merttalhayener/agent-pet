# Agent Pet v0.20.3 — Follow workflows and subagents

## What’s new

- **See inside the work.** Open **Agents** on a running chat to see its workflow phases and every subagent with its status, model, tokens and time.
- **Know what each chat is doing.** Instead of "Running", the subtitle says `Run unit tests`, `Editing Hero.tsx` or `Fix · verify · 9/10 agents`. Waiting chats name their question, and each chat shows one time: how long it has worked, waited, or how long ago it finished.
- **A calmer list.** A short, quiet agent name replaces the repeated “Claude Code”, finished chats recede while staying easy to read, and empty running counts disappear.
- **More reliable status.** Chats finish once their background agents report back, background work survives a window reload, stopped work no longer lingers, and reports written while a window closes no longer restart finished chats.
- **Still local and private.** Only short labels, names and counts are kept. Prompts, commands, results and scripts are never stored.

Includes custom pets and the shared chat panel for Codex, Claude Code and the official Google Antigravity VS Code extension.

## Install

Download `agent-pet-marketplace-0.20.3-darwin-arm64.vsix` below. In VS Code, choose **Extensions → … → Install from VSIX…**, then reload the window when your active work has finished.

Requires **Apple Silicon, macOS 26+ and VS Code 1.96.2+**.

[User guide](https://github.com/merttalhayener/agent-pet/blob/v0.20.3/docs/usage.md) · [Türkçe](https://github.com/merttalhayener/agent-pet/blob/v0.20.3/README.tr.md) · [Full changelog](https://github.com/merttalhayener/agent-pet/blob/v0.20.3/CHANGELOG.md)
