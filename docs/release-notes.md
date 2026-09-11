Agent Pet 0.9.1 fixes **grouping across overlapping workspaces**.

If a project belongs to a multi-root workspace and is also open in its own VS Code window, its chats now prefer the more specific workspace. Previously retained group assignments update automatically. Panel-only mode continues to affect appearance only.

The rule uses the chat’s working directory: deepest matching folder first, then fewer workspace folders. Removing a folder also stops that window from claiming its old chats.

After installing, wait for active turns to finish and run **Developer: Reload Window in every open VS Code window**. This update needs the new working-directory and workspace-root metadata from each extension host.

English and Turkish. Apple Silicon, macOS 26+.
