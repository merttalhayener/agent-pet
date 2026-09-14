<div align="center">

# Agent Pet

**Your coding chats, at a glance.**

A floating desktop companion for **Codex and Claude Code in VS Code**.<br>
See what’s running, finished, or waiting for you—even while using another app.

**macOS 26+ · Apple Silicon · English / Türkçe · Beta**

[**Download**](https://github.com/merttalhayener/agent-pet/releases/tag/v0.9.1) · [Türkçe](https://github.com/merttalhayener/agent-pet/blob/main/README.tr.md) · [Changelog](https://github.com/merttalhayener/agent-pet/blob/main/CHANGELOG.md)

</div>

## See when a chat needs you

Watch a chat move from **running → waiting for your reply → completed**. Each conversation keeps its own status and elapsed time.

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/status.gif" alt="A Codex chat changes from a spinning progress indicator to waiting, then a completion checkmark" width="600">

## Keep projects separate

Click **▤** to group chats by workspace. Fold a group to make room; click a chat to return to its VS Code window.

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/workspaces.gif" alt="A flat chat list becomes workspace groups, then the Mobile App group collapses" width="600">

## Keep the panel, hide the pet

Choose **Appearance → Panel only** for fewer distractions. Your chats stay visible, and the same option brings the character back.

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/media/panel-only.gif" alt="The pet disappears while its chat panel stays visible, then the pet returns" width="600">

*Animations use sample conversations rendered by the app.*

Supports **local VS Code sessions**. CLI-only and cloud-only sessions are not supported. VS Code must stay open for live updates. No API keys or hooks to configure.

## Install

1. Install **Codex**, **Claude Code**, or both in VS Code and sign in.
2. [Download the VSIX](https://github.com/merttalhayener/agent-pet/releases/download/v0.9.1/agent-pet-0.9.1.vsix), then use **Extensions → ⋯ → Install from VSIX…**.
3. Run **Agent Pet: Show Desktop Pet** from the Command Palette.

Upgrading? After active turns finish, run **Developer: Reload Window** in each open VS Code window.

## Quick controls

| Want to… | Do this |
| --- | --- |
| Hide the character | **Appearance → Panel only** |
| Group chats | Click **▤**, or **Appearance → Extended · Workspaces** |
| Move / resize | Drag the pet or panel header / drag the top-right handle |
| Hide or restore everything | **Ctrl + Option + Cmd + P**, or the menu bar paw |
| Reopen / change language | VS Code’s **Agent Pet** button / **Language** menu |

Right-click the pet or panel for settings. Your preferences are remembered.

Independent community project. No added telemetry; chat records stay local.

[Usage & troubleshooting](https://github.com/merttalhayener/agent-pet/blob/main/docs/usage.md) · [Build & technical details](https://github.com/merttalhayener/agent-pet/blob/main/docs/development.md) · [Report an issue](https://github.com/merttalhayener/agent-pet/issues)
