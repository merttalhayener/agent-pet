import AppKit

// Original Agent Pet artwork, drawn from geometric paths. MIT licensed.
// No external image files, sprite sheets, or provider artwork are used.
enum OriginalPets {
    static let catalog = [("agent-pet", "Byte"), ("miso", "Miso"), ("fern", "Fern")]
    static func contains(_ id: String) -> Bool { catalog.contains { $0.0 == id } }
    static func draw(id: String, in rect: NSRect, tick: Int, status: String, sleeping: Bool, reacting: Bool, look: CGFloat, reducedMotion: Bool) {
        NSGraphicsContext.saveGraphicsState()
        defer { NSGraphicsContext.restoreGraphicsState() }
        let transform = NSAffineTransform()
        transform.translateX(by: rect.minX, yBy: rect.minY)
        transform.scaleX(by: rect.width / 112, yBy: rect.height / 121); transform.concat()
        func color(_ hex: Int) -> NSColor { NSColor(calibratedRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: sleeping ? 0.78 : 1) }
        let ink = color(0x26313F), cream = color(0xFFF2D9), mint = color(0x67D5BA), violet = color(0xA59AF7)
        func paint(_ path: NSBezierPath, _ fill: NSColor, outline: Bool = true) {
            fill.setFill(); path.fill()
            if outline { ink.setStroke(); path.lineWidth = 2.4; path.lineJoinStyle = .round; path.stroke() }
        }
        func oval(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ fill: NSColor, outline: Bool = true) { paint(NSBezierPath(ovalIn: NSRect(x:x,y:y,width:w,height:h)), fill, outline:outline) }
        func box(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ radius: CGFloat, _ fill: NSColor, outline: Bool = true) { paint(NSBezierPath(roundedRect:NSRect(x:x,y:y,width:w,height:h),xRadius:radius,yRadius:radius),fill,outline:outline) }
        func line(_ points: [NSPoint], _ fill: NSColor, _ width: CGFloat = 2.4) {
            let p=NSBezierPath(); p.move(to:points[0]); for pt in points.dropFirst() { p.line(to:pt) }; p.lineCapStyle = .round; p.lineJoinStyle = .round; p.lineWidth=width; fill.setStroke(); p.stroke()
        }
        func polygon(_ points: [NSPoint], _ fill: NSColor) { let p=NSBezierPath();p.move(to:points[0]);for pt in points.dropFirst(){p.line(to:pt)};p.close();paint(p,fill) }
        func p(_ x: CGFloat,_ y: CGFloat)->NSPoint { NSPoint(x:x,y:y) }
        let phase = reducedMotion ? 0 : CGFloat(tick) * 0.23
        let working = status == "running" && !sleeping
        let happy = (reacting || status == "ready") && !sleeping
        let bounce: CGFloat = reducedMotion || sleeping ? 0 : reacting ? abs(sin(phase)) * (id == "fern" ? 1 : 7) : working ? sin(phase) * 1.3 : sin(phase * 0.25) * 0.8
        oval(21, 1, 72, 7, NSColor.black.withAlphaComponent(0.12), outline:false)
        let lift = NSAffineTransform();lift.translateX(by:0,yBy:bounce);lift.concat()
        let blink = sleeping || (!reducedMotion && tick % 83 > 79)
        let glance: CGFloat = reducedMotion || sleeping ? 0 : look * 2
        func eyes(_ left: CGFloat, _ right: CGFloat, _ y: CGFloat, _ tint: NSColor = ink) {
            for x in [left,right] {
                if blink { line([p(x-3,y),p(x+3,y)],tint,2.6) }
                else if happy { let a=NSBezierPath();a.move(to:p(x-3,y-1));a.curve(to:p(x+3,y-1),controlPoint1:p(x-2,y+4),controlPoint2:p(x+2,y+4));a.lineWidth=2.6;a.lineCapStyle = .round;tint.setStroke();a.stroke() }
                else { oval(x-2.5+glance,y-4,5,8,tint,outline:false);oval(x-1+glance,y,1.6,2,.white,outline:false) }
            }
        }
        switch id {
        case "miso":
            let fur=color(0xF4BC79), dark=color(0xD28A51)
            // Curved tail with a dark tip, behind the sitting body.
            let tail=NSBezierPath();tail.move(to:p(78,19));tail.curve(to:p(99,43),controlPoint1:p(109,10),controlPoint2:p(108,34));tail.lineWidth=13;tail.lineCapStyle = .round;ink.setStroke();tail.stroke();tail.lineWidth=8;fur.setStroke();tail.stroke()
            oval(30,8,52,51,fur);oval(42,14,29,34,cream,outline:false)
            polygon([p(25,78),p(23,109),p(46,95)],fur);polygon([p(67,95),p(89,109),p(88,77)],fur)
            polygon([p(29,96),p(29,104),p(38,97)],color(0xE49A91));polygon([p(75,97),p(84,104),p(83,94)],color(0xE49A91))
            oval(22,49,70,51,fur)
            let patch=NSBezierPath();patch.move(to:p(61,96));patch.curve(to:p(87,77),controlPoint1:p(78,99),controlPoint2:p(91,90));patch.curve(to:p(64,76),controlPoint1:p(81,66),controlPoint2:p(65,63));patch.close();paint(patch,dark,outline:false)
            oval(38,55,37,23,cream,outline:false);eyes(40,73,77)
            polygon([p(52,67),p(59,67),p(55.5,63)],color(0xB66E72));line([p(55.5,63),p(52,60),p(49,61)],ink,1.5);line([p(55.5,63),p(59,60),p(62,61)],ink,1.5)
            for y in [CGFloat(62),CGFloat(68)] {line([p(25,y),p(35,y-1)],ink,1.2);line([p(77,y-1),p(87,y)],ink,1.2)}
            box(34,46,45,7,3,mint);oval(53,41,7,9,color(0xF7D974))
            oval(28,6,23,11,fur);oval(61,6,23,11,fur)
            oval(29,24+(working ? sin(phase)*2:0),12,18,fur);oval(72,24+(working ? -sin(phase)*2:0),12,18,fur)
        case "fern":
            let leaf=color(0x78BD83), leafLight=color(0xB9E0A0), seed=color(0xF3DFAB)
            line([p(55,77),p(56,110)],ink,5);line([p(55,77),p(56,110)],leaf,2)
            let left=NSBezierPath();left.move(to:p(56,96));left.curve(to:p(30,114),controlPoint1:p(29,93),controlPoint2:p(24,108));left.curve(to:p(56,96),controlPoint1:p(50,118),controlPoint2:p(56,103));paint(left,leaf)
            let right=NSBezierPath();right.move(to:p(57,101));right.curve(to:p(82,119),controlPoint1:p(54,116),controlPoint2:p(72,121));right.curve(to:p(57,101),controlPoint1:p(82,106),controlPoint2:p(70,98));paint(right,leafLight)
            line([p(39,107),p(55,98)],ink,1.1);line([p(62,106),p(75,115)],ink,1.1)
            oval(27,28,58,59,seed);oval(33,41,46,34,cream,outline:false);eyes(42,69,62)
            line([p(51,51),p(55,49),p(59,51)],ink,1.8);oval(32,51,8,4,color(0xE9A993),outline:false);oval(72,51,8,4,color(0xE9A993),outline:false)
            polygon([p(30,32),p(81,32),p(74,9),p(39,9)],color(0x80B5B1));box(26,29,59,10,4,color(0xAED7C8))
            oval(35,4,17,9,leaf);oval(62,4,17,9,leaf)
            oval(20,36+(working ? sin(phase)*2:0),13,9,leaf);oval(80,36+(working ? -sin(phase)*2:0),13,9,leaf)
            line([p(52,16),p(57,16),p(60,20)],cream,2)
        default:
            let shell=color(0xDDE3EF)
            box(32,5,18,16,6,shell);box(64,5,18,16,6,shell)
            box(30,19,54,42,13,shell);box(17,25,12,28,6,shell);box(85,25,12,28,6,shell)
            line([p(58,96),p(58,111)],ink,4);oval(51,108,14,10,violet)
            box(17,52,80,48,17,shell);box(24,59,66,34,11,ink)
            eyes(41,73,77,mint);line([p(51,66),p(61,66)],cream,2)
            oval(25,59,7,3,violet,outline:false);oval(82,59,7,3,violet,outline:false)
            box(46,31,21,17,5,violet);line([p(52,41),p(56,38),p(52,35)],cream,1.6);line([p(58,35),p(62,35)],cream,1.6)
        }
        if working {
            // Shared little laptop, with alternating typing dots.
            polygon([p(28,15),p(80,15),p(85,42),p(33,42)],color(0x3B4658))
            line([p(25,13),p(83,13)],ink,4);line([p(49,32),p(54,28),p(49,24)],mint,2)
            line([p(59,24),p(66,24)],mint,2)
            oval(36,14,8,5,cream);oval(68,14+(reducedMotion ? 0 : sin(phase)*1.5),8,5,cream)
        }
        if sleeping {
            let attrs: [NSAttributedString.Key:Any] = [.font:NSFont.monospacedSystemFont(ofSize:12,weight:.bold),.foregroundColor:violet]
            ("z" as NSString).draw(at:p(88,95),withAttributes:attrs)
        } else if status == "waiting" {
            oval(90,91,17,20,color(0xF4D77B));line([p(98.5,105),p(98.5,100)],ink,2);oval(97.5,95,2,2,ink,outline:false)
        } else if happy {
            for point in [p(15,98),p(97,77)] { let s: CGFloat = reducedMotion ? 3 : 3+sin(phase)*0.7;line([p(point.x-s,point.y),p(point.x+s,point.y)],mint,2);line([p(point.x,point.y-s),p(point.x,point.y+s)],mint,2) }
        }
    }
}
