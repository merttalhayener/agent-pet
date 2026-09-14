# Agent Pet v0.10.1 — Clearer quiet activity

- Distinguish quiet ongoing turns from disconnected/unconfirmed sessions with a clock and No recent activity label.
- Restore the spinner on new progress; keep the reload safeguards and explicit completion checks.
- Preserve terminal states against older or uncertain reports from other VS Code windows.
- Use this patch release to exercise the 0.10.0 in-app updater.

From v0.10.0, choose **Check for updates… → Install update** in the paw menu. After active chats finish, run **Developer: Reload Window** in each open VS Code window. This release does not reload active windows automatically.

A clock means no recent activity has been recorded; a question mark means the connection or activity is unconfirmed. Neither means the task completed.

Apple Silicon · macOS 26+ · English / Türkçe · Beta.
