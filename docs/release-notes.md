# Agent Pet v0.16.1 — Open the setup guide automatically

The first-run guide now opens directly in the first focused VS Code window. No notification click is required.

Users who missed the 0.16.0 notification and have not completed setup get the guide too. It opens only once across windows and subsequent launches. Close the tab whenever you want and reopen it with **Agent Pet: Get Started**. Completed setups are skipped; failed initial display can retry.

Existing windows need to load the updated extension before this behavior takes effect. Finish active work before reloading.

Apple Silicon · macOS 26+ · English / Türkçe · Regular release.

Marketplace upload of `agent-pet-marketplace-0.16.1-darwin-arm64.vsix` is pending.

Validation: Node regression tests covering missed notification migration, simultaneous windows, focus changes, completed setup and failed guide initialization; native build and VSIX manifest/signature checks.
