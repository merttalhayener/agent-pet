import AppKit
import Darwin
import Carbon

enum PetLanguage: String, CaseIterable {
    case english = "en", turkish = "tr"
    init(preference: String?) { self = PetLanguage(rawValue: preference ?? "") ?? .english }
    func text(_ key: String) -> String { self == .turkish ? Self.translations[key] ?? key : key }
    private static let translations: [String: String] = [
        "Chats": "Sohbetler",
        "Workspaces": "Çalışma alanları",
        "No workspace": "Çalışma alanı yok",
        "Other chats": "Diğer sohbetler",
        "Compact list": "Kompakt liste",
        "Extended · Workspaces": "Genişletilmiş · Çalışma alanları",
        "Group by workspace": "Çalışma alanına göre grupla",
        "Click to expand or collapse workspace": "Çalışma alanını açmak veya daraltmak için tıkla",
        "Completed": "Tamamlandı",
        "No active chats yet": "Henüz aktif sohbet yok",
        "Expand chat list": "Sohbet listesini aç",
        "Collapse chat list": "Sohbet listesini daralt",
        "Drag to resize": "Boyutlandırmak için sürükle",
        "Click to open in VS Code": "VS Code'da açmak için tıkla",
        "Click to pet · Drag to move · Right-click for options": "Sevmek için tıkla · Taşımak için sürükle · Seçenekler için sağ tıkla",
        "Running": "Çalışıyor",
        "Waiting for your reply": "Yanıtın bekleniyor",
        "Something went wrong": "Bir sorun oluştu",
        "No update": "Güncelleme yok",
        "Idle": "Bekliyor",
        "Hide/show with ⌃⌥⌘P": "⌃⌥⌘P ile gizle/göster",
        "Shortcut in use; hide/show from this menu.": "Kısayol başka uygulamada kullanımda; bu menüden gizle/göster.",
        "Unpin chat": "Sabitlemeyi kaldır",
        "Pin chat": "Sohbeti sabitle",
        "Remove from list": "Listeden kaldır",
        "Show pet": "Peti göster",
        "Hide pet": "Peti gizle",
        "Completion sound and animation are paused while hidden.": "Gizliyken bitiş sesi ve animasyonu da duraklatılır.",
        "Return to VS Code": "VS Code'a dön",
        "Pets": "Petler",
        "Wake up": "Uyandır",
        "Sleep": "Uyut",
        "Appearance": "Görünüm",
        "Text size": "Yazı boyutu",
        "Pet size": "Pet boyutu",
        "List opacity": "Liste opaklığı",
        "Snap to edges": "Kenarlara hizala",
        "Notifications": "Bildirimler",
        "Completion animation": "Bitiş animasyonu",
        "Completion sound": "Bitişte ses çal",
        "Expand list": "Listeyi aç",
        "Collapse list": "Listeyi daralt",
        "Clear completed chats": "Tamamlananları temizle",
        "Restore dismissed chats": "Kaldırılan sohbetleri göster",
        "Language": "Dil",
        "%d running · %d waiting": "%d çalışıyor · %d bekliyor",
        "%d running · %d chats": "%d çalışıyor · %d sohbet",
        "%d running · %d chat": "%d çalışıyor · %d sohbet",
        "%d chats completed": "%d sohbet tamamlandı",
        "s": "sn",
        "min": "dk",
        "h": "sa",
    ]
}

struct PetAsset: Codable { let id: String; let name: String; let file: String }
struct WorkspaceInfo: Codable, Equatable { let id: String; let name: String }
struct DashboardEntry {
    var thread: ThreadActivity? = nil
    var workspace: WorkspaceInfo? = nil
    var count = 0
    var running = 0
}
struct ThreadActivity: Codable, Equatable {
    let id: String
    var isClaude: Bool { id.hasPrefix("claude:") }
    var sessionID: String { isClaude ? String(id.dropFirst(7)) : id }
    var agentName: String { isClaude ? "Claude Code" : "Codex" }
    let title: String
    let status: String
    let changedAt: Double
    let lastEventAt: Double
    var startedAt: Double? = nil
    var finishedAt: Double? = nil
    var workspace: WorkspaceInfo? = nil
}
struct Activity: Codable {
    let status: String
    let active: Int
    let threads: [ThreadActivity]?
    let trackingDisabled: Bool?
}
struct Snapshot: Codable {
    var protocolVersion: Int? = nil
    var workspace: WorkspaceInfo? = nil
    let updatedAt: Double
    let selectedAt: Double
    let sleepAt: Double
    let selected: String
    let sleeping: Bool
    let activity: Activity
    let pets: [PetAsset]
}

final class PetPanel: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}

