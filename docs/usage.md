# Usage & troubleshooting

## Views

Use **Appearance → Panel only** to hide the character and its empty space. The chat list stays visible. Drag its header to move it and the top-right handle to resize it. Uncheck the option to restore the character.

Use **▤** or **Appearance → Extended · Workspaces** to group chats. Click a group header to fold or expand it. Switch back with **Appearance → Compact list**. View, folded groups, and other preferences survive restart.

Multi-root workspace files form one group. If the same project is open separately, ownership prefers the deepest matching folder, then the workspace with fewer folders. This is a folder-based rule, not proof of which window created the chat. Older records without workspace information stay under **Other chats** until their workspace reports them again.

## Opening chats

Click a row to open the chat in its live workspace window. After upgrading, reload **each** open VS Code window once after active turns finish so every window publishes current routing information.

Claude opens in the right sidebar. Claude may keep an active or unsaved session in its existing editor tab; finish the turn, close that tab, then click its pet row again. A completed, uniquely identified tab can move automatically.

## Restoring the panel

Click **Agent Pet** in VS Code’s status bar or run **Agent Pet: Show Desktop Pet**. While the helper is running, use the menu bar paw or **Ctrl + Option + Cmd + P** to hide or restore it. Hiding everything also pauses completion feedback.

## Status looks stuck

After reconnecting, Agent Pet waits for new activity before showing a chat as running. After 60 seconds without progress, the spinner changes to **No update**. The row remains visible; new activity restores its status. Only an explicit completion record produces a checkmark.

The app reads local agent activity; it cannot tell whether the chat UI is receiving messages. A quiet long-running tool can also show **No update**, and some permission dialogs are not detected.

## Languages and local data

English is the default. Choose **Language → English / Türkçe** from the paw or right-click menu. Chat titles keep their original language.

No telemetry is added and no chat records are sent to a server by this extension. An included vector robot works without Codex; optional character artwork comes from the installed Codex extension.

This is a beta for Apple Silicon and macOS 26+. Developer ID signing/notarization and a general open-source license are not yet provided. See [development details](development.md).
