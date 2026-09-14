# Usage & troubleshooting

## Setup, connections and diagnostics

Run **Agent Pet: Get Started** from the Command Palette. A one-time welcome prompt offers the guide when a window is focused; **Later** dismisses it without blocking your work. You can return to it at any time. The guide checks installed Codex / Claude Code extensions, opens the desktop companion, and optionally requests waiting-notification permission. Sign in within each agent’s own UI; installed does not mean authenticated.

Run **Agent Pet: Connections** or use **Connections & diagnostics** in the paw menu. Each row is a VS Code extension-host connection, with its workspace, version, tracking setting, chat count and last heartbeat. A heartbeat under 15 seconds is connected. Recently disconnected windows remain visible for up to ten minutes while the support screen is open. This is separate from a conversation’s running, waiting or completed status. Multiple windows require Agent Pet to be installed and enabled in each applicable profile.

Run **Agent Pet: Diagnostics** to compare the extension version loaded in this window, the package installed on disk, and the pet actually reporting health. An old loaded version means that window still needs a safe reload after active work finishes. Helper health is refreshed independently of chat activity; missing health from an older running helper is reported as unavailable. Notification permission and local record-directory readability are shown too.

**Copy diagnostics** puts JSON on the clipboard; it does not send anything. The report includes versions, OS/VS Code details, per-window connection/tracking booleans and chat counts, and recent helper/support error codes recorded in this window. It omits transcript text, titles, workspace names/paths, client IDs and raw exception messages. It is not a complete agent log. The support screen follows the pet’s English/Türkçe language setting and works without external web resources.

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

Use **Check for updates…** in the paw menu or **Agent Pet: Check for Updates** in the Command Palette to open the Marketplace entry. VS Code manages downloads according to its extension update settings. From 0.11.4, the running desktop helper detects the installed package every five seconds and replaces its old process without reloading VS Code. Hidden components stay hidden; a deliberately quit helper stays closed. An older window cannot downgrade a newer running helper. The first upgrade from 0.11.3 or earlier needs a window reload to load this mechanism. Each window waits for its tracked chats to finish and then reloads after a 15-second countdown. **Later** postpones that version in that workspace. New activity, unknown/quiet/waiting chats, disabled tracking, unsaved editors, active tasks and debugging postpone reload. Disable `codexPet.autoReloadAfterUpdate` for manual reloads.

**Moving from the GitHub preview?** Install the Marketplace version, choose **Replace preview**, and reload each window after active work finishes. Pet preferences are retained. The former preview's GitHub update settings do not control Marketplace downloads.

## Opening chats

Click a row to open the chat in its live workspace window. Each window must load the installed extension version to publish current routing information. Automatic update reloads handle this from 0.10.2; older hosts need the one-time manual reload described above.

Claude opens in the right sidebar. Claude may keep an active or unsaved session in its existing editor tab; finish the turn, close that tab, then click its pet row again. A completed, uniquely identified tab can move automatically.

## Restoring the panel

Click **Agent Pet** in VS Code’s status bar or run **Agent Pet: Show Desktop Pet**. While the helper is running, use the menu bar paw or **Ctrl + Option + Cmd + P** to hide or restore it. Hiding everything also pauses completion feedback.

## Status looks stuck

After reconnecting, Agent Pet waits for new activity before showing a chat as running. After 60 seconds without progress in a previously confirmed turn, the spinner becomes a clock labeled **No recent activity**. This is a quiet interval, not proof the task stopped. New activity restores the spinner. **No update** and a question mark remain for unconfirmed or disconnected sessions. Only an explicit completion record produces a checkmark, and older window snapshots cannot undo that completion.

The app reads local agent activity; it cannot tell whether the chat UI is receiving messages. A quiet long-running tool can show **No recent activity**, and some permission dialogs are not detected.

## Languages and local data

English is the default. Choose **Language → English / Türkçe** from the paw or right-click menu. Chat titles keep their original language.

No telemetry is added and no chat records are sent to a server by this extension. Byte, Miso and Fern are included original characters, drawn locally without loading artwork from Codex or Claude Code. Choose one under **Pets**. Old character choices fall back to Byte.

This release targets Apple Silicon and macOS 26+. The original source and artwork are MIT licensed. Developer ID signing and notarization are not yet provided. See [development details](development.md).

## Pet and panel visibility

**Hide pet / Show pet** controls only the character, keeping chats, workspace groups and notifications available. **Hide panel / Show panel** controls only the chat list; the pet can stay visible and can still be moved or resized. **Hide all / Show all** and **Ctrl + Option + Cmd + P** control the entire window while preserving the chosen layout. If both parts were hidden individually, **Show all** restores both. Notifications pause only when everything is hidden. The VS Code command is now **Agent Pet: Hide Panel**; its existing command ID is retained.
