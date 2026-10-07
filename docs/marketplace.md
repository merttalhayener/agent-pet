# Marketplace publishing

Publisher: **merttalhayener** · Extension: **agent-pet** · ID: **merttalhayener.agent-pet**

Version 0.11.4 was uploaded by the publisher as a prerelease. Version **0.19.2** is ready for the regular release channel at https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet. It includes the 0.17.0 lifecycle/status fixes, 0.18.0 Antigravity support and 0.19.0 custom pets, with queued-prompt status fixes, workspace grouping by default and a product page shared by GitHub and Marketplace. For subsequent releases, use the existing extension’s **Update** action, not New extension.

## Build and verify

```sh
npm ci
npm test
python3 scripts/build-native.py
node test/native-dashboard.cjs --builtin --mixed --overflow
python3 build.py
```

Upload `artifacts/agent-pet-marketplace-0.19.2-darwin-arm64.vsix`. It contains the native helper, MIT license, icon, README and changelog. It is a regular release and targets Apple Silicon macOS. Do not add `--pre-release` when packaging or publishing. For GitHub, create a normal release, not a prerelease.

The locally prepared 0.18.0 Marketplace package and unversioned custom-pet development package both contained Antigravity and custom pets under internal version 0.18.0. They have been moved to `artifacts/superseded/`; use the versioned 0.19.2 package for installation or publication.

## First publication

Sign in with a Microsoft account at [Manage publishers](https://marketplace.visualstudio.com/manage/publishers/) and create publisher ID `merttalhayener`. In that publisher, choose **New extension → Visual Studio Code** and upload the prepared VSIX. Complete any account verification shown by Microsoft. Check the resulting listing and installation before announcing availability.

For CLI publishing, authenticate locally with `npx vsce login merttalhayener`, then run `npx vsce publish --packagePath artifacts/agent-pet-marketplace-0.19.2-darwin-arm64.vsix`. Enter credentials only into the local authentication prompt, never into chat or repository files. Follow [Microsoft’s current publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) for authentication requirements.

## Preview migration

Never rename a Marketplace artifact to the old `agent-pet-VERSION.vsix` pattern: that would make the legacy GitHub updater install a second extension identity. Users move explicitly through **Replace preview** and reload their windows when work finishes. Subsequent updates use VS Code’s Marketplace channel.