final class DashboardView: NSView {
    weak var owner: DesktopPet?
    var sheet: NSImage?
    var spriteRow = 0, spriteColumn = 0
    var hovered = false, hoveredRow: String?
    var scrollOffset = 0
    var dragStart = NSPoint.zero, windowStart = NSPoint.zero
    var dragged = false, pressedRemoveID: String?, pressedThreadID: String?, pressedWorkspaceID: String?
    var resizing = false
    var moving = false
    var resizeStartFrame = NSRect.zero
    var rowHeight: CGFloat { max(30, (owner?.textSize ?? 11.5) + 18) }
    var language: PetLanguage { owner?.language ?? .english }
    func text(_ key: String) -> String { language.text(key) }
    var rows: [ThreadActivity] { owner?.displayThreads ?? [] }
    var entries: [DashboardEntry] {
        guard owner?.grouped == true else { return rows.map { DashboardEntry(thread: $0) } }
        let groups = Dictionary(grouping: rows) { $0.workspace?.id ?? "legacy" }
        return groups.keys.sorted { a, b in
            let an = groups[a]?.first?.workspace?.name ?? text("Other chats")
            let bn = groups[b]?.first?.workspace?.name ?? text("Other chats")
            return an == bn ? a < b : an.localizedStandardCompare(bn) == .orderedAscending
        }.flatMap { id -> [DashboardEntry] in
            let threads = groups[id] ?? []
            let workspace = threads.first?.workspace ?? WorkspaceInfo(id: id, name: text("Other chats"))
            let header = DashboardEntry(workspace: workspace, count: threads.count, running: threads.filter { $0.status == "running" }.count)
            return [header] + ((owner?.foldedWorkspaces.contains(id) ?? false) ? [] : threads.map { DashboardEntry(thread: $0) })
        }
    }
    var collapsed: Bool { owner?.collapsed ?? false }
    var logicalWidth: CGFloat { collapsed ? max(180, 112 * (owner?.petScale ?? 1) + 58) : (owner?.grouped == true ? 400 : 340) }
    var visibleCount: Int { collapsed ? 0 : min(owner?.grouped == true ? 12 : 8, entries.count) }
    var cardHeight: CGFloat { collapsed ? 32 : CGFloat(max(1, visibleCount)) * rowHeight + 40 }
    var desiredHeight: CGFloat { cardHeight + 121 * (owner?.petScale ?? 1) + 7 }
    var collapseRect: NSRect { NSRect(x: bounds.maxX - 29, y: cardHeight - 28, width: 24, height: 24) }
    var groupingRect: NSRect { NSRect(x: bounds.maxX - 55, y: cardHeight - 28, width: 24, height: 24) }
    var resizeHandleRect: NSRect { NSRect(x: bounds.maxX - 28, y: bounds.maxY - 28, width: 26, height: 26) }
    var spriteRect: NSRect { let s = owner?.petScale ?? 1; return NSRect(x: (bounds.width - 112 * s) / 2, y: cardHeight + 5, width: 112 * s, height: 121 * s) }
    override var isOpaque: Bool { false }
    override func resetCursorRects() {
        super.resetCursorRects()
        for i in 0..<visibleCount { addCursorRect(rowRect(i), cursor: .pointingHand) }
        addCursorRect(resizeHandleRect, cursor: .crosshair)
        addCursorRect(collapseRect, cursor: .pointingHand)
        addCursorRect(groupingRect, cursor: .pointingHand)
    }
    override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
    func clampScroll() { scrollOffset = max(0, min(scrollOffset, entries.count - visibleCount)) }
    func rowRect(_ visibleIndex: Int) -> NSRect {
        NSRect(x: 6, y: cardHeight - 32 - CGFloat(visibleIndex + 1) * rowHeight, width: bounds.width - 12, height: rowHeight)
    }
    func rowAt(_ p: NSPoint) -> ThreadActivity? {
        for i in 0..<visibleCount where rowRect(i).contains(p) { return entries[i + scrollOffset].thread }
        return nil
    }
    func workspaceAt(_ p: NSPoint) -> WorkspaceInfo? {
        for i in 0..<visibleCount where rowRect(i).contains(p) { return entries[i + scrollOffset].workspace }
        return nil
    }
    override func updateTrackingAreas() {
        for area in trackingAreas { removeTrackingArea(area) }
        addTrackingArea(NSTrackingArea(rect: bounds, options: [.mouseEnteredAndExited, .mouseMoved, .activeAlways, .inVisibleRect], owner: self))
        super.updateTrackingAreas()
    }
    func label(_ text: String, in rect: NSRect, size: CGFloat, color: NSColor, centered: Bool = false) {
        let paragraph = NSMutableParagraphStyle(); paragraph.alignment = centered ? .center : .left; paragraph.lineBreakMode = .byTruncatingTail
        (text as NSString).draw(in: rect, withAttributes: [.font: NSFont.systemFont(ofSize: size, weight: .medium), .foregroundColor: color, .paragraphStyle: paragraph])
    }
    func indicator(_ status: String, at center: NSPoint) {
        let path = NSBezierPath(); path.lineWidth = 1.8; path.lineCapStyle = .round; path.lineJoinStyle = .round
        if status == "running" {
            NSColor.white.withAlphaComponent(0.13).setStroke()
            NSBezierPath(ovalIn: NSRect(x: center.x - 6, y: center.y - 6, width: 12, height: 12)).stroke()
            let angle: CGFloat = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion ? 90 : CGFloat(Date.timeIntervalSinceReferenceDate * -300).truncatingRemainder(dividingBy: 360)
            NSColor(calibratedRed: 0.60, green: 0.76, blue: 1, alpha: 1).setStroke()
            path.appendArc(withCenter: center, radius: 6, startAngle: angle, endAngle: angle - 245, clockwise: true); path.stroke()
        } else if status == "ready" {
            NSColor(calibratedRed: 0.51, green: 0.85, blue: 0.66, alpha: 1).setStroke()
            path.move(to: NSPoint(x: center.x - 4.5, y: center.y)); path.line(to: NSPoint(x: center.x - 1, y: center.y - 3.5)); path.line(to: NSPoint(x: center.x + 5, y: center.y + 4)); path.stroke()
        } else {
            let color = status == "waiting" ? NSColor.systemYellow : status == "failed" ? NSColor.systemRed : NSColor.white.withAlphaComponent(0.5)
            color.setStroke(); NSBezierPath(ovalIn: NSRect(x: center.x - 6, y: center.y - 6, width: 12, height: 12)).stroke()
            label(status == "failed" || status == "waiting" ? "!" : status == "unknown" ? "?" : "–", in: NSRect(x: center.x - 5, y: center.y - 7, width: 10, height: 15), size: 10, color: color, centered: true)
        }
    }
    func drawBuiltInPet() {
        let r = spriteRect
        func part(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ color: NSColor, _ radius: CGFloat = 5) {
            color.setFill()
            NSBezierPath(roundedRect: NSRect(x: r.minX + x * r.width / 112, y: r.minY + y * r.height / 121, width: w * r.width / 112, height: h * r.height / 121), xRadius: radius, yRadius: radius).fill()
        }
        let metal = NSColor(calibratedRed: 0.77, green: 0.80, blue: 0.94, alpha: owner?.sleeping == true ? 0.62 : 1)
        let accent = NSColor(calibratedRed: 0.48, green: 0.42, blue: 0.96, alpha: 1)
        part(34, 3, 17, 19, metal); part(61, 3, 17, 19, metal)
        part(28, 18, 56, 41, metal, 10); part(16, 25, 11, 27, metal); part(85, 25, 11, 27, metal)
        part(52, 99, 8, 14, metal, 3); part(49, 110, 14, 10, accent)
        part(16, 51, 80, 53, metal, 14); part(23, 58, 66, 38, .init(calibratedWhite: 0.13, alpha: 1), 10)
        let blink = owner?.sleeping == true || (owner?.tick ?? 0) % 70 > 66
        part(36, 74, 8, blink ? 3 : 11, accent, 3); part(67, 74, 8, blink ? 3 : 11, accent, 3)
        part(49, 65, 14, 3, .white, 2); part(47, 29, 18, 17, accent, 5)
    }
    override func draw(_ dirtyRect: NSRect) {
        NSColor.clear.setFill(); bounds.fill(using: .copy)
        if let sheet {
            let source = NSRect(x: CGFloat(spriteColumn) * 192, y: CGFloat(10 - spriteRow) * 208, width: 192, height: 208)
            sheet.draw(in: spriteRect, from: source, operation: .sourceOver, fraction: owner?.sleeping == true ? 0.62 : 1, respectFlipped: false, hints: [.interpolation: NSImageInterpolation.high])
        }
        if sheet == nil { drawBuiltInPet() }
        let card = NSBezierPath(roundedRect: NSRect(x: 0.5, y: 0.5, width: bounds.width - 1, height: cardHeight - 1), xRadius: 13, yRadius: 13)
        NSColor(calibratedWhite: 0.10, alpha: owner?.listOpacity ?? 0.91).setFill(); card.fill()
        NSColor.white.withAlphaComponent(0.12).setStroke(); card.lineWidth = 0.7; card.stroke()
        let running = rows.filter { $0.status == "running" }.count, waiting = rows.filter { $0.status == "waiting" }.count
        let summary = String(format: text(waiting > 0 ? "%d running · %d waiting" : rows.count == 1 ? "%d running · %d chat" : "%d running · %d chats"), running, waiting > 0 ? waiting : rows.count)
        let celebrating = (owner?.celebrationUntil ?? 0) > Date.timeIntervalSinceReferenceDate
        label(collapsed ? summary : celebrating ? (owner?.completionText ?? text("Completed")) : text(owner?.grouped == true ? "Workspaces" : "Chats") + " · " + summary, in: NSRect(x: 12, y: cardHeight - 23, width: bounds.width - 73, height: 17), size: 10, color: celebrating ? .systemGreen : NSColor.white.withAlphaComponent(0.65))
        label(collapsed ? "⌄" : "⌃", in: collapseRect, size: 16, color: .white, centered: true)
        label("▤", in: groupingRect, size: 16, color: owner?.grouped == true ? .systemTeal : .white, centered: true)
        clampScroll()
        let items = entries
        for i in 0..<visibleCount {
            let item = items[i + scrollOffset], rect = rowRect(i)
            if let workspace = item.workspace {
                NSColor.white.withAlphaComponent(0.07).setFill(); NSBezierPath(roundedRect: rect.insetBy(dx: 3, dy: 2), xRadius: 5, yRadius: 5).fill()
                label(owner?.foldedWorkspaces.contains(workspace.id) == true ? "›" : "⌄", in: NSRect(x: 14, y: rect.midY - 8, width: 15, height: 18), size: 13, color: .systemTeal)
                label(workspace.name == "No workspace" ? text("No workspace") : workspace.name, in: NSRect(x: 34, y: rect.midY - 7, width: bounds.width - 170, height: 17), size: 11, color: .systemTeal)
                let summary = String(format: text(item.count == 1 ? "%d running · %d chat" : "%d running · %d chats"), item.running, item.count)
                label(summary, in: NSRect(x: bounds.width - 130, y: rect.midY - 6, width: 115, height: 15), size: 9, color: NSColor.white.withAlphaComponent(0.6))
                continue
            }
            guard let thread = item.thread else { continue }
            if thread.id == hoveredRow { NSColor.white.withAlphaComponent(0.06).setFill(); NSBezierPath(roundedRect: rect, xRadius: 7, yRadius: 7).fill() }
            indicator(thread.status, at: NSPoint(x: 20, y: rect.midY))
            let size = owner?.textSize ?? 11.5
            let pinned = owner?.pinned.contains(thread.id) ?? false
            label((pinned ? "★ " : "") + thread.title, in: NSRect(x: 36, y: rect.midY - 1, width: bounds.width - 118, height: size + 5), size: size, color: .white)
            label(thread.agentName, in: NSRect(x: 36, y: rect.midY - 12, width: bounds.width - 118, height: 11), size: 8, color: thread.isClaude ? NSColor.systemOrange.withAlphaComponent(0.9) : NSColor.white.withAlphaComponent(0.5))
            label(DesktopPet.durationText(thread, language: language), in: NSRect(x: bounds.width - 80, y: rect.midY - 7, width: 48, height: 16), size: 10, color: NSColor.white.withAlphaComponent(0.5))
            if thread.id == hoveredRow { label("×", in: NSRect(x: bounds.width - 26, y: rect.midY - 9, width: 18, height: 18), size: 14, color: NSColor.white.withAlphaComponent(0.6), centered: true) }
        }
        if rows.isEmpty && !collapsed { label(text("No active chats yet"), in: NSRect(x: 16, y: 14, width: bounds.width - 32, height: 17), size: 11, color: NSColor.white.withAlphaComponent(0.6), centered: true) }
        if entries.count > visibleCount && !collapsed {
            let track = cardHeight - 22, thumb = max(18, track * CGFloat(visibleCount) / CGFloat(entries.count))
            let y = 11 + (track - thumb) * (1 - CGFloat(scrollOffset) / CGFloat(entries.count - visibleCount))
            NSColor.white.withAlphaComponent(0.24).setFill(); NSBezierPath(roundedRect: NSRect(x: bounds.width - 4, y: y, width: 2, height: thumb), xRadius: 1, yRadius: 1).fill()
        }
        if hovered {
            for x in [bounds.midX - 82, bounds.midX + 60] {
                NSColor.black.withAlphaComponent(0.50).setFill(); NSBezierPath(ovalIn: NSRect(x: x, y: bounds.maxY - 28, width: 22, height: 22)).fill()
            }
            label(owner?.sleeping == true ? "☀" : "☾", in: NSRect(x: bounds.midX - 82, y: bounds.maxY - 26, width: 22, height: 19), size: 14, color: .white, centered: true)
            label("×", in: NSRect(x: bounds.midX + 60, y: bounds.maxY - 25, width: 22, height: 19), size: 15, color: .white, centered: true)
        }
        if (owner?.reactionUntil ?? 0) > Date.timeIntervalSinceReferenceDate {
            label("♡", in: NSRect(x: bounds.midX + 38, y: bounds.maxY - 64, width: 26, height: 25), size: 22, color: .systemPink, centered: true)
        }
        let grip = resizeHandleRect.insetBy(dx: 3, dy: 3)
        NSColor.black.withAlphaComponent(hovered || resizing ? 0.65 : 0.38).setFill()
        NSBezierPath(roundedRect: grip, xRadius: 5, yRadius: 5).fill()
        NSColor.white.withAlphaComponent(hovered || resizing ? 0.95 : 0.65).setStroke()
        let lines = NSBezierPath(); lines.lineWidth = 1.6; lines.lineCapStyle = .round
        lines.move(to: NSPoint(x: grip.minX + 9, y: grip.maxY - 5))
        lines.line(to: NSPoint(x: grip.maxX - 5, y: grip.maxY - 5))
        lines.line(to: NSPoint(x: grip.maxX - 5, y: grip.minY + 9))
        lines.move(to: NSPoint(x: grip.minX + 5, y: grip.minY + 11))
        lines.line(to: NSPoint(x: grip.minX + 5, y: grip.minY + 5))
        lines.line(to: NSPoint(x: grip.minX + 11, y: grip.minY + 5))
        lines.move(to: NSPoint(x: grip.minX + 5, y: grip.minY + 5))
        lines.line(to: NSPoint(x: grip.maxX - 5, y: grip.maxY - 5)); lines.stroke()
    }
    override func mouseEntered(with event: NSEvent) { hovered = true; needsDisplay = true }
    override func mouseExited(with event: NSEvent) { hovered = false; hoveredRow = nil; owner?.lookUntil = 0; needsDisplay = true }
    override func mouseMoved(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        hoveredRow = rowAt(p)?.id
        if collapseRect.contains(p) { toolTip = collapsed ? text("Expand chat list") : text("Collapse chat list") }
        else if groupingRect.contains(p) { toolTip = text(owner?.grouped == true ? "Compact list" : "Group by workspace") }
        else if let workspace = workspaceAt(p) { toolTip = workspace.name + " · " + text("Click to expand or collapse workspace") }
        else if resizeHandleRect.contains(p) { toolTip = text("Drag to resize") }
        else if let row = rowAt(p) { toolTip = "\(row.title) — \(DesktopPet.statusText(row.status, language: language)) · " + text("Click to open in VS Code") }
        else { toolTip = text("Click to pet · Drag to move · Right-click for options") }
        guard let owner, !owner.sleeping, owner.overallStatus == "idle", spriteRect.contains(p), !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion else { needsDisplay = true; return }
        let angle = (atan2(p.x - spriteRect.midX, p.y - spriteRect.midY) * 180 / .pi + 360).truncatingRemainder(dividingBy: 360)
        let index = Int((angle / 22.5).rounded()) % 16
        spriteRow = 9 + index / 8; spriteColumn = index % 8; owner.lookUntil = Date.timeIntervalSinceReferenceDate + 0.7; needsDisplay = true
    }
    override func mouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        pressedWorkspaceID = workspaceAt(p)?.id
        pressedRemoveID = p.x > bounds.width - 30 ? rowAt(p)?.id : nil
        pressedThreadID = pressedRemoveID == nil ? rowAt(p)?.id : nil
        dragStart = NSEvent.mouseLocation; windowStart = window?.frame.origin ?? .zero; dragged = false
        resizing = resizeHandleRect.contains(p); resizeStartFrame = window?.frame ?? .zero
        moving = !resizing && pressedRemoveID == nil
        if resizing { pressedRemoveID = nil; pressedThreadID = nil }
    }
    override func mouseDragged(with event: NSEvent) {
        drag(to: NSEvent.mouseLocation)
    }
    func drag(to p: NSPoint) {
        if resizing {
            dragged = true
            owner?.resizeFromCorner(start: resizeStartFrame, delta: NSPoint(x: p.x - dragStart.x, y: p.y - dragStart.y))
            return
        }
        if pressedRemoveID != nil { return }
        if hypot(p.x - dragStart.x, p.y - dragStart.y) > 3 { dragged = true }
        window?.setFrameOrigin(NSPoint(x: windowStart.x + p.x - dragStart.x, y: windowStart.y + p.y - dragStart.y))
    }
    override func mouseUp(with event: NSEvent) {
        defer { pressedRemoveID = nil; pressedThreadID = nil; pressedWorkspaceID = nil; moving = false }
        if resizing { resizing = false; owner?.savePreferences(); owner?.savePosition(); owner?.resizeToList(); return }
        if dragged { owner?.snapToEdge(); owner?.savePosition(); return }
        let p = convert(event.locationInWindow, from: nil)
        if collapseRect.contains(p) { moving = false; owner?.toggleCollapsed(); return }
        if groupingRect.contains(p) { moving = false; owner?.toggleGrouped(); return }
        if let id = pressedWorkspaceID, workspaceAt(p)?.id == id { moving = false; owner?.toggleWorkspace(id); return }
        if let id = pressedRemoveID, rowAt(p)?.id == id, p.x > bounds.width - 30 { owner?.dismiss(id); return }
        if let id = pressedThreadID, rowAt(p)?.id == id, p.x <= bounds.width - 30 { owner?.openThread(id); return }
        if p.y > bounds.maxY - 30 && abs(p.x - (bounds.midX - 71)) < 14 { owner?.toggleSleep(); return }
        if p.y > bounds.maxY - 30 && abs(p.x - (bounds.midX + 71)) < 14 { owner?.closeAll(); return }
        if spriteRect.contains(p) { owner?.react() }
    }
    override func scrollWheel(with event: NSEvent) {
        guard entries.count > visibleCount, event.scrollingDeltaY != 0 else { return }
        scrollOffset += event.scrollingDeltaY < 0 ? 1 : -1; clampScroll(); needsDisplay = true
    }
    override func rightMouseDown(with event: NSEvent) {
        let p = convert(event.locationInWindow, from: nil)
        if let menu = owner?.petMenu(thread: rowAt(p)) { NSMenu.popUpContextMenu(menu, with: event, for: self) }
    }
}

