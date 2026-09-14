import AppKit
// Original built-in Agent Pet vector robot, rendered as a Marketplace icon.
let size = 256
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
NSColor(calibratedRed: 0.09, green: 0.10, blue: 0.14, alpha: 1).setFill()
NSBezierPath(rect: NSRect(x: 0, y: 0, width: 256, height: 256)).fill()
func part(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ color: NSColor, _ radius: CGFloat = 5) {
    color.setFill()
    NSBezierPath(roundedRect: NSRect(x: 32 + x * 192 / 112, y: 24 + y * 208 / 121, width: w * 192 / 112, height: h * 208 / 121), xRadius: radius * 1.7, yRadius: radius * 1.7).fill()
}
let metal = NSColor(calibratedRed: 0.77, green: 0.80, blue: 0.94, alpha: 1)
let accent = NSColor(calibratedRed: 0.48, green: 0.42, blue: 0.96, alpha: 1)
part(34, 3, 17, 19, metal); part(61, 3, 17, 19, metal)
part(28, 18, 56, 41, metal, 10); part(16, 25, 11, 27, metal); part(85, 25, 11, 27, metal)
part(52, 99, 8, 14, metal, 3); part(49, 110, 14, 10, accent)
part(16, 51, 80, 53, metal, 14); part(23, 58, 66, 38, .init(calibratedWhite: 0.13, alpha: 1), 10)
part(36, 74, 8, 11, accent, 3); part(67, 74, 8, 11, accent, 3)
part(49, 65, 14, 3, .white, 2); part(47, 29, 18, 17, accent, 5)
NSGraphicsContext.restoreGraphicsState()
let output = URL(fileURLWithPath: CommandLine.arguments[1])
try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
try bitmap.representation(using: .png, properties: [:])!.write(to: output)
