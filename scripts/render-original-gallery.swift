import AppKit
let output = URL(fileURLWithPath: CommandLine.arguments[1])
let bitmap = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:960,pixelsHigh:380,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep:bitmap)
NSColor(calibratedRed:0.047,green:0.062,blue:0.082,alpha:1).setFill();NSRect(x:0,y:0,width:960,height:380).fill()
for (index, pet) in OriginalPets.catalog.enumerated() {
    let x = CGFloat(index)*310+20
    NSColor(calibratedWhite:0.12,alpha:1).setFill();NSBezierPath(roundedRect:NSRect(x:x,y:20,width:300,height:340),xRadius:20,yRadius:20).fill()
    OriginalPets.draw(id:pet.0,in:NSRect(x:x+66,y:112,width:168,height:181.5),tick:12,status:"idle",sleeping:false,reacting:false,look:0,reducedMotion:true)
    let paragraph=NSMutableParagraphStyle();paragraph.alignment = .center
    (pet.1 as NSString).draw(in:NSRect(x:x,y:66,width:300,height:30),withAttributes:[.font:NSFont.systemFont(ofSize:23,weight:.semibold),.foregroundColor:NSColor.white,.paragraphStyle:paragraph])
    (["The little coder","The curious cat","The patient sprout"][index] as NSString).draw(in:NSRect(x:x,y:40,width:300,height:20),withAttributes:[.font:NSFont.systemFont(ofSize:14),.foregroundColor:NSColor.white.withAlphaComponent(0.6),.paragraphStyle:paragraph])
}
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using:.png,properties:[:])!.write(to:output)
