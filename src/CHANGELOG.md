# Changelog

## 0.16.2 — Keep ongoing turns running during silence

- Remove the 60-second inactivity downgrade from the shared Codex/Claude monitor and native panel.
- Keep confirmed, unfinished turns running through long reasoning and tool execution, with elapsed time advancing.
- Preserve unknown status after reload until new progress; withdraw live evidence when the session source disappears or becomes unreadable.
- Render legacy quiet states from connected windows as ongoing turns, allowing the native fix to take effect before a window reload.
- Retain explicit completion, interruption, waiting and window-disconnection behavior.

## 0.16.1 — Open the setup guide automatically

- Open Get Started directly once in the first focused VS Code window, without requiring a notification click.
- Include users who missed the previous welcome notification and have not completed setup.
- Prevent duplicate guides across windows and later launches; skip completed setups.
- Retry failed guide initialization without consuming the first-run marker.

## 0.16.0 — Setup, connections and diagnostics

- Add a one-time, dismissible setup guide with agent checks, companion controls and optional waiting notifications.
- Show per-window workspace connections, heartbeat age and tracking separately from chat status.
- Compare loaded, installed and running helper versions in a bilingual diagnostics screen.
- Copy a local diagnostic report without conversation text, project names, paths or raw error messages.
- Open connections from the paw menu in the most recently focused compatible VS Code window.
- Add native health reporting, strict webview actions and privacy/connection/UI regression coverage.

## 0.14.2 — Delete the uninstalled macOS app

- Delete the removed installation’s `Agent Pet.app` bundle, instead of only stopping its process and waiting for VS Code to delete the files.
- Clean up on native shutdown after an explicit all-profile removal marker, from the live extension even if the pet was quit, and through the official uninstall hook.
- Validate package identity and bundle paths; preserve newer versions and installations still used by another profile.
- Keep the app installed after normal Quit, disconnect and Reload Window.
- Test real app-directory deletion, repeated cleanup and protection of other app versions.

## 0.14.1 — Keep the macOS helper with its extension

- Close a removed helper even when an older extension host is still publishing snapshots.
- Keep the shared panel alive for other connected windows; allow reload reconnection before closing after the last window disconnects.
- Add an exact-package uninstall hook that stops its own native process and unregisters its bundle without touching newer versions.
- Withdraw removed clients and reject obsolete update candidates; preserve handover to a valid installed update.
- Handle SIGTERM through normal AppKit shutdown to save position and release the shared lock.
- Leave bundled app file deletion to VS Code; document the restart-dependent final cleanup.

## 0.14.0 — Original companions

- Replace optional Codex artwork with three original MIT-licensed characters: Byte, Miso and Fern.
- Draw pets locally with typing, blinking, sleeping, waiting, completion and click reactions; respect Reduce Motion.
- Stop discovering external sprite sheets and ignore legacy artwork paths from older VS Code windows.
- Keep pet selection independent of installed agent extensions; migrate old selections to Byte.
- Re-render all current documentation PNGs, GIFs and the feature video with original artwork.
- Document the distinction between the current ad-hoc signature and optional Apple Developer ID/notarization.

## 0.12.0 — Regular release channel

- Ship Marketplace packages as regular releases by default, without the prerelease flag.
- Use a version above 0.11.4 so existing preview users can receive the release through VS Code updates.
- Remove beta/prerelease installation wording from the English and Turkish READMEs.
- Include all 0.11.4 fixes: independent pet/panel visibility, refreshed menu labels, and automatic replacement of the running desktop helper after installed updates.

## 0.11.4 — Replace the running pet after updates

- Detect a newly installed Marketplace package every five seconds while the desktop helper is running.
- Close the older helper and launch the installed version without interrupting active chats or waiting for a VS Code window reload.
- Keep panel visibility, pet preferences, workspace groups and live window snapshots.
- Serialize concurrent starts, reuse an existing helper, and prevent older windows from downgrading it.
- Validate the replacement executable before stopping the old helper; leave deliberately quit apps closed.
- The first upgrade from 0.11.3 or earlier still needs a window reload to activate this mechanism. Extension-host updates retain the existing safe idle reload.

## 0.11.3 — Hide the panel independently

- **Hide panel** now hides only the chat list, keeping the pet visible.
- Add a compact pet-only layout with movement, resizing and a saved visibility preference.
- Add **Hide all / Show all** for the whole window; retain the global shortcut.
- Keep **Hide pet / Show pet** independent and restore both parts when everything was hidden individually.
- Make the VS Code **Hide Panel** command hide only the chat list.


## 0.11.2 — Refresh menu labels after toggling

- Fix the paw menu retaining **Show pet** after the character is shown.
- Refresh the same menu before every opening and track its actual open/close lifecycle.
- Preserve open menu items during background activity updates.
- Cover repeated pet/panel toggles in English and Turkish without waiting for polling.


## 0.11.1 — Separate pet and panel visibility

- Fix **Hide pet** hiding the entire panel: it now hides only the character.
- Add **Hide panel / Show panel** for the whole window; retain the global shortcut.
- Keep workspace groups, chats and panel-only preference when toggling visibility.
- Rename the VS Code hide command to **Hide Panel**, retaining its command ID.
- Update English/Turkish labels and usage instructions.


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
