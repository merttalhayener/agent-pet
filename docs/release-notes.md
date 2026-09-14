# Agent Pet v0.11.3 — Hide the panel, keep the pet

**Hide panel** now hides only the chat list. The pet remains visible, movable and resizable. **Show panel** restores the same chats and workspace groups.

**Hide pet / Show pet** controls the character independently. **Hide all / Show all** or **Ctrl + Option + Cmd + P** controls the whole window. The individual visibility preferences are saved. If both parts are hidden individually, Show all or VS Code’s show command restores them.

The VS Code **Agent Pet: Hide Panel** command follows the same panel-only behavior. English and Turkish menus and usage docs are updated.

Apple Silicon · macOS 26+ · English / Türkçe · Prerelease.

This VSIX can be installed locally for testing. Marketplace publication of 0.11.3 is pending publisher upload.

Validation: Node tests passed, including the VS Code panel-only hide request. Native dashboard checks passed for independent visibility, repeated menu toggles in both languages, pet-only drawing/movement/resizing, workspace preservation, and recovery after both parts are hidden.
