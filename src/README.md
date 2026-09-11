<div align="center">

# Agent Pet

**Your coding agents, at a glance.**

A desktop pet that shows what's running, what's finished, and which chat needs you.

![macOS 26+](https://img.shields.io/badge/macOS-26%2B-111827?style=flat-square&logo=apple)
![Apple Silicon](https://img.shields.io/badge/Apple_Silicon-only-64748b?style=flat-square)
![Codex support](https://img.shields.io/badge/Supports-Codex_in_VS_Code-16865d?style=flat-square)
![Beta](https://img.shields.io/badge/Status-beta-d97706?style=flat-square)

**[Download for macOS](https://github.com/merttalhayener/agent-pet/releases/tag/v0.5.2)** · [Türkçe](https://github.com/merttalhayener/agent-pet/blob/main/README.tr.md) · [Changelog](https://github.com/merttalhayener/agent-pet/blob/main/CHANGELOG.md)

<img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/images/desktop.png" alt="Agent Pet showing a running chat and a completed chat" width="420">

</div>

## One pet. All your tracked chats.

Keep working in another app while Agent Pet follows your local conversations. Click a chat to return to it in VS Code. Finished chats stay until you dismiss them.

| See the state | Make it yours | Stay focused |
| --- | --- | --- |
| 🔵 Running · ✅ Done · 🟡 Needs a reply | Choose a pet, resize it, adjust text and opacity | Collapse the list or pin important chats |
| Elapsed time for each turn | Move freely or snap to a screen edge | Completion animation and optional sound |

<table>
<tr>
<td align="center" width="50%"><strong>Small when you need space</strong><br><br><img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/images/compact.png" alt="Compact pet with an activity count" width="210"></td>
<td align="center" width="50%"><strong>Know when a chat needs you</strong><br><br><img src="https://raw.githubusercontent.com/merttalhayener/agent-pet/main/docs/images/waiting.png" alt="Yellow indicator on a chat waiting for a reply" width="350"></td>
</tr>
</table>

**Presenting or sharing your screen?** Press **Ctrl + Option + Cmd + P** to hide the pet and mute feedback. Press it again to restore, or use the menu bar paw icon.

## What is supported?

| | Available now |
| --- | --- |
| **Operating system** | macOS 26+ on Apple Silicon |
| **Agent** | Codex in VS Code |
| **Other agents / platforms** | Not supported yet |

The current interface is Turkish. VS Code must remain running for live updates. Agent Pet is an independent community project.

## Get started

1. Install the official **Codex** extension in VS Code and sign in.
2. [Download **agent-pet-0.5.2.vsix**](https://github.com/merttalhayener/agent-pet/releases/download/v0.5.2/agent-pet-0.5.2.vsix).
3. In VS Code: **Extensions → ⋯ → Install from VSIX…** → select the file.
4. Run **Agent Pet: Show Desktop Pet** from the Command Palette.

**Click a row** to open a chat. **Drag the pet** to move it. **Drag ↗↙** to resize. **Right-click** for settings. Use the list's chevron to collapse or expand.

Upgrading from an older version? Reload VS Code once to remove the old sidebar **Pet** section. Your desktop pet preferences are kept.

<details>
<summary><strong>Beta notes & local data</strong></summary>

- Tracks recent local conversations in the open workspace, not every open tab or cloud-only chat.
- Pending questions are detected from local records; some permission dialogs cannot be detected.
- No telemetry is added and no chat records are sent to a server by this extension. Pet artwork comes from your installed Codex extension.
- Developer ID signing/notarization and a general open-source license are not yet provided.

</details>

**[Build & technical details](https://github.com/merttalhayener/agent-pet/blob/main/docs/development.md)** · **[Report an issue](https://github.com/merttalhayener/agent-pet/issues)**
