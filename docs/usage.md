# Usage & troubleshooting

## Setup, connections and diagnostics

The **Get Started** guide opens automatically once in the first focused VS Code window. You can close the tab and return with **Agent Pet: Get Started**. Completed setups are skipped; closing the guide prevents automatic reopening on later launches. Version 0.16.1 also opens it for users who missed the old notification and have not completed setup. The guide checks installed Codex / Claude Code / Google Antigravity extensions, opens the desktop companion, and optionally requests waiting-notification permission. Sign in within each agent’s own UI; installed does not mean authenticated.

Run **Agent Pet: Connections** or use **Connections & diagnostics** in the paw menu. Each row is a VS Code extension-host connection, with its workspace, version, tracking setting, chat count and last heartbeat. A heartbeat under 15 seconds is connected. Recently disconnected windows remain visible for up to ten minutes while the support screen is open. This is separate from a conversation’s running, waiting or completed status. Multiple windows require Agent Pet to be installed and enabled in each applicable profile.

Run **Agent Pet: Diagnostics** to compare the extension version loaded in this window, the package installed on disk, and the pet actually reporting health. An old loaded version means that window still needs a safe reload after active work finishes. Helper health is refreshed independently of chat activity; missing health from an older running helper is reported as unavailable. Notification permission and local record-directory readability are shown too.

**Copy diagnostics** puts JSON on the clipboard; it does not send anything. The report includes versions, OS/VS Code details, per-window connection/tracking booleans and chat counts, and recent helper/support error codes recorded in this window. It omits transcript text, titles, workspace names/paths, client IDs and raw exception messages. It is not a complete agent log. The support screen follows the pet’s English/Türkçe language setting and works without external web resources.

## Custom pets

Choose **Pets → Add custom pet…** (Türkçe: **Petler → Kendi petini ekle…**) in the desktop or paw menu, or run **Agent Pet: Add Custom Pet** in VS Code. **Agent Pet: Choose Pet** also lists locally saved custom pets and an add action.

Enter a name (1–60 characters) and choose a **normal / idle** PNG. The **running**, **waiting for your reply**, **completed / happy**, and **sleeping** images are optional. The preview selector lets you check every pose; a missing pose uses normal. Status badges remain visible on the desktop even with a single image. Sleep takes priority, followed by waiting, running and completion/reaction. Errors use the normal image with a red badge.

Use static PNGs up to **10 MB** and **4096 × 4096 pixels** per pose. Transparent backgrounds and identical canvas sizes/character alignment give the most consistent results. Animated PNGs and sprite sheets are not supported. Imports preserve transparency and resize large images to at most 1024 pixels. Agent Pet does not remove backgrounds or generate missing artwork.

Set the pet's size (50–150%), flip horizontally, and enable or disable gentle movement. These preferences belong to each custom pet; its size multiplies **Appearance → Pet size**. macOS Reduce Motion also disables movement. **Save pet** adds and selects it. **Cancel** or closing the window discards the draft. Images are copied into local extension storage, so the original uploads may be moved or deleted afterward. They stay on this Mac and survive restarts and extension updates.

Select the custom pet, then **Pets → Edit custom pet…** (Türkçe: **Özel peti düzenle…**) to change its name, images or preferences. **Clear** removes a draft pose; normal must be present before saving. **Delete pet…** asks for confirmation and removes that pet's local copies, returning to Byte if selected. Missing optional files use normal; if normal is unreadable, Byte is shown instead. Click that pet's name in **Pets** to repair its images or delete it. Sharing/export and an online gallery are not included.

## Views

Use **Appearance → Panel only** to hide the character and its empty space. The chat list stays visible. Drag its header to move it and the top-right handle to resize it. Uncheck the option to restore the character.

**Extended · Workspaces** is the default view when no saved layout preference exists. Use **▤** or **Appearance → Extended · Workspaces** to group chats. Click a group header to fold or expand it. Switch back with **Appearance → Compact list**. Your saved layout, folded groups, and other preferences survive restart and updates.

Multi-root workspace files form one group. If the same project is open separately, ownership prefers the deepest matching folder, then the workspace with fewer folders. This is a folder-based rule, not proof of which window created the chat. Older records without workspace information stay under **Other chats** until their workspace reports them again.

## Focus and workspace overrides

Open **Filters** from the paw or right-click menu. Combine **All chats / Running / Waiting for me** with **All workspaces** or one workspace. Filters do not change activity tracking, completion feedback, or the menu bar totals. A filtered empty list stays empty until a matching chat appears; reset both filters to see everything.

