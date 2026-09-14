<div align="center">

# Agent Pet

**Your coding chats, at a glance.**

A floating desktop companion for **Codex and Claude Code in VS Code**.<br>
See what’s running, finished, or waiting for you—even while using another app.

**macOS 26+ · Apple Silicon · English / Türkçe**

[**Download**](https://github.com/merttalhayener/agent-pet/releases) · [Türkçe](https://github.com/merttalhayener/agent-pet/blob/main/README.tr.md) · [Changelog](https://github.com/merttalhayener/agent-pet/blob/main/CHANGELOG.md)

</div>

## See when a chat needs you

Watch a chat move from **running → waiting for your reply → completed**. Each conversation keeps its own status and elapsed time.

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/status.gif" alt="A Codex chat changes from a spinning progress indicator to waiting, then a completion checkmark" width="600">

## Keep projects separate

Click **▤** to group chats by workspace. Fold a group to make room; click a chat to return to its VS Code window.

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/workspaces.gif" alt="A flat chat list becomes workspace groups, then the Mobile App group collapses" width="600">

## Keep the panel, hide the pet

Choose **Hide pet** for fewer distractions. Your chats stay visible; **Show pet** brings the character back. **Hide panel** hides only the chat list, leaving the pet visible. **Hide all** hides both. **Appearance → Panel only** controls the same character preference.

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/panel-only.gif" alt="The pet disappears while its chat panel stays visible, then the pet returns" width="600">

*Animations use sample conversations rendered by the app.*

Supports **local VS Code sessions**. CLI-only and cloud-only sessions are not supported. VS Code must stay open for live updates. No API keys or hooks to configure.

## Stay focused

- **Filters:** show all chats, running chats, or those waiting for you; narrow to one workspace.
- **Workspace overrides:** right-click a chat → **Assign workspace** to choose its group and destination window.
- **Clear statuses:** optional text explains the icons, including **Stopped** and **No update**.
- **Waiting notifications:** opt in under **Notifications**; click a macOS banner to return to the chat. Mute individual chats.
- **Menu bar counter:** see running and waiting totals even with the panel hidden.
- **Updates:** Marketplace installations use VS Code’s extension updates. **Check for updates…** opens the extension’s store entry.

## Install

Install **Agent Pet** by **merttalhayener** from VS Code’s Extensions view. Available for **Apple Silicon Macs running macOS 26 or later**.

1. Install **Codex**, **Claude Code**, or both in VS Code and sign in.
2. Open Extensions, search `@id:merttalhayener.agent-pet`, and install Agent Pet.
3. Run **Agent Pet: Show Desktop Pet** from the Command Palette.

**Coming from the GitHub preview?** Choose **Replace preview**, let active chats finish, then run **Developer: Reload Window** in each VS Code window. Pet preferences are kept. The older `local.codex-pet-panel` and new Marketplace extension have different identities, so this is a one-time migration.

Subsequent Marketplace updates use VS Code’s update settings. The running desktop helper switches to newly installed versions without interrupting chats, preserving visibility preferences. Upgrading from 0.11.3 or earlier requires one window reload to enable this mechanism. Agent Pet can reload each window after tracked chats finish and changes are saved, with a 15-second **Later** option. Disable this with `codexPet.autoReloadAfterUpdate` if you prefer manual reloads.

## Quick controls

| Want to… | Do this |
| --- | --- |
| Hide the character | **Hide pet** (restore with **Show pet**) |
| Group chats | Click **▤**, or **Appearance → Extended · Workspaces** |
| Move / resize | Drag the pet or panel header / drag the top-right handle |
| Hide or restore the chat list | **Hide panel / Show panel** |
| Hide or restore everything | **Hide all / Show all**, or **Ctrl + Option + Cmd + P** |
| Reopen / change language | VS Code’s **Agent Pet** button / **Language** menu |

Right-click the pet or panel for settings. Your preferences are remembered.

Independent community project. No added telemetry; chat records stay local. Marketplace downloads and update checks are managed by VS Code. Waiting notifications require macOS permission.

[Usage & troubleshooting](https://github.com/merttalhayener/agent-pet/blob/main/docs/usage.md) · [Build & technical details](https://github.com/merttalhayener/agent-pet/blob/main/docs/development.md) · [Report an issue](https://github.com/merttalhayener/agent-pet/issues)

## License

Original source code and the built-in vector robot are [MIT licensed](https://github.com/merttalhayener/agent-pet/blob/main/LICENSE). Optional artwork loaded from an installed Codex extension is not bundled or relicensed; see [third-party notices](https://github.com/merttalhayener/agent-pet/blob/main/src/THIRD-PARTY-NOTICES.md).
