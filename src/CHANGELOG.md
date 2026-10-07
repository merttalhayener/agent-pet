# Changelog

## 0.19.2 — Follow queued prompts and default to workspace groups

- Default to **Extended · Workspaces** when no saved view preference exists; keep an explicitly saved compact layout.
- Follow Claude's consumed human queue deliveries, including backdated prompt attachments, while ignoring enqueue-only events, cancellation, duplicate deliveries and subagent reports.
- Preserve the active turn's timer and foreground calls when a steering prompt is consumed.
- Match Codex completion to its turn ID so a late previous result cannot finish the next queued turn; ignore older lifecycle records and replayed starts.
- Start Antigravity's next work timer at the observed handoff instead of the prompt's earlier queue submission time.
- Accept a genuine new turn that starts in the same millisecond as the previous completion, while rejecting older snapshots of that completed turn.

## 0.19.1 — A clearer introduction to Agent Pet

- Refresh the English and Turkish product pages with a shorter introduction, visual demo, key features and three-step setup.
- Present Codex, Claude Code and Google Antigravity together; keep integration details and troubleshooting in the user guide.
- Highlight built-in companions and custom pets, and generate the Marketplace README from the same source as GitHub.

## 0.19.0 — Add your own custom pets

- Add a local custom pet library with native English/Türkçe import and editing screens.
- Accept one required normal PNG and optional running, waiting, happy and sleeping poses, with normal-pose fallback and status badges.
- Preview poses and customize each pet's name, size, horizontal flip and gentle movement; respect macOS Reduce Motion.
- Keep imported images and choices across restarts and extension updates; validate files and save complete revisions atomically.
- Add **Agent Pet: Add Custom Pet**, custom choices in **Choose Pet**, and confirmed deletion from the pet editor.
- Verify import, editing, cancellation, persistence, fallback and deletion in an isolated native test library.

## 0.18.0 — Follow Google Antigravity in VS Code

- Follow the official Google Antigravity VS Code extension’s local conversation summary stream without hooks, account keys or a bridge installation.
- Add Antigravity labels, workspace matching, exact conversation navigation, waiting time, notifications and next-waiting-chat support.
- Handle all initial summary batches, deletions, reconnects, token rotation and workspace changes; keep old running records unconfirmed until fresh activity arrives.
- Exclude archived, cloud, foreign-workspace and nested subagent records; preserve parent completion against delayed updates.
- Distinguish background work from a fully idle agent, and withdraw active evidence when the local backend is unavailable.
- Include Antigravity in setup and diagnostics. This adapter covers the official VS Code extension; standalone app, IDE, CLI and remote backends are outside its scope.

## 0.17.0 — Explain status and follow waiting chats

- Explain each chat's recorded status in its tooltip and context menu, with distinct labels for reconnecting, unreadable records, disconnected windows and disabled tracking.
- Show reply-waiting time separately from turn duration, using the oldest unanswered request across partial replies and reconnects.
- Add Ctrl + Option + Cmd + N and a menu action to cycle through reachable chats needing a reply, oldest first and within the selected workspace.
- Keep async questions eligible while their agents continue working; preserve notification deduplication independently of waiting time.

- Preserve completed, interrupted and failed Claude chats when late subagent or background tool results arrive.
- Require results to match outstanding foreground calls; ignore duplicate and previous-turn results while preserving blocking-question replies.
- Publish a newer start when the parent really resumes after a subagent hand-back, so the panel and elapsed time follow that work.
- Ignore older lifecycle records and keep activity timestamps from moving backwards.
- Add regression coverage for subagent hand-backs, reload, nested subagent activity, delayed events and unmatched results.

## 0.16.6 — Make terminal support easier to find

- Highlight VS Code integrated-terminal support in the README introduction and a dedicated section.
- Explain terminal labels, click-to-terminal navigation and row lifetime in English and Turkish.
- Publish the refreshed Marketplace README under a new patch version.

## 0.16.5 — Follow agents in the integrated terminal

- Show Claude Code and Codex CLI chats started in a VS Code integrated terminal, labeled Claude Code · Terminal / Codex · Terminal.
- Attach each chat to its window from the terminal’s process tree, not from a guessed folder; chats from other terminal apps stay hidden.
- Click a terminal chat to bring its window forward and reveal the terminal running it.
- Keep the row while its terminal stays open, even after the CLI exits; closing the terminal removes it.
- Reject a reused process ID left behind by a crashed Claude session.

## 0.16.4 — Follow Claude plugin progress

- Confirm unfinished Claude plugin/tool calls from matching progress events after reconnecting to their logs.
- Process tool results even when marked as metadata, including answers to blocking questions.
- Keep tool-call messages running when accompanied by a contradictory completion stop reason.
- Ignore unrelated, foreign-session and sidechain progress; late background updates cannot restart a finished or interrupted turn.
- Add synthetic regression coverage for plugin calls, reasoning, results, reload and completion.

## 0.16.3 — Show work and open questions separately

- Keep the running spinner and count when Codex asks a non-blocking question while continuing to work.
- Show Running · question pending / Çalışıyor · açık soru var, even with optional status labels off.
- Reserve waiting status for blocking questions and finished turns with unanswered questions.
- Keep pending questions in the attention filter and deduplicate their alerts across turn completion.
- Preserve partial replies, reload confirmation, interruption and legacy-client compatibility.

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
