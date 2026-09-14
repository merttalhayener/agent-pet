# Agent Pet v0.11.0 — Marketplace preparation

- Public extension identity: `merttalhayener.agent-pet`.
- Official prerelease package for Apple Silicon / macOS 26+.
- MIT license, original store icon, updated documentation and third-party notices.
- Explicit preview replacement that retains pet preferences.
- Claude links use the new extension identity and the owning VS Code window.
- VS Code manages Marketplace updates; Agent Pet retains idle-window reload protection.

**Marketplace publication is pending publisher account setup.** This GitHub release provides the prepared VSIX for review and manual installation.

**Moving from the old preview:** install the new VSIX, choose **Replace preview**, finish active chats and reload each VS Code window. The old GitHub updater deliberately skips this differently identified package.

Apple Silicon · macOS 26+ · English / Türkçe · Prerelease.

Validation: 52 Node tests passed; native dashboard tests passed with built-in artwork, Codex/Claude fixtures and an overflowing list. The packaged VSIX installed and activated in an isolated VS Code profile, and the extracted app passed strict code-signature verification. Marketplace delivery itself remains pending account setup.
