#!/usr/bin/env python3
"""Render README media with the app's original artwork and sample conversations."""
from pathlib import Path
import tempfile, subprocess, shutil
root = Path(__file__).resolve().parents[1]
compiler = "/Library/Developer/CommandLineTools/usr/bin/swiftc"
sdk = "/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk"
cache = str(Path(tempfile.gettempdir()) / "agent-pet-demo-module-cache")
with tempfile.TemporaryDirectory(prefix="agent-pet-media-") as temporary:
    work = Path(temporary)
    source = (root / "src/native/DesktopPet.swift").read_text()
    source = "import ImageIO\n" + source.replace("    func selfTest() {", "    func selfTest() { exportFeatureDemos() }\n" + (root / "scripts/feature-demos.swiftpart").read_text() + "\n    func baselineSelfTest() {")
    (work / "main.swift").write_text(source)
    flags = [compiler, "-sdk", sdk, "-target", "arm64-apple-macos26.0", "-module-cache-path", cache, "-O"]
    subprocess.run(flags + [str(root / "src/native/OriginalPets.swift"), str(work / "main.swift"), "-o", str(work / "demo")], check=True)
    subprocess.run([str(work / "demo"), "--state-dir", str(work), "--self-test"], check=True, timeout=60)
    for name in ["status", "workspaces", "panel-only", "pets"]:
        shutil.copyfile(work / "output" / (name + ".gif"), root / "docs/media" / (name + ".gif"))
    for name, rendered in {"desktop":"status-0", "compact":"status-0", "waiting":"status-1", "workspaces":"workspaces-1", "panel-only":"panel-only-1"}.items():
        shutil.copyfile(work / "output" / (rendered + ".png"), root / "docs/images" / (name + ".png"))
    (work / "main.swift").write_bytes((root / "scripts/render-original-gallery.swift").read_bytes())
    subprocess.run(flags + [str(root / "src/native/OriginalPets.swift"), str(work / "main.swift"), "-o", str(work / "gallery")], check=True)
    subprocess.run([str(work / "gallery"), str(root / "docs/images/characters.png")], check=True)
    for name in ["render-video", "render-video-gif"]:
        subprocess.run(flags + [str(root / "scripts" / (name + ".swift")), "-o", str(work / name)], check=True)
    subprocess.run([str(work / "render-video"), str(root), str(root / "docs/media/demo.mp4")], check=True, timeout=60)
    subprocess.run([str(work / "render-video-gif"), str(root / "docs/media/demo.mp4"), str(root / "docs/media/demo.gif")], check=True, timeout=30)
print("Replaced every documentation PNG/GIF/MP4 with original character artwork.")
