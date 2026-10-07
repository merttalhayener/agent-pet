import AppKit
import ImageIO

enum CustomPetPose: String, CaseIterable {
    case normal, running, waiting, ready, sleeping
    var title: String {
        switch self {
        case .normal: return "Normal / idle"
        case .running: return "Running"
        case .waiting: return "Waiting for your reply"
        case .ready: return "Completed / happy"
        case .sleeping: return "Sleeping"
        }
    }
    static func resolve(status: String, sleeping: Bool, reacting: Bool) -> Self {
        if sleeping { return .sleeping }
        if status == "waiting" { return .waiting }
        if status == "running" { return .running }
        if reacting || status == "ready" { return .ready }
        return .normal
    }
}

struct CustomPet: Codable {
    let id: String
    let revision: String
    var name: String
    var poses: [String]
    var scale: Double
    var mirrored: Bool
    var motion: Bool
    var valid: Bool {
        id.hasPrefix("custom-") && UUID(uuidString: String(id.dropFirst(7))) != nil &&
        UUID(uuidString: revision) != nil && !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        name.count <= 60 && scale.isFinite && (0.5...1.5).contains(scale) &&
        poses.contains("normal") && Set(poses).count == poses.count &&
        poses.allSatisfy { CustomPetPose(rawValue: $0) != nil }
    }
}

enum CustomPetError: Error, LocalizedError {
    case invalidImage, invalidName, missingNormal, invalidLibrary
    var errorDescription: String? {
        switch self {
        case .invalidImage: return "Choose a PNG up to 10 MB and 4096 × 4096 pixels."
        case .invalidName: return "Enter a pet name of 1–60 characters."
        case .missingNormal: return "Choose a normal pose before saving."
        case .invalidLibrary: return "The custom pet library could not be read. Your saved files have been kept."
        }
    }
}

