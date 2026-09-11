Agent Pet 0.7.1 fixes **Claude chat navigation to the right sidebar**.

- Pet rows now use Agent Pet’s validated session handler instead of Claude’s editor-only link.
- A uniquely identified completed editor tab can move to the sidebar automatically. Active or unsaved tabs stay open: finish the turn, close that tab, then click its pet row again.
- Older detached desktop helpers update automatically when the new extension loads.

After installing, wait for active turns to finish and run **Developer: Reload Window** once. Your pet preferences and retained chats are kept.

Tested against Claude Code 2.1.268. Requires Apple Silicon and macOS 26+.
