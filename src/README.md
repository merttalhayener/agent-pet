<!-- Generated from ../README.md by scripts/sync-readme.cjs. Edit README.md instead. -->
<div align="center">

# Agent Pet

**Every agent, every window, one glance.**

Codex in one project, Claude Code in three others, each in its own VS Code window.<br>
One floating panel shows every chat’s status—click one and its window comes to the front.

[![Marketplace version](https://img.shields.io/visual-studio-marketplace/v/merttalhayener.agent-pet?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/merttalhayener.agent-pet)](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/merttalhayener/agent-pet/blob/main/LICENSE)

[**Install from the Marketplace**](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet) · [Türkçe](https://github.com/merttalhayener/agent-pet/blob/main/README.tr.md) · [Changelog](https://github.com/merttalhayener/agent-pet/blob/main/CHANGELOG.md)

<sub>**Requires** macOS 26+ on Apple Silicon · Codex and/or Claude Code running inside VS Code · English / Türkçe</sub>

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/workspaces.gif" alt="A flat list of Codex and Claude Code chats becomes workspace groups, then the Mobile App group collapses" width="720">

</div>

Once you are running more than two agents at once, the hard part stops being the code and starts being the bookkeeping: which window was that refactor in, is it still working or has it been waiting on you for ten minutes, and did the one in the other project ever finish. Agent Pet puts that in a single list that floats above everything else.

## Every window in one place

Every chat from every connected VS Code window lands in the same list, whether it is Codex or Claude Code. Click **▤** in the panel header to group them by workspace, and click a group header to fold the projects you are not watching. A multi-root workspace file counts as one group.

**Click any chat and its window comes to the front.** Codex extension chats open in their own window; Claude extension chats open in that window’s right sidebar. If a Claude chat still has an unsaved turn in an existing tab, finish it and close the tab before clicking again.

**VS Code integrated terminals are supported too.** Run Codex CLI or Claude Code in an integrated terminal and its chat appears with a **Terminal** label. Clicking the row reveals the terminal running it. Ownership follows the terminal’s process tree; the row stays while that terminal is open, even after the CLI exits.

Extension chats are matched to workspaces by folder, which is a good guess rather than a certainty. When it guesses wrong, right-click a chat → **Assign workspace** to pin it to the right group and destination window; **Automatic** hands the decision back.

## Know which chat needs you

Each chat carries its own status and elapsed time, and moves from **running → waiting for your reply → completed**.

Codex can ask a question without stopping work. That chat stays **running** with its spinner and timer, marked **Running · question pending**, so an open question never looks like a finished task. A blocking question—or a finished turn with a question still unanswered—becomes **Waiting for your reply**.

Turn on **Appearance → Status labels** and the icons get words: **Stopped** for a turn you interrupted, **Idle** for one with no recorded finish, and **No update** when activity cannot currently be confirmed. **No update** means *unknown*, not *done*—only an explicit completion record produces a checkmark.

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/status.gif" alt="A Codex chat changes from a spinning progress indicator to waiting, then a completion checkmark" width="600">

## Keep an eye on it without watching it

- **Menu bar counter:** running and waiting totals sit next to the paw in the macOS menu bar, even with the panel hidden. Filters never change these totals.
- **Waiting notifications:** off until you turn them on under **Notifications**. Click a banner to jump to that chat; right-click a chat to mute just that one. Alerts fire on newly detected requests, not on every log line, and reconnecting does not re-announce old ones.
- **Filters:** show all chats, only running ones, or only those waiting for you—and narrow to a single workspace.
- **Before you share your screen:** **Ctrl + Option + Cmd + P** hides the whole thing, and brings it back the same way.

## Nothing to configure

Codex and Claude Code already write session records on your Mac. Agent Pet reads those. There are no API keys, no hooks, no wrapper commands and no separate account—install it, and the chats you already have show up.

It reads lifecycle events only: when a turn started, finished, was interrupted, or began waiting. Transcript text is never displayed, stored or sent anywhere, and no chat data leaves your Mac.

Updates try not to interrupt you either. The desktop helper replaces its own process without reloading VS Code, and any window that does need a reload waits until its tracked chats have finished, your editors are saved, and no task or debug session is running—then counts down fifteen seconds with a **Later** button. Set `codexPet.autoReloadAfterUpdate` to `false` to reload by hand instead.

## What it can’t see

Being clear about the edges is easier than explaining a mystery later:

- **Agents outside VS Code.** Codex or Claude Code running in another terminal app, or in the cloud, are not tracked. CLI support covers VS Code’s integrated terminal.
- **Windows without the extension.** Every VS Code window you want tracked needs Agent Pet installed and enabled in that profile.
- **Failures that leave no trace.** If a backend dies without recording an event, the chat keeps its last known status. Silence alone never changes a status—which is why **No update** exists instead of a guess.
- **Some permission dialogs.** A few agent prompts are not recorded, so they cannot raise a notification.

**Connections & diagnostics**, in the paw menu or via **Agent Pet: Connections**, shows exactly which windows are currently talking to the panel.

## Optional: pick a companion

The panel works on its own—choose **Hide pet** and the chat list carries on without a character. **Hide panel** does the reverse, leaving only the pet; **Hide all** hides both.

If you do want one, **Byte** the robot, **Miso** the cat, and **Fern** the sprout are three original, animated characters. Choose one from **Pets**.

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/images/characters.png" alt="Byte the robot, Miso the cat and Fern the sprout, original Agent Pet characters" width="720">

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/panel-only.gif" alt="The pet disappears while its chat panel stays visible, then the pet returns" width="600">

*Animations use sample conversations rendered by the app.*

## Install

1. Install **Codex**, **Claude Code**, or both as VS Code extensions or CLIs, and sign in. For CLI chats, start the agent in VS Code’s integrated terminal.
2. Install [Agent Pet from the Marketplace](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet), or search `@id:merttalhayener.agent-pet` in Extensions.
3. The **Get Started** guide opens by itself the first time. It checks your agents, opens the panel, and offers to request notification permission. Reopen it anytime with **Agent Pet: Get Started**.

The macOS app ships inside the extension, so there is nothing to install separately and new versions arrive through VS Code’s normal extension updates. VS Code must stay open for live status.

Already running the GitHub preview? See [Install, update & remove](https://github.com/merttalhayener/agent-pet/blob/main/docs/usage.md#install-update--remove) for the one-time migration.

## Quick controls

Right-click the pet or the panel for everything below; the paw in the macOS menu bar has the same menu when the pet is hidden. Your preferences survive restart.

| Want to… | Do this |
| --- | --- |
| Group chats by workspace | Click **▤**, or **Appearance → Extended · Workspaces** |
| Jump to a chat’s window | Click the chat |
| Fix a chat filed under the wrong project | Right-click → **Assign workspace** |
| See what the icons mean | **Appearance → Status labels** |
| Move / resize | Drag the pet or panel header / drag the top-right handle |
| Hide the character | **Hide pet** (restore with **Show pet**) |
| Hide or restore the chat list | **Hide panel / Show panel** |
| Hide everything (screen sharing) | **Ctrl + Option + Cmd + P**, or **Hide all / Show all** |
| Get the panel back | **Agent Pet** in VS Code’s status bar |
| Change language | **Language → English / Türkçe** |

## Privacy & support

No added telemetry; chat records stay on your Mac. Marketplace downloads and update checks are managed by VS Code. Waiting notifications require macOS permission.

If something goes wrong, open **Connections & diagnostics** from the paw menu or Command Palette. It lists the connected windows and copies a report to your clipboard—without chat text, titles, project names or file paths. Nothing is sent anywhere; you decide where the report goes.

[Usage & troubleshooting](https://github.com/merttalhayener/agent-pet/blob/main/docs/usage.md) · [Build & technical details](https://github.com/merttalhayener/agent-pet/blob/main/docs/development.md) · [Report an issue](https://github.com/merttalhayener/agent-pet/issues)

## License

Original source code, Byte, Miso, Fern, and the application icon are [MIT licensed](https://github.com/merttalhayener/agent-pet/blob/main/LICENSE). No external character artwork is loaded or bundled. Codex and Claude Code names identify supported integrations; Agent Pet is an independent community project.
