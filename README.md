# Codex Pet Panel

A floating desktop companion for your Codex conversations in VS Code. One pet, a live chat list, and a quick way to jump back into the conversation that needs you.

[Türkçe](README.tr.md) · [Changelog](CHANGELOG.md)

<img src="docs/images/desktop.png" alt="A floating pet above two sample conversations, with running and completed indicators" width="380">

**Beta · Apple Silicon · macOS 26+ · VS Code + Codex required**

This is an independent community extension, not an official OpenAI or Microsoft product. The current interface is in Turkish.

## Install

1. Install the official **Codex** extension (`openai.chatgpt`) in VS Code and sign in to Codex.
2. Download `codex-pet-panel-0.5.0.vsix` from the **[Releases](https://github.com/merttalhayener/codex-pet-panel/releases)** page.
3. In VS Code, open **Extensions → ⋯ → Install from VSIX…** and select the file.
4. Reload VS Code if prompted, open your project, and run **Codex Pet: Show Desktop Pet** from the Command Palette.

Alternatively, with the VS Code `code` command on your PATH:

```sh
code --install-extension codex-pet-panel-0.5.0.vsix
```

The floating helper stays visible when VS Code is in the background. VS Code must remain running to supply live chat updates.

## Features

- **One pet, multiple chats.** Each tracked conversation has its own status: blue spinner for running, green check for completed, yellow indicator for a pending question.
- **Click to open a chat.** Clicking a row opens that conversation in VS Code.
- **Completed chats stay.** Remove a row with its hover × button. A later task in that conversation brings it back and keeps it visible after completion.
- **Elapsed time.** Turn duration updates while work is running and freezes on completion.
- **Completion feedback.** A short celebration and title banner when a chat finishes; optional sound, disabled by default.
- **Compact mode.** Collapse the list to a pet and activity count with the header chevron.
- **Pin conversations.** Right-click a row and choose **Sohbeti sabitle**.
- **Resize and customize.** Drag the diagonal double arrow to scale the panel. The **Görünüm** menu changes pet size, text size, and list opacity independently.
- **Edge snapping.** Drag near a screen edge to align; toggle with **Kenarlara hizala**. Bottom corners remain stable as the list changes.
- **Presentation mode.** Hide the pet and mute completion feedback without stopping tracking.
- **Remembered preferences.** Position, scale, appearance, pins, collapsed state, and sound preferences persist.

## Controls

| Action | Control |
| --- | --- |
| Open a conversation | Click its row |
| Move the panel | Drag the pet or list background |
| Resize the panel | Drag the top-right diagonal double arrow |
| Collapse / expand | Click the list header chevron |
| Character, appearance, sound, pinning | Right-click the pet or a conversation |
| Hide / show and mute / unmute feedback | **Control + Option + Command + P** |
| Restore a hidden panel | Same shortcut, or the paw icon in the macOS menu bar |
| Reopen after closing the helper | **Codex Pet: Show Desktop Pet** in VS Code |

If another app owns the global shortcut, use the paw menu; its tooltip reports the conflict. Closing the helper fully also unregisters the shortcut.

<img src="docs/images/compact.png" alt="Compact mode showing just the pet and chat count" width="220">

## Requirements and current limits

- The release helper is built for **Apple Silicon and macOS 26 or later**. Windows, Linux, and Intel Mac desktop helpers are not included.
- VS Code **1.96.2+** is declared by the extension manifest. The integration was tested with Codex extension **26.908.31748**; it relies on that extension's current sprite layout, conversation links, and local session format.
- Chat discovery follows recent local Codex activity in the open VS Code workspace. It is not a complete list of open tabs or cloud-only conversations; subagents are excluded.
- The yellow indicator follows recorded `request_user_input` and `request_user_input_async` calls and their replies. Some permission dialogs are not recorded, so this is **not a complete approval monitor**.
- A missing update produces an unknown status, never a false completion. Older retained chats without a recoverable start time show a dash instead of a duration.
- This beta has been tested on the development Mac. Broader device compatibility and Developer ID signing/notarization are not yet provided.

## Local data and assets

The extension reads local Codex session records and the local thread index, then exchanges chat IDs, titles, timestamps, and statuses with its helper. It does not send these records to a server. The project adds no telemetry or network-based tracking.

Pet artwork is loaded from the user's installed Codex extension. **Sprite sheets are not bundled in the source repository or VSIX.** Documentation screenshots use sample conversations. Artwork and product names remain associated with their respective owners.

## Build from source

On an Apple Silicon Mac, install Python 3, Node.js, and Xcode Command Line Tools with a macOS 26 SDK. Clone this repository, then run:

```sh
python3 scripts/build-native.py
python3 build.py
```

The package is written to `artifacts/codex-pet-panel-0.5.0.vsix`. The Swift executable and generated artifacts are excluded from Git; the native executable is included in the VSIX.

Run the activity monitor tests:

```sh
node --test test/activity.test.cjs
```

Run the native UI tests in a logged-in macOS desktop session with Codex installed:

```sh
node test/native-dashboard.cjs
node test/native-dashboard.cjs --overflow
```

Set `CODEX_PET_ASSET_DIR` if Codex's `webview/assets` directory is in a nonstandard location. Native tests use temporary sample chats under `artifacts/` and do not modify pet preferences. The optional `--hotkey` test briefly registers the global shortcut; close the regular helper first to avoid a conflict.

## Project layout

| File | Purpose |
| --- | --- |
| `src/native/DesktopPet.swift` | Floating panel, drawing, menus, shortcuts, and preferences |
| `src/extension.cjs` | VS Code integration and sidebar |
| `src/activity.cjs` | Local chat lifecycle and question tracking |
| `src/desktop.cjs` | Helper launch and local snapshot bridge |
| `src/media/` | Sidebar HTML, CSS, and JavaScript |
| `scripts/build-native.py` | Native helper compilation |
| `build.py` | VSIX packaging |
| `test/` | Lifecycle and native UI regression tests |

## Feedback and licensing

Please open an issue with your macOS, VS Code, and Codex extension versions, the expected behavior, and steps to reproduce. Use sample conversation names in screenshots and avoid posting session transcripts or credentials.

The package currently declares `UNLICENSED`; no open-source license has been selected. Publishing the source does not grant a general license to reuse the code. The external pet artwork is not licensed by this repository.
