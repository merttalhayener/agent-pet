Agent Pet 0.8.1 fixes **chat clicks opening the wrong VS Code window**.

- Codex and Claude links now include the window identity supplied by VS Code.
- Each workspace group targets its own live window.
- Missing window routes show a workspace hint instead of falling back to another window.

Verified with two real VS Code windows in A → B → A order, 23 automated tests, and native dashboard routing checks.

After installing, wait for active turns to finish and run **Developer: Reload Window** in **each open VS Code window** so every workspace publishes its new links.

Requires Apple Silicon and macOS 26+.
