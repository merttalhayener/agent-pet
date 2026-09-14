"""Package the Marketplace release with the official VS Code packager."""
from pathlib import Path
import json
import plistlib
import subprocess

root = Path(__file__).resolve().parent
src = root / 'src'
p = json.loads((src / 'package.json').read_text())
bundle = src / 'bin/Agent Pet.app'
if not (bundle / 'Contents/MacOS/codex-desktop-pet').is_file():
    raise SystemExit('Build the native helper first: python3 scripts/build-native.py')
if plistlib.loads((bundle / 'Contents/Info.plist').read_bytes())['CFBundleVersion'] != p['version']:
    raise SystemExit('Native helper version differs; rebuild it first.')
vsce = root / 'node_modules/.bin/vsce'
if not vsce.is_file():
    raise SystemExit('Install packaging tools first: npm ci')
# Deliberately differs from the legacy GitHub updater asset pattern. The public
# publisher identity must never be silently installed beside the local preview.
target = root / 'artifacts' / f"agent-pet-marketplace-{p['version']}-darwin-arm64.vsix"
target.parent.mkdir(parents=True, exist_ok=True)
(src / 'CHANGELOG.md').write_bytes((root / 'CHANGELOG.md').read_bytes())
subprocess.run([str(vsce), 'package', '--target', 'darwin-arm64', '--no-dependencies', '--out', str(target)], cwd=src, check=True)
print(target)
