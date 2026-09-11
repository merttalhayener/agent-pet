# Development and reference

[Back to Agent Pet](../README.md)

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

The package is written to `artifacts/agent-pet-0.5.2.vsix`. The Swift executable and generated artifacts are excluded from Git; the native executable is included in the VSIX.

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

## Upgrade compatibility

Agent Pet was previously called Codex Pet Panel. The internal VS Code extension ID (`local.codex-pet-panel`), command IDs, and preference keys are retained so existing installations update in place and keep their settings. New download packages use the `agent-pet` name.

## Project layout

| File | Purpose |
| --- | --- |
| `src/native/DesktopPet.swift` | Floating panel, drawing, menus, shortcuts, and preferences |
| `src/extension.cjs` | VS Code integration and desktop commands |
| `src/activity.cjs` | Local chat lifecycle and question tracking |
| `src/desktop.cjs` | Helper launch and local snapshot bridge |
| `scripts/build-native.py` | Native helper compilation |
| `build.py` | VSIX packaging |
| `test/` | Lifecycle and native UI regression tests |

## Feedback and licensing

Please open an issue with your macOS, VS Code, and Codex extension versions, the expected behavior, and steps to reproduce. Use sample conversation names in screenshots and avoid posting session transcripts or credentials.

The package currently declares `UNLICENSED`; no open-source license has been selected. Publishing the source does not grant a general license to reuse the code. The external pet artwork is not licensed by this repository.

## Desktop-only extension

Version 0.5.2 removes the former sidebar webview and its contributed views. `codexPet.open` is retained as an alias for opening the desktop helper. Existing installations need one VS Code window reload to unload their old extension host. The desktop helper and saved preferences are retained.
