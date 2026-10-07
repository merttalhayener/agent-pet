# Agent Pet v0.19.0 — Add your own custom pets

Create your own companion with **Pets → Add custom pet…** or **Agent Pet: Add Custom Pet** in VS Code. Give it a name and a normal PNG; running, waiting, happy and sleeping poses are optional and fall back to normal. Preview every pose, adjust the size, flip the character and control gentle movement. The editor is available in English and Türkçe.

Images are copied into local storage and remain available after restarts and extension updates. Edit the selected pet from **Pets → Edit custom pet…**, or delete it after confirmation. Static PNG imports are validated and saved atomically; failed imports and cancelled edits preserve the existing pet. Movement respects macOS Reduce Motion.

This is a cumulative release: it includes Antigravity support from 0.18.0 and the Claude lifecycle fixes, status explanations, reply-waiting counter and attention shortcut from 0.17.0.

Package: `agent-pet-marketplace-0.19.0-darwin-arm64.vsix`. Upload through the existing Marketplace extension’s **Update** action.

## Antigravity support introduced in 0.18.0

Google Antigravity chats now appear beside Codex and Claude Code. Agent Pet reads the official VS Code extension’s local status stream, matches chats to their workspace and opens the exact conversation when you click its row. Open Antigravity’s panel once to start its backend.

Questions and approvals participate in waiting time, notifications and Ctrl + Option + Cmd + N navigation. Nested subagents do not create duplicate rows. Background work keeps the parent active until the agent reports it fully idle. Reconnecting needs new activity before an old running summary becomes confirmed; losing the local backend makes activity unknown.

This adapter covers the official Google Antigravity VS Code extension. The standalone app, Antigravity IDE, CLI and remote backends are outside its scope. No hooks, extra account keys or bridge installation are required.

Includes the status explanations, separate reply-waiting time, attention shortcut and Claude subagent lifecycle fixes introduced in 0.17.0.
