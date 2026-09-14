import AppKit
import AVFoundation
import ImageIO

let root = URL(fileURLWithPath: CommandLine.arguments[1])
let destination = URL(fileURLWithPath: CommandLine.arguments[2])
try FileManager.default.createDirectory(at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
try? FileManager.default.removeItem(at: destination)
let scenes = [
    ("Track your coding chats", "Running, completed, or waiting for you.", "desktop.png"),
    ("Keep workspaces together", "Codex and Claude Code, grouped by project.", "workspaces.png"),
    ("Just the panel", "Hide the character. Keep your chats in view.", "panel-only.png")
]
let images = scenes.map { NSImage(contentsOf: root.appendingPathComponent("docs/images/" + $0.2))! }
let width = 960, height = 720, fps = 12, count = 144
let writer = try AVAssetWriter(outputURL: destination, fileType: .mp4)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 1400000, AVVideoProfileLevelKey: AVVideoProfileLevelH264MainAutoLevel]])
input.expectsMediaDataInRealTime = false
let adapter = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height, kCVPixelBufferCGImageCompatibilityKey as String: true, kCVPixelBufferCGBitmapContextCompatibilityKey as String: true])
writer.add(input); writer.shouldOptimizeForNetworkUse = true
precondition(writer.startWriting()); writer.startSession(atSourceTime: .zero)
func text(_ string: String, _ y: CGFloat, _ size: CGFloat, _ color: NSColor) {
    let style = NSMutableParagraphStyle(); style.alignment = .center
    (string as NSString).draw(in: NSRect(x: 40, y: y, width: 880, height: 42), withAttributes: [.font: NSFont.systemFont(ofSize: size, weight: .medium), .foregroundColor: color, .paragraphStyle: style])
}
for frame in 0..<count {
    while !input.isReadyForMoreMediaData { if writer.status == .failed { fatalError(String(describing: writer.error)) }; Thread.sleep(forTimeInterval: 0.005) }
    var optionalBuffer: CVPixelBuffer?
    precondition(CVPixelBufferPoolCreatePixelBuffer(nil, adapter.pixelBufferPool!, &optionalBuffer) == kCVReturnSuccess)
    let buffer = optionalBuffer!; CVPixelBufferLockBaseAddress(buffer, [])
    let context = CGContext(data: CVPixelBufferGetBaseAddress(buffer), width: width, height: height, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buffer), space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue)!
    NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
    NSColor(calibratedRed: 0.055, green: 0.065, blue: 0.09, alpha: 1).setFill(); NSRect(x: 0, y: 0, width: width, height: height).fill()
    let index = frame / 48, scene = scenes[index], image = images[index]
    text("AGENT PET", 650, 14, .systemTeal)
    text(scene.0, 596, 30, .white)
    text(scene.1, 560, 16, NSColor.white.withAlphaComponent(0.65))
    let scale = min(720 / image.size.width, 450 / image.size.height)
    let rect = NSRect(x: (960 - image.size.width * scale) / 2, y: 92 + (450 - image.size.height * scale) / 2, width: image.size.width * scale, height: image.size.height * scale)
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1)
    for i in 0..<3 { (i == index ? NSColor.systemTeal : NSColor.white.withAlphaComponent(0.15)).setFill(); NSBezierPath(roundedRect: NSRect(x: 443 + i * 27, y: 58, width: 20, height: 3), xRadius: 1.5, yRadius: 1.5).fill() }
    text("macOS · Codex + Claude Code · Sample conversations", 9, 12, NSColor.white.withAlphaComponent(0.45))
    NSGraphicsContext.restoreGraphicsState(); CVPixelBufferUnlockBaseAddress(buffer, [])
    precondition(adapter.append(buffer, withPresentationTime: CMTime(value: Int64(frame), timescale: Int32(fps))))
}
input.markAsFinished(); writer.endSession(atSourceTime: CMTime(seconds: 12, preferredTimescale: 12))
let done = DispatchSemaphore(value: 0); writer.finishWriting { done.signal() }; done.wait()
precondition(writer.status == .completed, String(describing: writer.error))
let asset = AVURLAsset(url: destination)
let generator = AVAssetImageGenerator(asset: asset); generator.appliesPreferredTrackTransform = true
for second in [2, 6, 10] {
    let image = try generator.copyCGImage(at: CMTime(seconds: Double(second), preferredTimescale: 12), actualTime: nil)
    let output = URL(fileURLWithPath: "/private/tmp/agent-pet-demo-\(second).png")
    let file = CGImageDestinationCreateWithURL(output as CFURL, "public.png" as CFString, 1, nil)!
    CGImageDestinationAddImage(file, image, nil); CGImageDestinationFinalize(file)
}
print("Created 12-second silent feature tour: \(destination.path)")
