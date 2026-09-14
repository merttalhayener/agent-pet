# Changelog

## 0.11.0 — Marketplace prerelease

- Prepare the public `merttalhayener.agent-pet` identity for Apple Silicon macOS.
- Add an original store icon, MIT license and third-party notices.
- Replace the legacy preview explicitly while keeping pet preferences.
- Route Claude chats through the installed extension identity.
- Use VS Code Marketplace updates with idle-window reload protection.
- Package with the official VS Code tool and a platform-specific target.


## 0.10.2

- Reload each VS Code window automatically after an in-app update once its tracked chats finish.
- Add a 15-second countdown with Later and an autoReloadAfterUpdate preference.
- Postpone reload for new/uncertain activity, disabled tracking, unsaved changes, running VS Code tasks or debugging.
- Check activity again immediately before reload and keep windows independent.

## 0.10.1

- Distinguish quiet ongoing turns from disconnected/unconfirmed sessions with a clock and No recent activity label.
- Restore the spinner on new progress; keep the reload safeguards and explicit completion checks.
- Preserve terminal states against older or uncertain reports from other VS Code windows.
- Use this patch release to exercise the 0.10.0 in-app updater.

## 0.10.0

- Add status and workspace filters without affecting notification tracking or totals.
- Add persistent per-chat workspace overrides for grouping and window navigation.
- Add optional status labels, including Stopped, and a menu bar running/waiting counter.
- Add opt-in native macOS waiting notifications with per-chat mute and click-to-chat routing.
- Add daily GitHub beta update checks and one-click checksum-verified VSIX installation.
- Package the native helper as an application bundle and preserve upgrades from older helpers.

## 0.9.1

- Fix chats remaining under a broad multi-root workspace when the project is also open in a dedicated window.
- Prefer the deepest matching project folder, then the workspace with fewer folders; repair retained group assignments automatically.
- Stop claiming previously seen chats after their folder is removed from a workspace.
- Keep workspace ownership independent of panel-only mode.

## 0.9.0

- Added **Appearance → Panel only** to hide the character while keeping the chat panel visible.
- Remove the unused character space and keep header dragging, resizing, and chat navigation available.
- Support both compact and workspace views; remember the preference after restart.

## 0.8.1

- Target the owning VS Code window when clicking a Codex or Claude chat across multiple workspaces.
- Resolve window-specific links through VS Code’s API and use only live workspace snapshots.
- Show a workspace hint when no live route is available instead of opening an unrelated window.
- Verify routing across two real VS Code windows, including switching back to the first.

## 0.8.0

- Added an extended view that groups Codex and Claude chats by VS Code workspace, including multi-root workspaces.
- Added foldable group headers with running and total counts, and a one-click compact/extended view toggle.
- Remember view and folded groups after restart; keep older untagged chats visible under Other chats.
- Preserve stable group ownership when several windows report the same chat.

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