Right-click a row → **Assign workspace** to pick a known workspace. This overrides both grouping and click navigation and survives restart. Choose **Automatic** to restore folder-based ownership. If the target window is closed, open that workspace before clicking again. The override does not move files or change the agent’s working directory. For a manually assigned Claude chat, any existing editor tab is kept until you close it yourself.

**Appearance → Status labels** adds text beneath each title. A minus with **Stopped** means an explicit interrupted turn; **Idle** has no recorded finish time. **No update** means activity cannot currently be confirmed, not that the task completed.

**Appearance → Menu bar counter** shows running/waiting totals beside the paw, including chats hidden by filters. It stays visible while the panel is hidden; turn it off for a smaller menu bar item.

## Working while a question is open

Codex can ask a non-blocking question and keep working. Agent Pet counts that chat as **running**, keeps its spinner and timer, and shows **Running · question pending** (Türkçe: **Çalışıyor · açık soru var**). The extra label is visible even when optional status labels are off. The **Waiting for me** filter includes these open questions, but the waiting counter counts only chats actually waiting.

A blocking question, or a completed turn with an unanswered question, shows **Waiting for your reply**. Answering every pending question clears the question indicator; partial replies keep it. Notifications can still alert you to a new question while work continues. Finishing that same turn does not repeat the alert. After reload, an unfinished turn still needs fresh progress to be counted as running. For Claude plugins, matching tool-progress records also count. If Claude does not write progress while a tool is running, confirmation must wait for the next assistant or tool-result record.

## Reply time and next waiting chat

Chats needing a reply show a yellow **Wait** duration below the turn duration. It measures the oldest outstanding question, independently of the most recent question timestamp used for notification deduplication. Partial replies advance it only when the oldest request has been answered; reconnecting preserves recorded timestamps. Older extension hosts use the available question or waiting-state timestamp as a fallback.

Hover over a row or right-click it to see why it has its status. Tooltips include reply time, turn time and time since the last recorded activity. Reconnecting, unavailable local records, a disconnected window and disabled tracking have distinct explanations. Time since activity does not mark a silent turn complete.

Use **Ctrl + Option + Cmd + N** or **Open next waiting chat** in the paw menu to cycle through chats needing a reply, starting with the longest wait. Both blocking questions and questions asked while an agent works are eligible. The selected workspace filter applies; the status filter and collapsed groups do not prevent navigation. Dismissed chats and destinations without a valid live window route are excluded. The action also works while the panel is hidden. If another application owns the shortcut, use the menu action.

## Waiting notifications

Enable **Notifications → Notify when waiting for me**, then allow Agent Pet in the macOS permission prompt. Notifications are off by default. Click a notification to open that chat in its assigned live workspace window. Right-click a chat → **Mute waiting notifications** to silence only that conversation.

Notifications follow newly detected requests for input, not every log update. Existing requests are quiet on startup, reconnecting does not repeat the same request, and hiding the whole panel pauses alerts. Panel-only mode and list filters do not pause them. Some agent permission dialogs are not recorded and cannot trigger a notification. macOS Focus and notification settings also control banner delivery.

## Install, update & remove

The macOS app is bundled inside the extension; there is no separate Applications-folder installation.

Use **Check for updates…** in the paw menu or **Agent Pet: Check for Updates** in the Command Palette to open the Marketplace entry. VS Code manages downloads according to its extension update settings. From 0.11.4, the running desktop helper detects the installed package every five seconds and replaces its old process without reloading VS Code. Hidden components stay hidden; a deliberately quit helper stays closed. An older window cannot downgrade a newer running helper. The first upgrade from 0.11.3 or earlier needs a window reload to load this mechanism. Each window waits for its tracked chats to finish and then reloads after a 15-second countdown. **Later** postpones that version in that workspace. New activity, unknown/quiet/waiting chats, disabled tracking, unsaved editors, active tasks and debugging postpone reload. Disable `codexPet.autoReloadAfterUpdate` for manual reloads.

**Moving from the GitHub preview?** Install the Marketplace version, choose **Replace preview**, and reload each window after active work finishes. Pet preferences are retained. The former preview's GitHub update settings do not control Marketplace downloads. The older `local.codex-pet-panel` and the Marketplace extension have different identities, so this is a one-time migration.

From 0.14.2, uninstalling closes the helper and deletes that installation’s `Agent Pet.app` bundle. A version still installed in another profile is kept. Closing all connected VS Code windows only closes the helper after a short reconnect grace period (about one minute); it does not uninstall the app. If neither the extension nor the helper is running, VS Code’s uninstall hook performs cleanup when it next runs.