// Only the native editor imports files. Snapshots contain IDs, never trusted image paths.
// Each save writes an immutable revision, then atomically commits the library index.
final class CustomPetLibrary {
    let root: URL
    private(set) var pets: [CustomPet] = []
    private(set) var loadError: Error?
    private var images: [String: NSImage] = [:]
    private var missingImages = Set<String>()
    private let fm = FileManager.default
    init(root: URL) { self.root = root; reload() }
    func reload() {
        images.removeAll(); missingImages.removeAll(); loadError = nil
        let index = root.appendingPathComponent("library.json")
        guard fm.fileExists(atPath: index.path) else { pets = []; return }
        do {
            let data = try Data(contentsOf: index)
            guard data.count <= 1024 * 1024 else { throw CustomPetError.invalidLibrary }
            let saved = try JSONDecoder().decode([CustomPet].self, from: data)
            guard saved.allSatisfy({ $0.valid }), Set(saved.map { $0.id }).count == saved.count else { throw CustomPetError.invalidLibrary }
            pets = saved
        } catch { pets = []; loadError = CustomPetError.invalidLibrary }
    }
    func pet(_ id: String) -> CustomPet? { pets.first { $0.id == id } }
    private func folder(_ pet: CustomPet) -> URL { root.appendingPathComponent(pet.id).appendingPathComponent(pet.revision) }
    private func file(_ pet: CustomPet, _ pose: CustomPetPose) -> URL { folder(pet).appendingPathComponent(pose.rawValue + ".png") }
    static func png(at url: URL) throws -> Data {
        let size = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
        guard size.isRegularFile == true, let bytes = size.fileSize, bytes > 0, bytes <= 10 * 1024 * 1024 else { throw CustomPetError.invalidImage }
        return try normalizedPNG(Data(contentsOf: url))
    }
    static func normalizedPNG(_ data: Data) throws -> Data {
        guard data.count <= 10 * 1024 * 1024,
              let source = CGImageSourceCreateWithData(data as CFData, [kCGImageSourceShouldCache: false] as CFDictionary),
              CGImageSourceGetType(source) as String? == "public.png", CGImageSourceGetCount(source) == 1,
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? Int, let height = properties[kCGImagePropertyPixelHeight] as? Int,
              (1...4096).contains(width), (1...4096).contains(height),
              let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [kCGImageSourceCreateThumbnailFromImageAlways: true,
                  kCGImageSourceThumbnailMaxPixelSize: 1024, kCGImageSourceCreateThumbnailWithTransform: true] as CFDictionary),
              let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else { throw CustomPetError.invalidImage }
        return png
    }
    func data(_ pet: CustomPet, pose: CustomPetPose) -> Data? {
        guard pet.valid, pet.poses.contains(pose.rawValue) else { return nil }
        // Imported files are bounded again on read, including after manual disk edits.
        return try? Self.png(at: file(pet, pose))
    }
    func image(_ pet: CustomPet, pose: CustomPetPose) -> NSImage? {
        let key = pet.id + "/" + pet.revision + "/" + pose.rawValue
        if let cached = images[key] { return cached }
        if missingImages.contains(key) { return nil }
        guard let data = data(pet, pose: pose), let image = NSImage(data: data) else { missingImages.insert(key); return nil }
        images[key] = image; return image
    }
    func available(_ id: String) -> Bool { guard let pet = pet(id) else { return false }; return image(pet, pose: .normal) != nil }
    @discardableResult func save(id: String?, name: String, poses: [CustomPetPose: Data], scale: Double, mirrored: Bool, motion: Bool) throws -> CustomPet {
        guard loadError == nil else { throw CustomPetError.invalidLibrary }
        let name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, name.count <= 60 else { throw CustomPetError.invalidName }
        guard poses[.normal] != nil else { throw CustomPetError.missingNormal }
        let old = id.flatMap { pet($0) }
        let saved = CustomPet(id: old?.id ?? "custom-" + UUID().uuidString.lowercased(), revision: UUID().uuidString.lowercased(),
                              name: name, poses: CustomPetPose.allCases.filter { poses[$0] != nil }.map { $0.rawValue },
                              scale: scale, mirrored: mirrored, motion: motion)
        guard saved.valid else { throw CustomPetError.invalidLibrary }
        let target = folder(saved)
        do {
            try fm.createDirectory(at: target, withIntermediateDirectories: true)
            for (pose, data) in poses { try Self.normalizedPNG(data).write(to: file(saved, pose), options: .atomic) }
            var updated = pets.filter { $0.id != saved.id }; updated.append(saved)
            try JSONEncoder().encode(updated).write(to: root.appendingPathComponent("library.json"), options: .atomic)
            pets = updated; images.removeAll(); missingImages.removeAll()
        } catch { try? fm.removeItem(at: target); throw error }
        if let old { try? fm.removeItem(at: folder(old)) }
        return saved
    }
    func remove(_ id: String) throws {
        guard loadError == nil else { throw CustomPetError.invalidLibrary }
        guard let old = pet(id), old.valid else { return }
        let updated = pets.filter { $0.id != id }
        try JSONEncoder().encode(updated).write(to: root.appendingPathComponent("library.json"), options: .atomic)
        pets = updated; images.removeAll(); missingImages.removeAll()
        try? fm.removeItem(at: root.appendingPathComponent(old.id))
    }
    @discardableResult func draw(id: String, in rect: NSRect, tick: Int, status: String, sleeping: Bool, reacting: Bool, reducedMotion: Bool) -> Bool {
        guard let pet = pet(id), let normal = image(pet, pose: .normal) else { return false }
        let pose = CustomPetPose.resolve(status: status, sleeping: sleeping, reacting: reacting)
        let image = image(pet, pose: pose) ?? normal
        Self.draw(image: image, in: rect, scale: 1, mirrored: pet.mirrored, tick: tick,
                  moving: pet.motion && !reducedMotion && !sleeping, reacting: reacting)
        // Keep status visible even when only the normal pose was provided.
        let symbol = sleeping ? "z" : status == "waiting" ? "!" : status == "running" ? "•••" : status == "ready" || reacting ? "✓" : status == "failed" ? "!" : ""
        if !symbol.isEmpty {
            let badge = NSRect(x: rect.maxX - 22, y: rect.maxY - 26, width: 22, height: 20)
            let color: NSColor = sleeping ? .systemPurple : status == "waiting" ? .systemYellow : status == "failed" ? .systemRed : .systemTeal
            color.setFill(); NSBezierPath(roundedRect: badge, xRadius: 7, yRadius: 7).fill()
            let paragraph = NSMutableParagraphStyle(); paragraph.alignment = .center
            (symbol as NSString).draw(in: badge.insetBy(dx: 1, dy: 2), withAttributes: [.font: NSFont.systemFont(ofSize: 12, weight: .bold), .foregroundColor: NSColor.black, .paragraphStyle: paragraph])
        }
        return true
    }
    static func draw(image: NSImage, in rect: NSRect, scale: Double, mirrored: Bool, tick: Int, moving: Bool, reacting: Bool) {
        let fit = min(rect.width * 0.88 / image.size.width, rect.height * 0.88 / image.size.height) * scale
        let size = NSSize(width: image.size.width * fit, height: image.size.height * fit)
        let bounce: CGFloat = moving ? (reacting ? abs(sin(CGFloat(tick) * 0.23)) * 5 : sin(CGFloat(tick) * 0.06) * 1.5) : 0
        let target = NSRect(x: rect.midX - size.width / 2, y: rect.minY + 4 + bounce, width: size.width, height: size.height)
        NSGraphicsContext.saveGraphicsState(); defer { NSGraphicsContext.restoreGraphicsState() }
        NSBezierPath(rect: rect).addClip()
        if mirrored { let transform = NSAffineTransform(); transform.translateX(by: rect.midX * 2, yBy: 0); transform.scaleX(by: -1, yBy: 1); transform.concat() }
        image.draw(in: target, from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: true, hints: nil)
    }
}
