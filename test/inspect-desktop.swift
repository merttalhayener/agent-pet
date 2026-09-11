import AppKit
import CoreGraphics
let target = Int(CommandLine.arguments[1])!
let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
let matches = windows.filter { ($0[kCGWindowOwnerPID as String] as? Int) == target }.map { w in
    ["pid": target, "layer": w[kCGWindowLayer as String] ?? -1, "onScreen": w[kCGWindowIsOnscreen as String] ?? false, "bounds": w[kCGWindowBounds as String] ?? [:]] as [String: Any]
}
let result: [String: Any] = ["frontmostApp": NSWorkspace.shared.frontmostApplication?.bundleIdentifier ?? "unknown", "petWindows": matches]
let data = try! JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys])
print(String(data: data, encoding: .utf8)!)
