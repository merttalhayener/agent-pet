#!/usr/bin/env python3
"""Build the floating helper for Apple Silicon / macOS 26+."""
from pathlib import Path
import platform
import plistlib
import json
import shutil
import subprocess
import tempfile

root = Path(__file__).resolve().parents[1]
if platform.system() != "Darwin" or platform.machine() != "arm64":
    raise SystemExit("The desktop helper currently targets Apple Silicon macOS only.")
compiler = Path("/Library/Developer/CommandLineTools/usr/bin/swiftc")
sdk = Path("/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk")
if not compiler.is_file():
    compiler = Path(subprocess.check_output(["xcrun", "--find", "swiftc"], text=True).strip())
if not sdk.is_dir():
    sdk = Path(subprocess.check_output(["xcrun", "--sdk", "macosx", "--show-sdk-path"], text=True).strip())
bundle = root / "src/bin/Agent Pet.app"
output = bundle / "Contents/MacOS/codex-desktop-pet"
output.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix="codex-pet-swift-") as cache:
    subprocess.run([str(compiler), "-sdk", str(sdk), "-target", "arm64-apple-macos26.0", "-module-cache-path", cache, "-O", str(root / "src/native/DesktopPet.swift"), "-o", str(output)], check=True)
output.chmod(0o755)
version = json.loads((root / "src/package.json").read_text())["version"]
(bundle / "Contents/Info.plist").write_bytes(plistlib.dumps({
    "CFBundleIdentifier": "local.agent-pet.desktop", "CFBundleName": "Agent Pet",
    "CFBundleDisplayName": "Agent Pet", "CFBundleExecutable": "codex-desktop-pet",
    "CFBundlePackageType": "APPL", "CFBundleVersion": version,
    "CFBundleShortVersionString": version, "LSUIElement": True, "LSMinimumSystemVersion": "26.0"
}))
subprocess.run(["/usr/bin/codesign", "--force", "--sign", "-", str(bundle)], check=True)
legacy = root / "src/bin/codex-desktop-pet"
if legacy.exists(): legacy.unlink()
print(output)
