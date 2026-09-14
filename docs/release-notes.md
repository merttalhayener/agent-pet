# Agent Pet v0.16.0 — Setup, connections and diagnostics

A new support screen helps you set up Agent Pet and understand what is connected.

- **Get Started:** a short, dismissible guide to agent extensions, the desktop companion and optional waiting notifications.
- **Connections:** workspace/window heartbeats, tracking and chat counts, independent of chat completion status.
- **Diagnostics:** loaded extension, installed extension and running pet versions; notification permission, readable agent-record directories and recent helper/support error codes.
- **Copy diagnostics:** a local JSON report without chat text, project names, file paths or raw exception messages.

Open **Agent Pet: Get Started / Connections / Diagnostics** in the Command Palette, or **Connections & diagnostics** in the paw menu. English and Türkçe are supported.

After updating, finish active chats and reload existing VS Code windows to load the new commands and connection protocol. The desktop helper uses the existing automatic handover mechanism.

Apple Silicon · macOS 26+ · Regular release. Marketplace upload of `agent-pet-marketplace-0.16.0-darwin-arm64.vsix` is pending.

Validation: Node regression tests, native support routing and health checks, rendered webview interaction checks in English/Türkçe and at narrow width, and packaged manifest/signature checks.
