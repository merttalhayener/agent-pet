import AppKit
let output = URL(fileURLWithPath: CommandLine.arguments[1])
let canvasWidth = 1270
let bitmap = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:canvasWidth,pixelsHigh:380,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep:bitmap)
NSColor(calibratedRed:0.047,green:0.062,blue:0.082,alpha:1).setFill();NSRect(x:0,y:0,width:CGFloat(canvasWidth),height:380).fill()
for (index, pet) in OriginalPets.catalog.enumerated() {
    let x = CGFloat(index)*310+20
    NSColor(calibratedWhite:0.12,alpha:1).setFill();NSBezierPath(roundedRect:NSRect(x:x,y:20,width:300,height:340),xRadius:20,yRadius:20).fill()
    OriginalPets.draw(id:pet.0,in:NSRect(x:x+66,y:112,width:168,height:181.5),tick:12,status:"idle",sleeping:false,reacting:false,look:0,reducedMotion:true)
    let paragraph=NSMutableParagraphStyle();paragraph.alignment = .center
    (pet.1 as NSString).draw(in:NSRect(x:x,y:66,width:300,height:30),withAttributes:[.font:NSFont.systemFont(ofSize:23,weight:.semibold),.foregroundColor:NSColor.white,.paragraphStyle:paragraph])
    (["The little coder","The curious cat","The patient sprout"][index] as NSString).draw(in:NSRect(x:x,y:40,width:300,height:20),withAttributes:[.font:NSFont.systemFont(ofSize:14),.foregroundColor:NSColor.white.withAlphaComponent(0.6),.paragraphStyle:paragraph])
}
// Keep the built-in artwork intact and make the custom-pet choice visible
// beside it. This is a documentation card; the image links to the user guide.
let customX: CGFloat = 950
let mint = NSColor(calibratedRed:0.404,green:0.835,blue:0.729,alpha:1)
let customCard = NSBezierPath(roundedRect:NSRect(x:customX,y:20,width:300,height:340),xRadius:20,yRadius:20)
NSColor(calibratedWhite:0.12,alpha:1).setFill();customCard.fill()
let outline = NSBezierPath(roundedRect:NSRect(x:customX+1,y:21,width:298,height:338),xRadius:19,yRadius:19)
outline.lineWidth = 1.5;outline.setLineDash([6,6],count:2,phase:0)
mint.withAlphaComponent(0.45).setStroke();outline.stroke()
let center = NSPoint(x:customX+150,y:203)
let circle = NSBezierPath(ovalIn:NSRect(x:center.x-56,y:center.y-56,width:112,height:112))
mint.withAlphaComponent(0.09).setFill();circle.fill()
let plus = NSBezierPath()
plus.move(to:NSPoint(x:center.x-24,y:center.y));plus.line(to:NSPoint(x:center.x+24,y:center.y))
plus.move(to:NSPoint(x:center.x,y:center.y-24));plus.line(to:NSPoint(x:center.x,y:center.y+24))
plus.lineWidth = 8;plus.lineCapStyle = .round;mint.setStroke();plus.stroke()
let paragraph = NSMutableParagraphStyle();paragraph.alignment = .center
("Add yours" as NSString).draw(in:NSRect(x:customX,y:66,width:300,height:30),withAttributes:[.font:NSFont.systemFont(ofSize:23,weight:.semibold),.foregroundColor:NSColor.white,.paragraphStyle:paragraph])
("Your own character" as NSString).draw(in:NSRect(x:customX,y:40,width:300,height:20),withAttributes:[.font:NSFont.systemFont(ofSize:14),.foregroundColor:NSColor.white.withAlphaComponent(0.6),.paragraphStyle:paragraph])
NSGraphicsContext.restoreGraphicsState()
try bitmap.representation(using:.png,properties:[:])!.write(to:output)
