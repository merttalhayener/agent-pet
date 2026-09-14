# Marketplace publishing

Publisher: **merttalhayener** · Extension: **agent-pet** · ID: **merttalhayener.agent-pet**

Version 0.11.4 was uploaded by the publisher as a prerelease. Version **0.14.0** is ready for the regular release channel at https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet. For subsequent releases, use the existing extension’s **Update** action, not New extension.

## Build and verify

```sh
npm ci
npm test
python3 scripts/build-native.py
node test/native-dashboard.cjs --builtin --mixed --overflow
python3 build.py
```

Upload `artifacts/agent-pet-marketplace-0.14.0-darwin-arm64.vsix`. It contains the native helper, MIT license, icon, README and changelog. It is a regular release and targets Apple Silicon macOS. Do not add `--pre-release` when packaging or publishing. For GitHub, create a normal release, not a prerelease.

## First publication

Sign in with a Microsoft account at [Manage publishers](https://marketplace.visualstudio.com/manage/publishers/) and create publisher ID `merttalhayener`. In that publisher, choose **New extension → Visual Studio Code** and upload the prepared VSIX. Complete any account verification shown by Microsoft. Check the resulting listing and installation before announcing availability.

For CLI publishing, authenticate locally with `npx vsce login merttalhayener`, then run `npx vsce publish --packagePath artifacts/agent-pet-marketplace-0.14.0-darwin-arm64.vsix`. Enter credentials only into the local authentication prompt, never into chat or repository files. Follow [Microsoft’s current publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension) for authentication requirements.

## Preview migration

Never rename a Marketplace artifact to the old `agent-pet-VERSION.vsix` pattern: that would make the legacy GitHub updater install a second extension identity. Users move explicitly through **Replace preview** and reload their windows when work finishes. Subsequent updates use VS Code’s Marketplace channel.
