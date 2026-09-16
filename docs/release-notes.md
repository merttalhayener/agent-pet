# Agent Pet v0.16.3 — Show work and open questions separately

Codex can ask a question and keep working. Agent Pet previously treated every unanswered question as a paused chat, incorrectly showing **0 running · 1 waiting**.

These chats now keep the running spinner and count, with **Running · question pending** / **Çalışıyor · açık soru var** beneath the title. Blocking questions and finished turns with unanswered questions still show **Waiting for your reply**.

The attention filter includes open questions during work. Optional notifications still announce a new question, without repeating it when the same turn finishes. Partial replies and reload safeguards are preserved.

After updating, finish active work and reload existing VS Code windows so they publish the separate question state. The new helper cannot infer it from older snapshots.

Apple Silicon · macOS 26+ · English / Türkçe · Regular release.

Marketplace upload of `agent-pet-marketplace-0.16.3-darwin-arm64.vsix` is pending.

Validation: Node regression tests for asynchronous/blocking questions, partial replies, completion, cancellation and reload; native label/counter/filter/notification tests and a rendered sample panel; VSIX version, platform and signature checks.
