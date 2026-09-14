import AppKit
import AVFoundation
import ImageIO
let input = URL(fileURLWithPath: CommandLine.arguments[1])
let output = URL(fileURLWithPath: CommandLine.arguments[2])
let generator = AVAssetImageGenerator(asset: AVURLAsset(url: input))
generator.appliesPreferredTrackTransform = true
generator.maximumSize = CGSize(width: 720, height: 540)
let destination = CGImageDestinationCreateWithURL(output as CFURL, "com.compuserve.gif" as CFString, 3, nil)!
CGImageDestinationSetProperties(destination, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0]] as CFDictionary)
for second in [2, 6, 10] {
    let frame = try generator.copyCGImage(at: CMTime(seconds: Double(second), preferredTimescale: 12), actualTime: nil)
    CGImageDestinationAddImage(destination, frame, [kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFDelayTime: 4.0, kCGImagePropertyGIFUnclampedDelayTime: 4.0]] as CFDictionary)
}
precondition(CGImageDestinationFinalize(destination))
let source = CGImageSourceCreateWithURL(output as CFURL, nil)!
precondition(CGImageSourceGetCount(source) == 3)
var duration = 0.0
for i in 0..<3 {
    let properties = CGImageSourceCopyPropertiesAtIndex(source, i, nil)! as NSDictionary
    let gif = properties[kCGImagePropertyGIFDictionary] as! NSDictionary
    duration += gif[kCGImagePropertyGIFDelayTime] as! Double
}
precondition(duration == 12)
print("Validated animated GIF: 3 scenes, 12 seconds, infinite loop")