## Opening chats

Click a row to open the chat in its live workspace window. Each window must load the installed extension version to publish current routing information. Automatic update reloads handle this from 0.10.2; older hosts need the one-time manual reload described above.

Claude extension chats open in the right sidebar. Claude may keep an active or unsaved session in its existing editor tab; finish the turn, close that tab, then click its pet row again. A completed, uniquely identified tab can move automatically.

## Integrated terminal chats

Run Codex CLI or Claude Code in VS Code’s integrated terminal. Its chat appears with a **Terminal** label; clicking it brings that VS Code window forward and reveals the terminal. The row remains after the CLI exits while the terminal stays open, and disappears when the terminal closes. Agents in other terminal apps are not tracked. Reload existing VS Code windows after updating to enable terminal discovery and navigation.

## Restoring the panel

Click **Agent Pet** in VS Code’s status bar or run **Agent Pet: Show Desktop Pet**. While the helper is running, use the menu bar paw or **Ctrl + Option + Cmd + P** to hide or restore it. Hiding everything also pauses completion feedback.

## Status looks stuck

Queued prompts do not count as running just because they were submitted. When the agent starts the next prompt, the chat returns to running and its work timer starts for that turn. A steering prompt consumed during existing work keeps that turn's timer. Claude distinguishes consumed human prompts from cancelled queue items and background-agent reports; Codex matches completion events to the current turn.

When Claude Code starts background agents or a workflow, its chat keeps running after the reply that announces them. It completes once every background task has reported back and Claude ends its final reply. Background shell commands, such as development servers, do not keep a chat running.

While Claude Code waits on subagents or a workflow, the row names them instead of just "Running": `Agent: Review changes`, `Workflow: release-audit`, or `6 agents · Check batch 5` for several. Hover the row for the newest agents. Agent Pet keeps only the short agent description or workflow name while it runs.

After reconnecting, Agent Pet waits for new activity before showing a chat as running. Once confirmed, an unfinished turn keeps its spinner and elapsed time during long reasoning or tool calls. Silence alone does not change its status. **No update** and a question mark remain for unconfirmed or disconnected sessions and unreadable/removed session files. Only an explicit completion record produces a checkmark, and older window snapshots cannot undo that completion.

The app reads recorded agent lifecycle events; it cannot tell whether the chat UI is receiving messages or detect a backend failure that leaves no event while the monitor stays connected. Some permission dialogs are not detected.

## Languages and local data

English is the default. Choose **Language → English / Türkçe** from the paw or right-click menu. Chat titles keep their original language.

No telemetry is added and no chat records are sent to a server by this extension. Byte, Miso and Fern are included original characters, drawn locally without loading artwork from Codex or Claude Code. Choose one under **Pets**. Old character choices fall back to Byte.

This release targets Apple Silicon and macOS 26+. The original source and artwork are MIT licensed. Developer ID signing and notarization are not yet provided. See [development details](development.md).

## Pet and panel visibility

**Hide pet / Show pet** controls only the character, keeping chats, workspace groups and notifications available. **Hide panel / Show panel** controls only the chat list; the pet can stay visible and can still be moved or resized. **Hide all / Show all** and **Ctrl + Option + Cmd + P** control the entire window while preserving the chosen layout. If both parts were hidden individually, **Show all** restores both. Notifications pause only when everything is hidden. The VS Code command is now **Agent Pet: Hide Panel**; its existing command ID is retained.

## Google Antigravity

Install the official [Google Antigravity extension for VS Code](https://antigravity.google/docs/ide/extensions/vscode/) (`google.google-antigravity`), sign in and open its panel to start the local backend. Agent Pet follows its local conversation summary stream automatically while activity tracking is enabled. Antigravity rows open the exact conversation in their owning VS Code window.

Questions and approval requests show a waiting duration and are included in waiting notifications and Ctrl + Option + Cmd + N. Nested subagents, archived chats, cloud sessions and other workspaces are excluded. The parent remains active while the backend reports background work or active children. On reconnect, historical running summaries need fresh activity; existing explicit waiting requests remain visible. Missing local backends become unknown instead of remaining running.

This adapter supports the official VS Code extension, verified against version 1.7.0. It does not monitor the standalone Antigravity app, Antigravity IDE, CLI or remote backends. If no rows appear, open Antigravity’s own panel, confirm its backend starts, and check **Agent Pet: Diagnostics**. Its local integration API is not a stable public SDK and may change between releases.
