# Usage & troubleshooting

## Views

Use **Appearance → Panel only** to hide the character and its empty space. The chat list stays visible. Drag its header to move it and the top-right handle to resize it. Uncheck the option to restore the character.

Use **▤** or **Appearance → Extended · Workspaces** to group chats. Click a group header to fold or expand it. Switch back with **Appearance → Compact list**. View, folded groups, and other preferences survive restart.

Multi-root workspace files form one group. If the same project is open separately, ownership prefers the deepest matching folder, then the workspace with fewer folders. This is a folder-based rule, not proof of which window created the chat. Older records without workspace information stay under **Other chats** until their workspace reports them again.

## Focus and workspace overrides

Open **Filters** from the paw or right-click menu. Combine **All chats / Running / Waiting for me** with **All workspaces** or one workspace. Filters do not change activity tracking, completion feedback, or the menu bar totals. A filtered empty list stays empty until a matching chat appears; reset both filters to see everything.

Right-click a row → **Assign workspace** to pick a known workspace. This overrides both grouping and click navigation and survives restart. Choose **Automatic** to restore folder-based ownership. If the target window is closed, open that workspace before clicking again. The override does not move files or change the agent’s working directory. For a manually assigned Claude chat, any existing editor tab is kept until you close it yourself.

**Appearance → Status labels** adds text beneath each title. A minus with **Stopped** means an explicit interrupted turn; **Idle** has no recorded finish time. **No update** means activity cannot currently be confirmed, not that the task completed.

**Appearance → Menu bar counter** shows running/waiting totals beside the paw, including chats hidden by filters. It stays visible while the panel is hidden; turn it off for a smaller menu bar item.

## Waiting notifications

Enable **Notifications → Notify when waiting for me**, then allow Agent Pet in the macOS permission prompt. Notifications are off by default. Click a notification to open that chat in its assigned live workspace window. Right-click a chat → **Mute waiting notifications** to silence only that conversation.

Notifications follow newly detected requests for input, not every log update. Existing requests are quiet on startup, reconnecting does not repeat the same request, and hiding the whole panel pauses alerts. Panel-only mode and list filters do not pause them. Some agent permission dialogs are not recorded and cannot trigger a notification. macOS Focus and notification settings also control banner delivery.

## Updates

Use **Check for updates…** in the paw menu or **Agent Pet: Check for Updates** in the Command Palette. Agent Pet also checks GitHub once daily, including beta releases. Click **Install update** to download a package, verify its SHA-256 checksum, and install it through VS Code. It never reloads a window automatically: finish active chats first, then run **Developer: Reload Window** in each open window.

Disable background checks with `codexPet.checkForUpdates` in VS Code settings. Manual checks still work. An internet connection to GitHub is required; no chat data is included in update requests.

## Opening chats

Click a row to open the chat in its live workspace window. After upgrading, reload **each** open VS Code window once after active turns finish so every window publishes current routing information.

Claude opens in the right sidebar. Claude may keep an active or unsaved session in its existing editor tab; finish the turn, close that tab, then click its pet row again. A completed, uniquely identified tab can move automatically.

## Restoring the panel

Click **Agent Pet** in VS Code’s status bar or run **Agent Pet: Show Desktop Pet**. While the helper is running, use the menu bar paw or **Ctrl + Option + Cmd + P** to hide or restore it. Hiding everything also pauses completion feedback.

## Status looks stuck

After reconnecting, Agent Pet waits for new activity before showing a chat as running. After 60 seconds without progress in a previously confirmed turn, the spinner becomes a clock labeled **No recent activity**. This is a quiet interval, not proof the task stopped. New activity restores the spinner. **No update** and a question mark remain for unconfirmed or disconnected sessions. Only an explicit completion record produces a checkmark, and older window snapshots cannot undo that completion.

The app reads local agent activity; it cannot tell whether the chat UI is receiving messages. A quiet long-running tool can show **No recent activity**, and some permission dialogs are not detected.

## Languages and local data

English is the default. Choose **Language → English / Türkçe** from the paw or right-click menu. Chat titles keep their original language.

No telemetry is added and no chat records are sent to a server by this extension. An included vector robot works without Codex; optional character artwork comes from the installed Codex extension.

This is a beta for Apple Silicon and macOS 26+. Developer ID signing/notarization and a general open-source license are not yet provided. See [development details](development.md).
