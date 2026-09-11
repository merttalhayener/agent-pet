Agent Pet 0.5.3 fixes misleading running indicators after a VS Code reload and makes the pet easier to reopen.

- Reattached chats wait for fresh activity. After 60 seconds without progress, the spinner becomes **Güncelleme yok**; only explicit completion records produce a checkmark.
- Closing the pet keeps the macOS menu bar paw and global shortcut available. The **Agent Pet** button in VS Code's status bar can also reopen or relaunch it.
- Reopening preserves individually dismissed chats.

The pet follows local activity; it cannot verify chat UI delivery. Quiet long-running tools can show “no update.”

Install the attached VSIX. The VS Code status bar addition becomes available after the window loads the updated extension; wait for active conversations to finish before reloading.

Requires Apple Silicon, macOS 26+, and Codex in VS Code.
