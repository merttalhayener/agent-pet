# Changelog

## 0.7.1

- Open Claude chats in the right sidebar through a validated Agent Pet URI handler.
- Move a uniquely identified, completed Claude editor tab into the sidebar; preserve active or unsaved tabs.
- Replace an older detached desktop helper on extension reload, preserving preferences.
- Reload VS Code once after active turns finish to enable the new navigation.

## 0.7.0

- Added local Claude Code in VS Code support alongside Codex, with provider labels, independent status, and direct session links.
- Removed the required Codex extension dependency and added an original vector pet for Claude-only installations.
- Reconcile retained conversations after restart so older explicit completions replace stale unknown indicators.
- Added mixed-provider lifecycle, question, partial-record, workspace, and historical-completion coverage.

## 0.6.0

- Added English and Turkish desktop interface languages, with English as the default.
- Added a persistent Language menu; switching updates menus, dashboard labels, durations, tooltips, and accessibility descriptions immediately.
- Updated VS Code messages to English and refreshed the README's language instructions and screenshots.

## 0.5.4

- Shortened the menu: show/hide and return to VS Code come first; pets, appearance, notifications, and chats have dedicated submenus.
- Grouped all characters under Petler, moved sleep controls beside them, and removed the duplicate hide command.
- Displayed the visibility shortcut in the native shortcut column and refreshed pet/sleep selection states after changes.

## 0.5.3

- Reattached chats require fresh activity before showing a running spinner; 60 seconds without progress shows an unknown state, never completion.
- Closing the pet preserves the menu bar paw and global shortcut. A VS Code status bar button can reopen or relaunch it.
- Showing the pet no longer restores individually dismissed conversations.
- Documented reopening and the limits of activity detection after reload.

## 0.5.2 — Desktop only

- Remove the legacy Pet sidebar view and its webview assets.
- Make Open Pet an alias for the floating desktop helper.
- Simplify English and Turkish READMEs with visual feature previews and a clear support matrix.
- Move build instructions and technical limitations into a separate developer guide.

## 0.5.1 — Agent Pet

- Rename the project and public-facing UI to Agent Pet.
- Clarify that Codex in VS Code is the currently supported integration.
- Preserve the internal extension identity and preferences for existing users.
- Publish new installation packages under the `agent-pet` name.

## 0.5.0 — Initial public beta

- Floating macOS pet with independent conversation status and direct chat links.
- Completion celebration, optional sound, pending-question indicators, and turn duration.
- Collapsible list, pinned chats, independent appearance settings, and edge snapping.
- Global presentation shortcut and macOS menu bar controls.
- Persistent completed rows, including after a previously dismissed chat resumes.
- Corner resize control and stable positioning at the bottom screen edges.

The desktop helper targets Apple Silicon / macOS 26+. Some permission dialogs are not available in local session logs and cannot be shown as pending approvals.
