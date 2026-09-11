# Codex Pet Panel (local)

A small movable VS Code webview alongside the Codex chat. This is a personal extension, not an official OpenAI extension.

## Desktop pet on macOS

Version 0.5 shows one transparent floating pet with a compact conversation list underneath. The pet remains visible while VS Code is in the background, minimized, or hidden, without taking keyboard focus.

- Running chats show a rotating blue ring; completed chats show a green check. Pinned chats appear first, followed by chats needing a reply and running chats. Each conversation keeps its own state.
- A yellow indicator marks an outstanding `request_user_input` or `request_user_input_async` question. Async acceptance is not treated as an answer; the indicator clears when the answers arrive. Some Codex permission dialogs are not exposed in local session records, so this is not a complete approval monitor.
- Each row shows elapsed turn time, frozen on completion. Older retained chats without a known start time show a dash.
- A new completion triggers a short pet celebration and a title banner, even when another chat is still running. **Bitiş animasyonu** toggles it; **Bitişte ses çal** enables the optional completion sound (off by default). Restored history does not replay notifications.
- Click the chevron in the list header to collapse to a pet and activity count. Click it again to expand.
- Right-click a chat and choose **Sohbeti sabitle** to keep it at the top; a star marks pinned rows.
- **Görünüm** adjusts text size, pet size, and list opacity independently. The corner grip still scales the whole panel.
- **Kenarlara hizala** toggles snapping within 18 points of a screen edge after dragging (on by default).
- **Ctrl+Option+Command+P** toggles presentation mode globally: hide the panel and suppress notifications while tracking continues. The paw icon in the macOS menu bar also restores it. A conflicting shortcut is reported in the paw icon's tooltip. **Codex Pet: Toggle Presentation Mode** is also available in the VS Code Command Palette.
- Appearance, pinning, collapse, notification, snapping, and presentation preferences are remembered.
- Completed rows stay until manually removed, including across helper restarts. Hover a row and click ×, or right-click it and choose **Listeden kaldır**. A new task in a dismissed conversation brings its row back and clears the old dismissal; the row then remains visible after completion until manually removed again.
- Long lists scroll, showing up to eight rows at a time. Hover a title to read the full name and status. Row links use the installed Codex extension’s local conversation URI handler.
- Drag the upper-right diagonal double-arrow grip to scale the pet and list together (65–200%, limited to the available screen area). Size is remembered across restarts.
- Drag the pet or list background to move the panel; its position is remembered. The panel can sit at the physical bottom corners, including the Dock area, and stays anchored there when the conversation list changes. Click a conversation row to open that exact chat in VS Code. Click the pet to react.
- Right-click to choose a character, sleep/wake, clear completed rows, restore removed rows, or close the panel. Sleep freezes the pet while chat status continues updating.
- **Codex Pet: Show Desktop Pet** reopens the panel. `codexPet.desktopEnabled` controls automatic opening at extension startup.
- The same conversation observed by multiple VS Code windows appears once. The latest lifecycle event determines its status; another conversation finishing has no effect on it.
- Conversations come from local VS Code activity in the workspace, not the list of open editor tabs. A read-only lookup of Codex's local thread index discovers recently updated conversations even when they began on an older date. Subagents are excluded. Titles use the local conversation name, falling back to workspace name and a short ID.
- Character selection from the sidebar is sent to the desktop. Desktop selection is remembered until the next sidebar selection.
- Lost updates show a question mark, aborted turns show a dash, and failures show an exclamation mark. None of these is treated as completion.
- Desktop components are local, use no network or screen recording, and require no Accessibility permissions. The executable is built for this Mac (Apple Silicon).

The macOS helper source is in `native/DesktopPet.swift`. It uses an AppKit nonactivating NSPanel with `hidesOnDeactivate = false`, a floating window level, and a single-instance file lock. Extension instances exchange only pet/status metadata through their private global-storage directory.

- Open: **Codex Pet: Open Pet** from the Command Palette.
- The **Pet** view appears in the Codex sidebar. Drag the divider above it to make it smaller, or drag its header to another sidebar/panel.
- Choose one of the nine available pets. Click to pet, move the mouse to have it look at the pointer, or drag it sideways.
- The moon button tucks it in; the sun wakes it. Pet choice and sleeping state persist.
- The sidebar status indicator summarizes the workspace, while the desktop list shows individual conversations. Both follow explicit task start/completion/abort events. Approval states are not inferred. Ten minutes without an event marks an individual running conversation as having no recent update, never completed. Remote/cloud-only sessions are not covered.
- Turn activity tracking off with `codexPet.followActivity`.

The extension references sprite assets from the installed `openai.chatgpt` extension; no OpenAI asset is bundled or redistributed. This local integration relies on Codex's current asset layout and session event format. A future Codex update could change those. It makes no changes to Codex, its settings, or its session files. No network calls or telemetry.

Uninstall **Codex Pet Panel (Local)** from Extensions to remove it.