final class DesktopPet: NSObject, NSApplicationDelegate {
    let directory: URL
    let testing: Bool
    let defaults = UserDefaults(suiteName: "local.codex-pet-desktop")!
    var panel: PetPanel!
    var view: DashboardView!
    var assets: [PetAsset] = []
    var selected = "codex", sleeping = false
    var selectedAt: Double = 0, sleepAt: Double = 0
    var retained: [String: ThreadActivity] = [:], dismissed: [String: Double] = [:]
    var displayThreads: [ThreadActivity] = []
    var lastObserved: [String: Date] = [:]
    var order: [String] = []
    var reactionUntil: Double = 0, lookUntil: Double = 0
    var tick = 0, lockFD: Int32 = -1
    var imagePath = ""
    var testOpenedURL: String?
    var dashboardScale: CGFloat = 1
    var grouped = false
    var foldedWorkspaces: Set<String> = []
    var collapsed = false, snapEnabled = true, completionAnimation = true, soundEnabled = false
    var presentationHidden = false
    var language = PetLanguage.english
    func text(_ key: String) -> String { language.text(key) }
    var textSize: CGFloat = 11.5, petScale: CGFloat = 1, listOpacity: CGFloat = 0.91
    var pinned = Set<String>()
    var celebrationUntil: Double = 0, completionText = ""
    var observedThreads: [String: ThreadActivity] = [:]
    var didObserve = false, notificationCount = 0
    var statusItem: NSStatusItem?
    var hotKey: EventHotKeyRef?, hotKeyHandler: EventHandlerRef?
    var animation: Timer?, polling: Timer?
    var overallStatus: String { displayThreads.contains { $0.status == "waiting" } ? "waiting" : displayThreads.contains { $0.status == "running" } ? "running" : displayThreads.contains { $0.status == "failed" } ? "failed" : !displayThreads.isEmpty && displayThreads.allSatisfy { $0.status == "ready" } ? "ready" : "idle" }
    static func statusText(_ status: String, language: PetLanguage = .english) -> String { language.text(["running": "Running", "waiting": "Waiting for your reply", "ready": "Completed", "failed": "Something went wrong", "unknown": "No update", "idle": "Idle"][status] ?? "Idle") }
    static func durationText(_ thread: ThreadActivity, language: PetLanguage = .english, now: Double = Date().timeIntervalSince1970 * 1000) -> String {
        guard let start = thread.startedAt, start > 0 else { return "–" }
        let end = thread.finishedAt ?? (thread.status == "unknown" ? thread.lastEventAt : now)
        let seconds = max(0, Int((end - start) / 1000))
        let value = seconds < 60 ? seconds : seconds < 3600 ? seconds / 60 : seconds / 3600
        return "\(value) " + language.text(seconds < 60 ? "s" : seconds < 3600 ? "min" : "h")
    }
    init(directory: URL, testing: Bool) { self.directory = directory; self.testing = testing }
    func applicationDidFinishLaunching(_ notification: Notification) {
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        lockFD = Darwin.open(directory.appendingPathComponent("desktop.lock").path, O_CREAT | O_RDWR, 0o600)
        guard lockFD >= 0, flock(lockFD, LOCK_EX | LOCK_NB) == 0 else { NSApp.terminate(nil); return }
        if !testing {
            language = PetLanguage(preference: defaults.string(forKey: "language"))
            grouped = defaults.bool(forKey: "grouped")
            foldedWorkspaces = Set(defaults.stringArray(forKey: "foldedWorkspaces") ?? [])
            collapsed = defaults.bool(forKey: "collapsed"); soundEnabled = defaults.bool(forKey: "soundEnabled")
            snapEnabled = defaults.object(forKey: "snapEnabled") == nil || defaults.bool(forKey: "snapEnabled")
            completionAnimation = defaults.object(forKey: "completionAnimation") == nil || defaults.bool(forKey: "completionAnimation")
            presentationHidden = defaults.bool(forKey: "presentationHidden")
            pinned = Set(defaults.stringArray(forKey: "pinned") ?? [])
            for (key, limits) in [("textSize", 10.0...16.0), ("petScale", 0.65...1.75), ("listOpacity", 0.3...1.0)] {
                let value = defaults.double(forKey: key)
                if value.isFinite && limits.contains(value) { if key == "textSize" { textSize = value } else if key == "petScale" { petScale = value } else { listOpacity = value } }
            }
            let savedScale = defaults.double(forKey: "dashboardScale")
            if savedScale.isFinite && savedScale > 0 { dashboardScale = min(2, max(0.65, savedScale)) }
            selected = defaults.string(forKey: "pet") ?? "codex"; sleeping = defaults.bool(forKey: "sleeping")
            selectedAt = defaults.double(forKey: "selectedAt"); sleepAt = defaults.double(forKey: "sleepAt")
            // Preserve the most recently chosen character from the previous multi-pet UI.
            for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("selectedAt.") {
                let time = defaults.double(forKey: key), id = String(key.dropFirst("selectedAt.".count))
                if time > selectedAt, let pet = defaults.string(forKey: "pet.\(id)") { selected = pet; selectedAt = time }
            }
            if let data = defaults.data(forKey: "retainedThreads"), let saved = try? JSONDecoder().decode([ThreadActivity].self, from: data) { for thread in saved { retained[thread.id] = thread; order.append(thread.id) } }
        }
        panel = PetPanel(contentRect: NSRect(x: 0, y: 0, width: 340, height: 174), styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.title = "Agent Pet — " + text("Chats"); panel.level = .floating; panel.hidesOnDeactivate = false
        panel.isFloatingPanel = true; panel.isOpaque = false; panel.backgroundColor = .clear; panel.hasShadow = false; panel.isReleasedWhenClosed = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]; panel.acceptsMouseMovedEvents = true
        view = DashboardView(frame: NSRect(x: 0, y: 0, width: 340, height: 174)); view.owner = self
        view.setAccessibilityElement(true); view.setAccessibilityRole(.group); panel.contentView = view
        restorePosition(); refresh(); step(); if !presentationHidden { panel.orderFrontRegardless() }
        if !testing || CommandLine.arguments.contains("--hotkey-self-test") { setupMenuBarAndHotKey() }
        animation = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { [weak self] _ in self?.step() }
        polling = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.refresh() }
        if testing { DispatchQueue.main.asyncAfter(deadline: .now() + 1) { self.selfTest() } }
    }
    func snapshots() -> [Snapshot] {
        let now = Date().timeIntervalSince1970 * 1000
        return ((try? FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)) ?? []).filter { $0.lastPathComponent.hasPrefix("client-") && $0.pathExtension == "json" }.compactMap { file in
            guard let data = try? Data(contentsOf: file), let s = try? JSONDecoder().decode(Snapshot.self, from: data), now - s.updatedAt < 15000 else { return nil }
            return s
        }
    }
    func mergeThreads(_ live: [Snapshot]) -> [ThreadActivity] {
        var byID = retained
        var protocolByID: [String: Int] = [:]
        for snapshot in live.sorted(by: { ($0.protocolVersion ?? 0) == ($1.protocolVersion ?? 0) ? $0.updatedAt < $1.updatedAt : ($0.protocolVersion ?? 0) < ($1.protocolVersion ?? 0) }) {
            for thread in snapshot.activity.threads ?? [] {
                if (protocolByID[thread.id] ?? 0) >= (snapshot.protocolVersion ?? 0), let previous = byID[thread.id], max(previous.lastEventAt, previous.changedAt) > max(thread.lastEventAt, thread.changedAt) { continue }
                var tagged = thread
                tagged.workspace = thread.workspace ?? snapshot.workspace ?? byID[thread.id]?.workspace
                byID[thread.id] = tagged
                protocolByID[thread.id] = snapshot.protocolVersion ?? 0
            }
        }
        // Shared folders can report the same chat from several windows. Keep its
        // existing live workspace, otherwise choose a stable identity, independent
        // of heartbeat order. Chat status still comes from the newest event above.
        var memberships: [String: [WorkspaceInfo]] = [:]
        for snapshot in live {
            for thread in snapshot.activity.threads ?? [] {
                if let workspace = thread.workspace ?? snapshot.workspace { memberships[thread.id, default: []].append(workspace) }
            }
        }
        for (id, workspaces) in memberships {
            let previous = retained[id]?.workspace
            byID[id]?.workspace = workspaces.first { $0.id == previous?.id } ?? workspaces.sorted { $0.id < $1.id }.first
        }
        return byID.values.sorted { $0.id < $1.id }
    }
    func refresh() {
        if FileManager.default.fileExists(atPath: directory.appendingPathComponent("desktop-hidden").path) && !presentationHidden { togglePresentation() }
        let request = directory.appendingPathComponent("desktop-show-request")
        if FileManager.default.fileExists(atPath: request.path) { if presentationHidden { togglePresentation() }; try? FileManager.default.removeItem(at: request) }
        let toggleRequest = directory.appendingPathComponent("desktop-presentation-request")
        if FileManager.default.fileExists(atPath: toggleRequest.path) { togglePresentation(); try? FileManager.default.removeItem(at: toggleRequest) }
        let live = snapshots(), now = Date()
        if let latest = live.max(by: { ($0.protocolVersion ?? 0) == ($1.protocolVersion ?? 0) ? $0.updatedAt < $1.updatedAt : ($0.protocolVersion ?? 0) < ($1.protocolVersion ?? 0) }) { assets = latest.pets }
        if let choice = live.max(by: { $0.selectedAt < $1.selectedAt }), choice.selectedAt > selectedAt { selected = choice.selected; selectedAt = choice.selectedAt }
        if let choice = live.max(by: { $0.sleepAt < $1.sleepAt }), choice.sleepAt > sleepAt { sleeping = choice.sleeping; sleepAt = choice.sleepAt }
        let threads = mergeThreads(live)
        for id in live.flatMap({ $0.activity.threads ?? [] }).map({ $0.id }) { lastObserved[id] = now }
        retained = Dictionary(uniqueKeysWithValues: threads.map { ($0.id, $0) })
        if !testing, let data = try? JSONEncoder().encode(threads), defaults.data(forKey: "retainedThreads") != data { defaults.set(data, forKey: "retainedThreads") }
        let trackedFile = directory.appendingPathComponent("tracked-threads.json")
        if let data = try? JSONEncoder().encode(threads.map { $0.id }.sorted()), (try? Data(contentsOf: trackedFile)) != data { try? data.write(to: trackedFile, options: .atomic) }
        for thread in threads where !order.contains(thread.id) { order.append(thread.id) }
        displayThreads = threads.compactMap { thread in
            let hiddenAt = dismissed[thread.id] ?? (testing ? 0 : defaults.double(forKey: "dismissed.\(thread.id)"))
            if hiddenAt > 0 {
                guard (thread.status == "running" || thread.status == "waiting") && (thread.startedAt ?? thread.changedAt) > hiddenAt else { return nil }
                // A new turn restores the row permanently, including after completion.
                dismissed.removeValue(forKey: thread.id)
                if !testing { defaults.removeObject(forKey: "dismissed.\(thread.id)") }
            }
            let stale = (thread.status != "waiting" && now.timeIntervalSince1970 * 1000 - thread.lastEventAt > 60 * 1000) || now.timeIntervalSince(lastObserved[thread.id] ?? .distantPast) > 15
            return ThreadActivity(id: thread.id, title: thread.title, status: (thread.status == "running" || thread.status == "waiting") && stale ? "unknown" : thread.status, changedAt: thread.changedAt, lastEventAt: thread.lastEventAt, startedAt: thread.startedAt, finishedAt: thread.finishedAt, workspace: thread.workspace)
        }.sorted { a, b in
            let ap = pinned.contains(a.id) ? 0 : a.status == "waiting" ? 1 : a.status == "running" ? 2 : 3
            let bp = pinned.contains(b.id) ? 0 : b.status == "waiting" ? 1 : b.status == "running" ? 2 : 3
            return ap == bp ? (order.firstIndex(of: a.id) ?? 0) < (order.firstIndex(of: b.id) ?? 0) : ap < bp
        }
        observeCompletions(displayThreads)
        if selected == "agent-pet" || (!assets.contains { $0.id == selected } && assets.first?.id == "agent-pet") { view.sheet = nil; imagePath = "builtin" }
        else if let asset = assets.first(where: { $0.id == selected }) ?? assets.first, asset.file != imagePath, let image = NSImage(contentsOfFile: asset.file) {
            image.size = NSSize(width: 1536, height: 2288); view.sheet = image; imagePath = asset.file
        }
        view.clampScroll(); resizeToList(); view.needsDisplay = true
        panel.invalidateCursorRects(for: view)
        view.setAccessibilityLabel("Agent Pet. " + displayThreads.map { "\($0.agentName), \($0.title): \(Self.statusText($0.status, language: language))" }.joined(separator: ". "))
        savePreferences()
    }
    func resizeToList() {
        guard !view.resizing && !view.moving else { return }
        var frame = panel.frame
        // The pet may sit at the physical screen edge, including the Dock area.
        let screen = panel.screen?.frame ?? NSScreen.main?.frame ?? frame
        let scale = min(dashboardScale, screen.width / view.logicalWidth, screen.height / view.desiredHeight)
        let height = (view.desiredHeight * scale).rounded()
        let width = (view.logicalWidth * scale).rounded()
        let atBottom = abs(frame.minY - screen.minY) <= 16
        let atRight = abs(frame.maxX - screen.maxX) <= 16
        if !atBottom { frame.origin.y += frame.height - height }
        if atRight { frame.origin.x += frame.width - width }
        frame.size = NSSize(width: width, height: height)
        frame.origin.x = min(max(frame.origin.x, screen.minX), screen.maxX - frame.width)
        frame.origin.y = min(max(frame.origin.y, screen.minY), screen.maxY - height)
        applyFrame(frame)
    }
    func applyFrame(_ frame: NSRect) {
        if panel.frame != frame { panel.setFrame(frame, display: false) }
        // Keep all drawing and hit targets in the same logical coordinates.
        view.setBoundsSize(NSSize(width: view.logicalWidth, height: view.desiredHeight))
        panel.invalidateCursorRects(for: view); view.needsDisplay = true
    }
    func resizeFromCorner(start: NSRect, delta: NSPoint) {
        let h = view.desiredHeight, w = view.logicalWidth
        let requested = start.width / w + (delta.x * w + delta.y * h) / (w * w + h * h)
        let screen = panel.screen?.frame ?? NSScreen.main?.frame ?? start
        let limit = min(2, (screen.maxX - start.minX) / w, (screen.maxY - start.minY) / h)
        dashboardScale = min(max(0.65, requested), max(0.1, limit))
        applyFrame(NSRect(origin: start.origin, size: NSSize(width: (w * dashboardScale).rounded(), height: (h * dashboardScale).rounded())))
    }
    func step() {
        guard view != nil, !presentationHidden else { return }
        let now = Date.timeIntervalSinceReferenceDate
        if sleeping { view.spriteRow = 0; view.spriteColumn = 5 }
        else if lookUntil <= now || reactionUntil > now {
            let state = reactionUntil > now || celebrationUntil > now ? "jumping" : overallStatus
            let frames = ["idle": (0, 6), "running": (7, 6), "waiting": (6, 6), "ready": (8, 6), "failed": (5, 8), "jumping": (4, 5)][state] ?? (0, 6)
            view.spriteRow = frames.0; view.spriteColumn = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion ? 0 : (state == "idle" ? tick / 10 : tick / 2) % frames.1
        }
        tick += 1; view.needsDisplay = true
    }
    func react() { if !sleeping { reactionUntil = Date.timeIntervalSinceReferenceDate + 1.5; tick = 0; step() } }
    func observeCompletions(_ threads: [ThreadActivity]) {
        let completed = threads.filter { thread in
            guard didObserve, thread.status == "ready", let previous = observedThreads[thread.id] else { return false }
            return ["running", "waiting", "unknown"].contains(previous.status) && thread.changedAt >= previous.changedAt
        }
        observedThreads = Dictionary(uniqueKeysWithValues: threads.map { ($0.id, $0) }); didObserve = true
        guard !completed.isEmpty, !presentationHidden else { return }
        if completionAnimation {
            notificationCount += 1; celebrationUntil = Date.timeIntervalSinceReferenceDate + 5
            completionText = completed.count == 1 ? "✓ " + completed[0].title : "✓ " + String(format: text("%d chats completed"), completed.count)
        }
        if soundEnabled && !testing { NSSound(named: "Glass")?.play() }
    }
    @objc func toggleGrouped() { grouped.toggle(); view.scrollOffset = 0; resizeToList(); savePreferences(); updateStatusMenu() }
    func toggleWorkspace(_ id: String) {
        if foldedWorkspaces.contains(id) { foldedWorkspaces.remove(id) } else { foldedWorkspaces.insert(id) }
        view.clampScroll(); resizeToList(); savePreferences()
    }
    @objc func selectListView(_ sender: NSMenuItem) {
        guard let value = sender.representedObject as? Bool, value != grouped else { return }
        toggleGrouped()
    }
    @objc func toggleCollapsed() { collapsed.toggle(); view.scrollOffset = 0; resizeToList(); savePreferences(); updateStatusMenu() }
    @objc func togglePresentation() {
        presentationHidden.toggle(); celebrationUntil = 0; reactionUntil = 0
        if presentationHidden { panel.orderOut(nil) } else {
            try? FileManager.default.removeItem(at: directory.appendingPathComponent("desktop-hidden"))
            panel.orderFrontRegardless()
        }
        savePreferences(); updateStatusMenu()
    }
    @objc func toggleSetting(_ item: NSMenuItem) {
        switch item.representedObject as? String {
        case "snap": snapEnabled.toggle()
        case "animation": completionAnimation.toggle()
        case "sound": soundEnabled.toggle()
        default: return
        }
        savePreferences(); updateStatusMenu()
    }
    @objc func setAppearance(_ item: NSMenuItem) {
        guard let data = item.representedObject as? [String: Any], let key = data["key"] as? String, let value = data["value"] as? Double else { return }
        switch key { case "textSize": textSize = value; case "petScale": petScale = value; case "listOpacity": listOpacity = value; default: return }
        resizeToList(); savePreferences(); updateStatusMenu()
    }
    @objc func togglePinned(_ item: NSMenuItem) {
        guard let id = item.representedObject as? String else { return }
        if pinned.contains(id) { pinned.remove(id) } else { pinned.insert(id) }
        refresh(); savePreferences()
    }
    func snapToEdge() {
        guard snapEnabled, let screen = panel.screen?.frame else { return }
        var frame = panel.frame
        if abs(frame.minX - screen.minX) <= 18 { frame.origin.x = screen.minX }
        else if abs(frame.maxX - screen.maxX) <= 18 { frame.origin.x = screen.maxX - frame.width }
        if abs(frame.minY - screen.minY) <= 18 { frame.origin.y = screen.minY }
        else if abs(frame.maxY - screen.maxY) <= 18 { frame.origin.y = screen.maxY - frame.height }
        panel.setFrameOrigin(frame.origin)
    }
    func setupMenuBarAndHotKey() {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem?.button?.image = NSImage(systemSymbolName: "pawprint", accessibilityDescription: "Agent Pet")
        statusItem?.button?.toolTip = "Agent Pet · " + text("Hide/show with ⌃⌥⌘P")
        updateStatusMenu()
        var event = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        InstallEventHandler(GetApplicationEventTarget(), { _, _, context in
            guard let context else { return OSStatus(eventNotHandledErr) }
            Unmanaged<DesktopPet>.fromOpaque(context).takeUnretainedValue().togglePresentation()
            return noErr
        }, 1, &event, Unmanaged.passUnretained(self).toOpaque(), &hotKeyHandler)
        _ = RegisterEventHotKey(UInt32(kVK_ANSI_P), UInt32(controlKey | optionKey | cmdKey), EventHotKeyID(signature: 0x43505450, id: 1), GetApplicationEventTarget(), 0, &hotKey)
        updateStatusMenu()
    }
    func updateStatusMenu() {
        statusItem?.menu = petMenu(thread: nil)
        statusItem?.button?.toolTip = "Agent Pet · " + text(hotKey == nil ? "Shortcut in use; hide/show from this menu." : "Hide/show with ⌃⌥⌘P")
    }
    @objc func chooseLanguage(_ item: NSMenuItem) {
        guard let code = item.representedObject as? String, let choice = PetLanguage(rawValue: code) else { return }
        language = choice; celebrationUntil = 0
        panel.title = "Agent Pet — " + text("Chats"); view.toolTip = nil
        savePreferences(); refresh(); updateStatusMenu()
    }
    @objc func toggleSleep() { sleeping.toggle(); sleepAt = Date().timeIntervalSince1970 * 1000; savePreferences(); step(); updateStatusMenu() }
    @objc func choosePet(_ item: NSMenuItem) { if let id = item.representedObject as? String { selected = id; selectedAt = Date().timeIntervalSince1970 * 1000; savePreferences(); refresh(); react(); updateStatusMenu() } }
    @objc func openCode() {
        let config = NSWorkspace.OpenConfiguration(); config.activates = true
        NSWorkspace.shared.openApplication(at: URL(fileURLWithPath: "/Applications/Visual Studio Code.app"), configuration: config)
    }
    func openThread(_ id: String) {
        let claude = id.hasPrefix("claude:"), session = claude ? String(id.dropFirst(7)) : id
        guard UUID(uuidString: session) != nil else { return }
        let target = claude ? "vscode://local.codex-pet-panel/claude?session=\(session)" : "vscode://openai.chatgpt/local/\(session)"
        guard let url = URL(string: target) else { return }
        if testing { testOpenedURL = url.absoluteString; return }
        NSWorkspace.shared.open(url)
    }
    @objc func closeAll() {
        try? Data().write(to: directory.appendingPathComponent("desktop-hidden"))
        if !presentationHidden { togglePresentation() }
    }
    @objc func dismissMenuRow(_ item: NSMenuItem) { if let id = item.representedObject as? String { dismiss(id) } }
    func dismiss(_ id: String) {
        let now = Date().timeIntervalSince1970 * 1000; dismissed[id] = now
        if !testing { defaults.set(now, forKey: "dismissed.\(id)") }; refresh()
    }
    @objc func clearCompleted() { for thread in displayThreads where thread.status == "ready" { dismissed[thread.id] = Date().timeIntervalSince1970 * 1000; if !testing { defaults.set(dismissed[thread.id], forKey: "dismissed.\(thread.id)") } }; refresh() }
    func clearDismissed() { dismissed.removeAll(); if !testing { for key in defaults.dictionaryRepresentation().keys where key.hasPrefix("dismissed.") { defaults.removeObject(forKey: key) } } }
    @objc func restoreDismissed() { clearDismissed(); refresh() }
    func petMenu(thread: ThreadActivity?) -> NSMenu {
        let menu = NSMenu()
        @discardableResult
        func action(_ title: String, _ selector: Selector, in parent: NSMenu, value: Any? = nil) -> NSMenuItem {
            let item = NSMenuItem(title: title, action: selector, keyEquivalent: "")
            item.target = self; item.representedObject = value; parent.addItem(item)
            return item
        }
        func group(_ title: String) -> NSMenu {
            let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
            let submenu = NSMenu(title: title); item.submenu = submenu; menu.addItem(item)
            return submenu
        }
        if let thread {
            let heading = NSMenuItem(title: thread.title, action: nil, keyEquivalent: "")
            heading.isEnabled = false; menu.addItem(heading)
            action(pinned.contains(thread.id) ? text("Unpin chat") : text("Pin chat"), #selector(togglePinned(_:)), in: menu, value: thread.id)
            action(text("Remove from list"), #selector(dismissMenuRow(_:)), in: menu, value: thread.id)
            menu.addItem(.separator())
        }
        let visibility = action(presentationHidden ? text("Show pet") : text("Hide pet"), #selector(togglePresentation), in: menu)
        visibility.keyEquivalent = "p"; visibility.keyEquivalentModifierMask = [.control, .option, .command]
        visibility.toolTip = text("Completion sound and animation are paused while hidden.")
        action(text("Return to VS Code"), #selector(openCode), in: menu)
        menu.addItem(.separator())

        let petsMenu = group(text("Pets"))
        let names = ["bsod": "BSOD", "null-signal": "Null Signal"]
        for asset in assets {
            let item = action(names[asset.id] ?? asset.name, #selector(choosePet(_:)), in: petsMenu, value: asset.id)
            item.state = asset.id == selected ? .on : .off
        }
        petsMenu.addItem(.separator())
        action(sleeping ? text("Wake up") : text("Sleep"), #selector(toggleSleep), in: petsMenu)

        let appearanceMenu = group(text("Appearance"))
        for (label, value) in [("Compact list", false), ("Extended · Workspaces", true)] {
            let item = action(text(label), #selector(selectListView(_:)), in: appearanceMenu, value: value)
            item.state = grouped == value ? .on : .off
        }
        appearanceMenu.addItem(.separator())
        for (title, key, values, current) in [(text("Text size"), "textSize", [10.0, 11.5, 13, 15], Double(textSize)), (text("Pet size"), "petScale", [0.75, 1, 1.25, 1.5], Double(petScale)), (text("List opacity"), "listOpacity", [0.35, 0.6, 0.8, 0.91, 1], Double(listOpacity))] {
            let group = NSMenuItem(title: title, action: nil, keyEquivalent: ""), submenu = NSMenu(title: title)
            for value in values {
                let label = key == "textSize" ? "\(value) pt" : "\(Int(value * 100))%"
                let choice = action(label, #selector(setAppearance(_:)), in: submenu, value: ["key": key, "value": value])
                choice.state = abs(current - value) < 0.001 ? .on : .off
            }
            group.submenu = submenu; appearanceMenu.addItem(group)
        }
        appearanceMenu.addItem(.separator())
        let snap = action(text("Snap to edges"), #selector(toggleSetting(_:)), in: appearanceMenu, value: "snap")
        snap.state = snapEnabled ? .on : .off

        let notifications = group(text("Notifications"))
        for (title, key, enabled) in [(text("Completion animation"), "animation", completionAnimation), (text("Completion sound"), "sound", soundEnabled)] {
            let item = action(title, #selector(toggleSetting(_:)), in: notifications, value: key)
            item.state = enabled ? .on : .off
        }
        let chats = group(text("Chats"))
        action(collapsed ? text("Expand list") : text("Collapse list"), #selector(toggleCollapsed), in: chats)
        chats.addItem(.separator())
        action(text("Clear completed chats"), #selector(clearCompleted), in: chats)
        action(text("Restore dismissed chats"), #selector(restoreDismissed), in: chats)
        menu.addItem(.separator())
        let languages = group(text("Language"))
        for choice in PetLanguage.allCases {
            let item = action(choice == .english ? "English" : "Türkçe", #selector(chooseLanguage(_:)), in: languages, value: choice.rawValue)
            item.state = choice == language ? .on : .off
        }
        return menu
    }
    func restorePosition() {
        let screen = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        var p = NSPoint(x: screen.maxX - 365, y: screen.minY + 45)
        if !testing, defaults.object(forKey: "dashboardX") != nil { p = NSPoint(x: defaults.double(forKey: "dashboardX"), y: defaults.double(forKey: "dashboardY")) }
        else if !testing, defaults.object(forKey: "x") != nil { p = NSPoint(x: defaults.double(forKey: "x"), y: defaults.double(forKey: "y")) }
        let target = NSScreen.screens.first(where: { $0.frame.contains(p) })?.frame ?? screen
        p.x = min(max(p.x, target.minX), target.maxX - panel.frame.width); p.y = min(max(p.y, target.minY), target.maxY - panel.frame.height)
        panel.setFrameOrigin(p)
    }
    func savePosition() { if !testing, let panel { defaults.set(panel.frame.minX, forKey: "dashboardX"); defaults.set(panel.frame.minY, forKey: "dashboardY") } }
    func savePreferences() { if !testing {
        defaults.set(language.rawValue, forKey: "language")
        for (key, value) in ["grouped": grouped, "collapsed": collapsed, "snapEnabled": snapEnabled, "completionAnimation": completionAnimation, "soundEnabled": soundEnabled, "presentationHidden": presentationHidden] { defaults.set(value, forKey: key) }
        for (key, value) in ["textSize": textSize, "petScale": petScale, "listOpacity": listOpacity, "dashboardScale": dashboardScale] { defaults.set(value, forKey: key) }
        defaults.set(Array(pinned).sorted(), forKey: "pinned")
        defaults.set(Array(foldedWorkspaces).sorted(), forKey: "foldedWorkspaces")
        defaults.set(selected, forKey: "pet"); defaults.set(selectedAt, forKey: "selectedAt"); defaults.set(sleeping, forKey: "sleeping"); defaults.set(sleepAt, forKey: "sleepAt")
    } }
    func capture(_ name: String) {
        view.display()
        if let bitmap = view.bitmapImageRepForCachingDisplay(in: view.bounds) { view.cacheDisplay(in: view.bounds, to: bitmap); if let png = bitmap.representation(using: .png, properties: [:]) { try? png.write(to: directory.appendingPathComponent(name)) } }
    }
    func testWorkspaceView() -> Bool {
        let saved = displayThreads, savedGrouped = grouped, savedFolded = foldedWorkspaces
        defer { displayThreads = saved; grouped = savedGrouped; foldedWorkspaces = savedFolded; view.scrollOffset = 0; resizeToList() }
        let a = WorkspaceInfo(id: "project-a", name: "Website"), b = WorkspaceInfo(id: "project-b", name: "Mobile App")
        let now = Date().timeIntervalSince1970 * 1000
        let first = ThreadActivity(id: "11111111-1111-4111-8111-111111111111", title: "Build the landing page", status: "running", changedAt: now, lastEventAt: now, workspace: a)
        let second = ThreadActivity(id: "claude:22222222-2222-4222-8222-222222222222", title: "Review accessibility", status: "ready", changedAt: now, lastEventAt: now, workspace: a)
        let third = ThreadActivity(id: "33333333-3333-4333-8333-333333333333", title: "Add sign in", status: "waiting", changedAt: now, lastEventAt: now, workspace: b)
        displayThreads = [first, second, third]; grouped = true; foldedWorkspaces = []; resizeToList()
        capture("dashboard-workspaces-test.png")
        let headers = view.entries.compactMap { $0.workspace }
        var valid = headers.map { $0.id } == [b.id, a.id] && view.entries.count == 5 && view.logicalWidth == 400
        valid = valid && view.rowAt(NSPoint(x: 60, y: view.rowRect(0).midY)) == nil
        func click(_ index: Int) {
            let p = view.convert(NSPoint(x: 60, y: view.rowRect(index).midY), to: nil)
            for type: NSEvent.EventType in [.leftMouseDown, .leftMouseUp] {
                let event = NSEvent.mouseEvent(with: type, location: p, modifierFlags: [], timestamp: 0, windowNumber: panel.windowNumber, context: nil, eventNumber: 0, clickCount: 1, pressure: 1)!
                if type == .leftMouseDown { view.mouseDown(with: event) } else { view.mouseUp(with: event) }
            }
        }
        testOpenedURL = nil; click(0)
        valid = valid && foldedWorkspaces.contains(b.id) && view.entries.count == 4 && testOpenedURL == nil
        click(0); click(1)
        valid = valid && testOpenedURL == "vscode://openai.chatgpt/local/33333333-3333-4333-8333-333333333333"
        click(4)
        valid = valid && testOpenedURL == "vscode://local.codex-pet-panel/claude?session=22222222-2222-4222-8222-222222222222"
        // Distinct workspaces with the same name must never merge. Old records
        // lacking workspace metadata remain visible under Other chats.
        var other = first; other.workspace = WorkspaceInfo(id: "project-c", name: a.name)
        var legacy = second; legacy.workspace = nil
        displayThreads = [first, other, legacy]
        valid = valid && view.entries.filter { $0.workspace != nil }.count == 3
        displayThreads = (0..<15).map { index in
            var t = first; t.workspace = WorkspaceInfo(id: "p-\(index)", name: String(format: "Project %02d", index)); return t
        }
        resizeToList(); view.scrollOffset = 100; view.clampScroll()
        valid = valid && view.rowAt(NSPoint(x: 60, y: view.rowRect(view.visibleCount - 1).midY))?.workspace?.id == "p-14"
        // The newest state wins while workspace ownership stays stable.
        let activity = Activity(status: "running", active: 1, threads: [first], trackingDisabled: false)
        let one = Snapshot(protocolVersion: 6, workspace: a, updatedAt: now, selectedAt: 0, sleepAt: 0, selected: "agent-pet", sleeping: false, activity: activity, pets: [])
        var copy = first; copy.workspace = nil
        let two = Snapshot(protocolVersion: 6, workspace: b, updatedAt: now + 1, selectedAt: 0, sleepAt: 0, selected: "agent-pet", sleeping: false, activity: Activity(status: "running", active: 1, threads: [copy], trackingDisabled: false), pets: [])
        valid = valid && mergeThreads([one, two]).first { $0.id == first.id }?.workspace == mergeThreads([two, one]).first { $0.id == first.id }?.workspace
        valid = valid && (try? JSONDecoder().decode(ThreadActivity.self, from: JSONEncoder().encode(first)))?.workspace == a
        return valid
    }
    func featureTests() -> [String: Any] {
        celebrationUntil = 0
        let original = displayThreads
        let workspaceViewWorks = testWorkspaceView()
        testOpenedURL = nil
        openThread("claude:44444444-4444-4444-8444-444444444444")
        let claudeLinkWorks = testOpenedURL == "vscode://local.codex-pet-panel/claude?session=44444444-4444-4444-8444-444444444444"
        testOpenedURL = nil; openThread("claude:invalid?prompt=unwanted")
        let invalidLinkRejected = testOpenedURL == nil
        let originalLanguage = language
        let englishDefault = language == .english && PetLanguage(preference: nil) == .english && PetLanguage(preference: "invalid") == .english
        let languageItem = NSMenuItem(); languageItem.representedObject = "tr"; chooseLanguage(languageItem)
        let turkishWorks = petMenu(thread: nil).items.contains { $0.title == "Petler" } && Self.statusText("unknown", language: language) == "Güncelleme yok"
        capture("dashboard-turkish-test.png")
        languageItem.representedObject = "en"; chooseLanguage(languageItem)
        let englishWorks = petMenu(thread: nil).items.contains { $0.title == "Pets" } && Self.statusText("waiting", language: language) == "Waiting for your reply"
        language = originalLanguage; refresh(); updateStatusMenu()
        let languageWorks = englishDefault && turkishWorks && englishWorks && displayThreads == original
        let beforeWidth = panel.frame.width
        toggleCollapsed()
        let collapseWorks = view.visibleCount == 0 && displayThreads.count == original.count && panel.frame.width < beforeWidth
        capture("dashboard-collapsed-test.png"); toggleCollapsed()
        var pinWorks = false
        if let last = displayThreads.last {
            let item = NSMenuItem(); item.representedObject = last.id; togglePinned(item)
            pinWorks = displayThreads.first?.id == last.id && pinned.contains(last.id)
            togglePinned(item)
        }
        for (key, value) in [("textSize", 15.0), ("petScale", 1.25), ("listOpacity", 0.6)] {
            let item = NSMenuItem(); item.representedObject = ["key": key, "value": value]; setAppearance(item)
        }
        let appearanceWorks = textSize == 15 && petScale == 1.25 && listOpacity == 0.6 && view.spriteRect.width == 140 && view.logicalWidth == 340
        capture("dashboard-appearance-test.png")
        textSize = 11.5; petScale = 1; listOpacity = 0.91; resizeToList()
        let screen = panel.screen!.frame
        let near = NSPoint(x: screen.minX + 10, y: screen.minY + 10)
        panel.setFrameOrigin(near); snapEnabled = true; snapToEdge()
        let snapWorks = panel.frame.origin == screen.origin
        panel.setFrameOrigin(near); snapEnabled = false; snapToEdge()
        let snapOffWorks = panel.frame.origin == near; snapEnabled = true
        let sample = ThreadActivity(id: "33333333-3333-4333-8333-333333333333", title: "Waiting for your reply", status: "waiting", changedAt: 1000, lastEventAt: 1000, startedAt: Date().timeIntervalSince1970 * 1000 - 120000)
        displayThreads = [sample] + original
        resizeToList(); capture("dashboard-waiting-test.png")
        let waitingWorks = overallStatus == "waiting"
        displayThreads = original; resizeToList()
        var running = sample; running = ThreadActivity(id: sample.id, title: sample.title, status: "running", changedAt: 1000, lastEventAt: 1000, startedAt: 1000)
        let completed = ThreadActivity(id: sample.id, title: sample.title, status: "ready", changedAt: 121000, lastEventAt: 121000, startedAt: 1000, finishedAt: 121000)
        let durationWorks = Self.durationText(running, now: 121000) == "2 min" && Self.durationText(completed, now: 900000) == "2 min" && Self.durationText(completed, language: .turkish, now: 900000) == "2 dk"
        didObserve = false; observedThreads = [:]; notificationCount = 0
        observeCompletions([completed]); let startupQuiet = notificationCount == 0
        observeCompletions([running]); observeCompletions([completed]); observeCompletions([completed])
        let completionWorks = startupQuiet && notificationCount == 1
        togglePresentation(); let hidden = !panel.isVisible
        observeCompletions([running]); observeCompletions([completed])
        let quiet = notificationCount == 1 && celebrationUntil == 0
        togglePresentation()
        let presentationWorks = hidden && quiet && panel.isVisible && !NSApp.isActive
        closeAll(); refresh()
        let closed = !panel.isVisible && presentationHidden
        try? Data().write(to: directory.appendingPathComponent("desktop-show-request"))
        refresh()
        let reopenWorks = closed && panel.isVisible && !presentationHidden && !FileManager.default.fileExists(atPath: directory.appendingPathComponent("desktop-hidden").path)
        closeAll(); togglePresentation(); refresh()
        let shortcutReopenWorks = panel.isVisible && !presentationHidden
        observedThreads = Dictionary(uniqueKeysWithValues: original.map { ($0.id, $0) })
        return ["workspaceViewWorks": workspaceViewWorks, "claudeLinkWorks": claudeLinkWorks, "invalidLinkRejected": invalidLinkRejected, "languageWorks": languageWorks, "reopenWorks": reopenWorks, "shortcutReopenWorks": shortcutReopenWorks, "collapseWorks": collapseWorks, "pinWorks": pinWorks, "appearanceWorks": appearanceWorks, "snapWorks": snapWorks, "snapOffWorks": snapOffWorks, "waitingWorks": waitingWorks, "durationWorks": durationWorks, "completionWorks": completionWorks, "presentationWorks": presentationWorks, "soundAvailable": NSSound(named: "Glass") != nil, "hotKeyRegistered": hotKey != nil]
    }
    func selfTest() {
        capture("dashboard-test.png")
        let initial = displayThreads
        view.scrollOffset = initial.count; view.clampScroll()
        let scrollReachesLast = initial.isEmpty || view.rowAt(NSPoint(x: 40, y: view.rowRect(view.visibleCount - 1).midY))?.id == initial.last?.id
        view.scrollOffset = 0
        let windowCount = NSApp.windows.filter { $0 is PetPanel && $0.isVisible }.count
        let before = sleeping; toggleSleep(); let sleepWorks = sleeping != before; toggleSleep()
        func mouse(_ type: NSEvent.EventType, _ x: CGFloat, _ y: CGFloat) -> NSEvent {
            NSEvent.mouseEvent(with: type, location: view.convert(NSPoint(x: x, y: y), to: nil), modifierFlags: [], timestamp: 0, windowNumber: panel.windowNumber, context: nil, eventNumber: 1, clickCount: 1, pressure: 1)!
        }
        let screen = panel.screen!.frame
        panel.setFrameOrigin(NSPoint(x: screen.minX + 20, y: screen.minY + 20))
        let resizeOrigin = panel.frame.origin
        let grip = view.resizeHandleRect
        view.mouseDown(with: mouse(.leftMouseDown, grip.midX, grip.midY))
        view.drag(to: NSPoint(x: view.dragStart.x + 136, y: view.dragStart.y + view.desiredHeight * 0.4))
        view.mouseUp(with: mouse(.leftMouseUp, view.resizeHandleRect.midX, view.resizeHandleRect.midY))
        let cornerResizeWorks = abs(dashboardScale - 1.4) < 0.001 && panel.frame.origin == resizeOrigin && abs(view.bounds.width - 340) < 0.001
        refresh()
        let refreshPreservesSize = abs(panel.frame.width - 476) <= 1 && abs(dashboardScale - 1.4) < 0.001
        capture("dashboard-resized-test.png")
        let expandedFrame = panel.frame
        resizeFromCorner(start: expandedFrame, delta: NSPoint(x: -10000, y: -10000))
        let minimumWorks = abs(dashboardScale - 0.65) < 0.001
        resizeFromCorner(start: expandedFrame, delta: NSPoint(x: 10000, y: 10000))
        let maximumWorks = dashboardScale <= 2 && panel.frame.maxX <= screen.maxX + 0.1 && panel.frame.maxY <= screen.maxY + 0.1
        dashboardScale = 1.4; applyFrame(expandedFrame)
        var rowClickOpensChat = true, dragDoesNotOpen = true, removeDoesNotOpen = true, changedRowDoesNotOpen = true
        for i in 0..<min(2, view.visibleCount) {
            let thread = displayThreads[i], y = view.rowRect(i).midY
            testOpenedURL = nil
            view.mouseDown(with: mouse(.leftMouseDown, 60, y)); view.mouseUp(with: mouse(.leftMouseUp, 60, y))
            let expected = thread.isClaude ? "vscode://local.codex-pet-panel/claude?session=\(thread.sessionID)" : "vscode://openai.chatgpt/local/\(thread.id)"
            rowClickOpensChat = rowClickOpensChat && testOpenedURL == expected
        }
        if displayThreads.count > 1 {
            let y = view.rowRect(0).midY
            testOpenedURL = nil
            view.mouseDown(with: mouse(.leftMouseDown, 60, y)); view.dragged = true; view.mouseUp(with: mouse(.leftMouseUp, 60, y))
            dragDoesNotOpen = testOpenedURL == nil
            view.mouseDown(with: mouse(.leftMouseDown, 60, y)); displayThreads.swapAt(0, 1); view.mouseUp(with: mouse(.leftMouseUp, 60, y))
            changedRowDoesNotOpen = testOpenedURL == nil; displayThreads.swapAt(0, 1)
            view.mouseDown(with: mouse(.leftMouseDown, 325, y)); view.mouseUp(with: mouse(.leftMouseUp, 325, y))
            removeDoesNotOpen = testOpenedURL == nil && displayThreads.count == initial.count - 1
            restoreDismissed()
        }
        var removeKeepsOther = true
        if let first = displayThreads.first, displayThreads.count > 1 { dismiss(first.id); removeKeepsOther = displayThreads.count == initial.count - 1; restoreDismissed() }
        var bottomCornersStay = true, listChangeKeepsCorner = true
        for right in [false, true] {
            let origin = NSPoint(x: right ? screen.maxX - panel.frame.width : screen.minX, y: screen.minY)
            panel.setFrameOrigin(origin)
            for _ in 0..<3 { refresh() }
            bottomCornersStay = bottomCornersStay && panel.frame.origin == origin
            let savedThreads = displayThreads
            displayThreads = Array(displayThreads.prefix(1)); resizeToList()
            listChangeKeepsCorner = listChangeKeepsCorner && panel.frame.minY == screen.minY && (right ? panel.frame.maxX == screen.maxX : panel.frame.minX == screen.minX)
            displayThreads = savedThreads; resizeToList()
        }
        let positionBeforeDrag = panel.frame.origin
        view.mouseDown(with: mouse(.leftMouseDown, 60, view.rowRect(0).midY))
        view.drag(to: NSPoint(x: view.dragStart.x, y: view.dragStart.y - 10))
        let positionDuringDrag = panel.frame.origin
        refresh()
        let refreshDoesNotMoveDrag = panel.frame.origin == positionDuringDrag
        view.mouseUp(with: mouse(.leftMouseUp, 60, view.rowRect(0).midY))
        panel.setFrameOrigin(positionBeforeDrag); refresh()
        var reopenedChatStaysAfterCompletion = false, dismissedSameTurnStaysHidden = false
        if let sample = displayThreads.first {
            let closedAt = Date().timeIntervalSince1970 * 1000
            dismissed[sample.id] = closedAt
            refresh()
            dismissedSameTurnStaysHidden = !displayThreads.contains { $0.id == sample.id }
            retained[sample.id] = ThreadActivity(id: sample.id, title: sample.title, status: "running", changedAt: closedAt + 1, lastEventAt: closedAt + 1)
            refresh()
            let restored = displayThreads.contains { $0.id == sample.id } && dismissed[sample.id] == nil
            retained[sample.id] = ThreadActivity(id: sample.id, title: sample.title, status: "ready", changedAt: closedAt + 2, lastEventAt: closedAt + 2)
            refresh(); refresh()
            reopenedChatStaysAfterCompletion = restored && displayThreads.contains { $0.id == sample.id && $0.status == "ready" }
        }
        let raw = initial.map { ["id": $0.id, "title": $0.title, "status": $0.status, "indicator": $0.status == "running" ? "spinner" : $0.status == "ready" ? "check" : "other"] }
        let result: [String: Any] = ["windowCount": windowCount, "appActive": NSApp.isActive, "visible": panel.isVisible, "floating": panel.level == .floating, "transparent": !panel.isOpaque, "hidesOnDeactivate": panel.hidesOnDeactivate, "spriteLoaded": view.sheet != nil, "builtinPet": imagePath == "builtin", "rows": raw, "visibleRows": view.visibleCount, "scrollReachesLast": scrollReachesLast, "removeKeepsOther": removeKeepsOther, "restoredCount": displayThreads.count, "sleepWorks": sleepWorks]
        let clicks: [String: Any] = ["reopenedChatStaysAfterCompletion": reopenedChatStaysAfterCompletion, "dismissedSameTurnStaysHidden": dismissedSameTurnStaysHidden, "bottomCornersStay": bottomCornersStay, "listChangeKeepsCorner": listChangeKeepsCorner, "refreshDoesNotMoveDrag": refreshDoesNotMoveDrag, "cornerResizeWorks": cornerResizeWorks, "refreshPreservesSize": refreshPreservesSize, "minimumWorks": minimumWorks, "maximumWorks": maximumWorks, "rowClickOpensChat": rowClickOpensChat, "dragDoesNotOpen": dragDoesNotOpen, "removeDoesNotOpen": removeDoesNotOpen, "changedRowDoesNotOpen": changedRowDoesNotOpen]
        let features = featureTests()
        if let data = try? JSONSerialization.data(withJSONObject: result.merging(clicks) { _, new in new }.merging(features) { _, new in new }, options: [.prettyPrinted, .sortedKeys]) { try? data.write(to: directory.appendingPathComponent("dashboard-test.json")); print(String(data: data, encoding: .utf8)!) }
        NSApp.terminate(nil)
    }
    func applicationWillTerminate(_ notification: Notification) { animation?.invalidate(); polling?.invalidate(); savePosition(); if let hotKey { UnregisterEventHotKey(hotKey) }; if let hotKeyHandler { RemoveEventHandler(hotKeyHandler) }; if let statusItem { NSStatusBar.system.removeStatusItem(statusItem) }; if lockFD >= 0 { flock(lockFD, LOCK_UN); Darwin.close(lockFD) } }
}

let args = CommandLine.arguments
guard let index = args.firstIndex(of: "--state-dir"), args.count > index + 1 else { fputs("Usage: codex-desktop-pet --state-dir DIRECTORY [--self-test]\n", stderr); exit(1) }
let app = NSApplication.shared; app.setActivationPolicy(.accessory)
let delegate = DesktopPet(directory: URL(fileURLWithPath: args[index + 1]), testing: args.contains("--self-test"))
app.delegate = delegate; app.run()
