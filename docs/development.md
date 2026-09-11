# Development and reference

[Back to Agent Pet](../README.md)

## Requirements and current limits

- The release helper is built for **Apple Silicon and macOS 26 or later**. Windows, Linux, and Intel Mac desktop helpers are not included.
- VS Code **1.96.2+** is declared by the extension manifest. The integration was tested with Codex extension **26.908.31748**; it relies on that extension's current sprite layout, conversation links, and local session format.
- Chat discovery follows recent local Codex and Claude Code activity in the open VS Code workspace. It is not a complete list of open tabs or cloud-only conversations; subagents are excluded.
- The yellow indicator follows recorded `request_user_input` and `request_user_input_async` calls and their replies. Some permission dialogs are not recorded, so this is **not a complete approval monitor**.
- A missing update produces an unknown status, never a false completion. Older retained chats without a recoverable start time show a dash instead of a duration.
- This beta has been tested on the development Mac. Broader device compatibility and Developer ID signing/notarization are not yet provided.

## Local data and assets

The extension reads local Codex and Claude Code session records and the local thread index, then exchanges chat IDs, titles, timestamps, and statuses with its helper. It does not send these records to a server. The project adds no telemetry or network-based tracking.

An original vector robot is drawn directly by the native helper and works without other extensions. Additional pet artwork is loaded from the user's installed Codex extension. **Sprite sheets are not bundled in the source repository or VSIX.** Documentation screenshots use sample conversations. Artwork and product names remain associated with their respective owners.

## Build from source

On an Apple Silicon Mac, install Python 3, Node.js, and Xcode Command Line Tools with a macOS 26 SDK. Clone this repository, then run:

```sh
python3 scripts/build-native.py
python3 build.py
```

The package is written to `artifacts/agent-pet-0.8.1.vsix`. The Swift executable and generated artifacts are excluded from Git; the native executable is included in the VSIX.

Run the activity monitor tests:

```sh
node --test test/activity.test.cjs test/claude-activity.test.cjs test/extension.test.cjs
```

Run the native UI tests in a logged-in macOS desktop session with Codex installed:

```sh
node test/native-dashboard.cjs --mixed
node test/native-dashboard.cjs --builtin --mixed
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
| `src/activity.cjs` | Codex lifecycle and question tracking |
| `src/claude-activity.cjs` | Claude Code transcript adapter |
| `src/agent-activity.cjs` | Combined status and retained conversation reconciliation |
| `src/desktop.cjs` | Helper launch and local snapshot bridge |
| `scripts/build-native.py` | Native helper compilation |
| `build.py` | VSIX packaging |
| `test/` | Lifecycle and native UI regression tests |

## Feedback and licensing

Please open an issue with your macOS, VS Code, and Codex extension versions, the expected behavior, and steps to reproduce. Use sample conversation names in screenshots and avoid posting session transcripts or credentials.

The package currently declares `UNLICENSED`; no open-source license has been selected. Publishing the source does not grant a general license to reuse the code. The external pet artwork is not licensed by this repository.

## Desktop-only extension

Version 0.5.2 removes the former sidebar webview and its contributed views. `codexPet.open` is retained as an alias for opening the desktop helper. Existing installations need one VS Code window reload to unload their old extension host. The desktop helper and saved preferences are retained.

## Reload and liveness

Protocol 3 requires newly appended progress before a historical running turn is reported as live. Settings changes and user message records do not confirm agent progress. Running turns with no progress for 60 seconds become unknown; explicit terminal events are still authoritative. This is an activity signal, not a guarantee of backend health or chat UI delivery.

Closing the native panel hides it while retaining the menu bar entry and global shortcut. VS Code also provides a persistent status bar command to relaunch the helper. Showing the pet preserves individually dismissed rows.

## Interface languages

The native helper defaults to English independently of the macOS locale. `PetLanguage` contains the English/Turkish strings for menus, dashboard labels, durations, tooltips, and accessibility descriptions. The Language menu persists an `en` or `tr` preference in the existing native UserDefaults suite. Missing or invalid preferences fall back to English. Chat titles and character names are not translated. VS Code command labels and extension messages are English.

## Claude Code integration (0.8.0)

The adapter reads top-level UUID `.jsonl` files in `$CLAUDE_CONFIG_DIR/projects` (default `~/.claude/projects`). It includes `entrypoint: claude-vscode` records inside the open workspace, excludes sidechains and nested subagent logs, and uses explicit `end_turn` / `stop_sequence` records for completion. `AskUserQuestion` and `ExitPlanMode` tool calls remain waiting until their matching results arrive. A missing stop reason never means completion. No Claude hooks are installed. Clicking a Claude row sets `claudeCode.preferredLocation` to `sidebar`.

Claude thread IDs use a `claude:` namespace. Rows open `vscode://local.codex-pet-panel/claude?session=<uuid>`; Codex links are unchanged. The registered URI handler validates the session against tracked workspace chats and calls `claude-vscode.editor.open` with `programmatic: honor-preferred-location`. Claude prioritizes existing editor tabs: only a uniquely matched, settled, clean tab is closed after the session command confirms its identity. Running, unknown, dirty, or ambiguous tabs stay open; the user can close them after completion and click again. URI activation requires an extension-host reload after upgrading. The link handler and transcript shape were inspected in Claude Code VS Code **2.1.268**. This is an internal integration and may require updates if the extension changes. CLI-only and cloud-only sessions are excluded in this release. See [Claude Code's VS Code documentation](https://code.claude.com/docs/en/vs-code) for its session UI.

Protocol 4 adds the built-in pet and combined agent snapshots. The helper writes a small `tracked-threads.json` ID list so both monitors can recover older terminal records after restart, without adding unrelated historical chats. Candidate discovery is bounded to 128 recent files per provider. Missing or inaccessible records still remain unknown.

## Workspace grouping (0.8.0)

Each window includes a workspace descriptor in protocol 6 snapshots: a SHA-256 identity derived from the workspace-file URI (or sorted folder URIs) and the VS Code workspace display name. Multi-root workspaces stay together; equally named folders at different locations stay distinct. The native helper retains workspace metadata with each chat and preserves stable ownership when multiple windows report the same session. Status precedence remains independent of group ownership. Older snapshots remain readable and untagged chats appear under Other chats.

The extended list inserts collapsible group headers, scrolls up to 12 visible entries, and keeps chat opening/removal hit targets separate from headers. Compact mode keeps its existing ordering and eight-row limit. Grouping and folded workspace IDs persist in local preferences.

## Window navigation (0.8.1)

Protocol 7 snapshots carry Codex and Claude base URLs resolved by `vscode.env.asExternalUri` in the owning extension host. `Uri.toString(true)` preserves the query delimiters for the native URL parser. The helper chooses a fresh snapshot for the row’s workspace and preserves VS Code’s `windowId` when adding the validated session UUID. Window links are never stored with retained chats. An untagged row needs exactly one reporting window; missing routes show a prompt to open the workspace rather than falling back to a generic URL. Snapshot freshness uses the existing 15-second heartbeat timeout.

Claude’s URI handler accepts VS Code’s numeric windowId parameter while still rejecting duplicate or unrelated query arguments. Tested with two isolated VS Code windows in A → B → A order, plus native mismatched-workspace and missing-route tests. Reload all open workspace windows after installing this update.
