Agent Pet 0.7.0 adds **Claude Code in VS Code** alongside Codex.

- Both agents appear in one list, with provider labels and direct links to their sessions.
- Claude question/plan prompts, explicit completion, and interrupted turns have independent status.
- Codex is now optional. An original vector robot is included for Claude-only installations; Codex characters remain available when Codex is installed.
- Retained chats are rechecked after restart so an older completion record replaces a stuck `?` indicator.

Claude support currently covers local VS Code sessions, not CLI-only or cloud-only sessions. Missing activity or missing completion records still show **No update**, never a guessed completion. The adapter was checked against Claude Code 2.1.268's local format and URI handler; future changes may need compatibility updates.

No hooks or API keys need configuring. Install the VSIX and run **Agent Pet: Show Desktop Pet**. Requires Apple Silicon and macOS 26+.
