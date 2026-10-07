import AppKit
import UniformTypeIdentifiers

final class CustomPetPreview: NSView {
    weak var editor: CustomPetEditor?
    override func draw(_ dirtyRect: NSRect) {
        NSGraphicsContext.saveGraphicsState(); defer { NSGraphicsContext.restoreGraphicsState() }
        NSBezierPath(roundedRect: bounds, xRadius: 12, yRadius: 12).addClip()
        NSColor(calibratedWhite: 0.13, alpha: 1).setFill()
        NSBezierPath(roundedRect: bounds, xRadius: 12, yRadius: 12).fill()
        // A checkerboard makes transparent areas and unwanted backgrounds visible.
        NSColor.white.withAlphaComponent(0.05).setFill()
        for x in stride(from: 0, to: Int(bounds.width), by: 16) {
            for y in stride(from: 0, to: Int(bounds.height), by: 16) where (x / 16 + y / 16) % 2 == 0 {
                NSRect(x: x, y: y, width: 16, height: 16).fill()
            }
        }
        guard let editor else { return }
        let pose = editor.previewPose
        guard let image = editor.previewImages[pose] ?? editor.previewImages[.normal] else { return }
        let scale = editor.sizeSlider.doubleValue
        let rect = NSRect(x: bounds.midX - 72 * scale, y: 20, width: 144 * scale, height: 156 * scale)
        CustomPetLibrary.draw(image: image, in: rect, scale: 1, mirrored: editor.mirrorButton.state == .on,
                              tick: editor.tick, moving: editor.motionButton.state == .on && pose != .sleeping && !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion,
                              reacting: pose == .ready)
    }
}

final class CustomPetEditor: NSWindowController, NSWindowDelegate {
    let library: CustomPetLibrary
    let existingID: String?
    let language: PetLanguage
    var onSaved: ((CustomPet) -> Void)?
    var onRemoved: ((String) -> Void)?
    var onClosed: (() -> Void)?
    var poses: [CustomPetPose: Data] = [:]
    private(set) var previewImages: [CustomPetPose: NSImage] = [:]
    let nameField = NSTextField()
    let mirrorButton = NSButton(checkboxWithTitle: "", target: nil, action: nil)
    let motionButton = NSButton(checkboxWithTitle: "", target: nil, action: nil)
    let sizeSlider = NSSlider(value: 1, minValue: 0.5, maxValue: 1.5, target: nil, action: nil)
    let sizeLabel = NSTextField(labelWithString: "100%")
    let posePicker = NSPopUpButton()
    let preview = CustomPetPreview()
    let errorLabel = NSTextField(wrappingLabelWithString: "")
    var poseLabels: [CustomPetPose: NSTextField] = [:]
    var poseImages: [CustomPetPose: NSImageView] = [:]
    var tick = 0
    private var timer: Timer?
    var previewPose: CustomPetPose { CustomPetPose.allCases[max(0, posePicker.indexOfSelectedItem)] }
    func text(_ key: String) -> String { language.text(key) }

    init(library: CustomPetLibrary, pet: CustomPet?, language: PetLanguage) {
        self.library = library; existingID = pet?.id; self.language = language
        let window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 760, height: 610), styleMask: [.titled, .closable], backing: .buffered, defer: false)
        super.init(window: window)
        window.title = text(pet == nil ? "Add custom pet" : "Edit custom pet")
        window.isReleasedWhenClosed = false; window.delegate = self
        window.level = .floating; window.collectionBehavior = [.moveToActiveSpace, .fullScreenAuxiliary]
        if let pet {
            nameField.stringValue = pet.name; sizeSlider.doubleValue = pet.scale
            mirrorButton.state = pet.mirrored ? .on : .off; motionButton.state = pet.motion ? .on : .off
            for pose in CustomPetPose.allCases { poses[pose] = library.data(pet, pose: pose) }
        } else { motionButton.state = .on }
        build(); preview.editor = self; updatePreview()
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    private func label(_ string: String, frame: NSRect, small: Bool = false) -> NSTextField {
        let label = NSTextField(wrappingLabelWithString: text(string)); label.frame = frame
        if small { label.font = .systemFont(ofSize: 11); label.textColor = .secondaryLabelColor }
        window?.contentView?.addSubview(label); return label
    }
    private func button(_ title: String, action: Selector, frame: NSRect, value: String? = nil) -> NSButton {
        let button = NSButton(title: text(title), target: self, action: action); button.frame = frame
        button.bezelStyle = .rounded; button.identifier = value.map { NSUserInterfaceItemIdentifier($0) }
        window?.contentView?.addSubview(button); return button
    }
    private func build() {
        guard let content = window?.contentView else { return }
        _ = label("Pet name", frame: NSRect(x: 24, y: 558, width: 110, height: 22))
        nameField.frame = NSRect(x: 135, y: 553, width: 590, height: 28)
        nameField.placeholderString = text("Your companion’s name"); content.addSubview(nameField)
        _ = label("One normal PNG is enough. Other poses are optional and fall back to normal.", frame: NSRect(x: 24, y: 502, width: 415, height: 40), small: true)
        for (index, pose) in CustomPetPose.allCases.enumerated() {
            let y = CGFloat(422 - index * 68)
            let image = NSImageView(frame: NSRect(x: 24, y: y, width: 48, height: 56)); image.imageScaling = .scaleProportionallyUpOrDown
            content.addSubview(image); poseImages[pose] = image
            _ = label(pose.title, frame: NSRect(x: 82, y: y + 31, width: 193, height: 22))
            poseLabels[pose] = label("", frame: NSRect(x: 82, y: y + 5, width: 193, height: 22), small: true)
            let choose = button("Choose PNG…", action: #selector(choosePNG(_:)), frame: NSRect(x: 278, y: y + 25, width: 153, height: 28), value: pose.rawValue)
            choose.setAccessibilityLabel(text(pose.title) + ": " + text("Choose PNG…"))
            let clear = button("Clear", action: #selector(clearPose(_:)), frame: NSRect(x: 333, y: y - 1, width: 98, height: 26), value: pose.rawValue)
            clear.setAccessibilityLabel(text(pose.title) + ": " + text("Clear"))
        }
        posePicker.frame = NSRect(x: 466, y: 500, width: 270, height: 28)
        posePicker.addItems(withTitles: CustomPetPose.allCases.map { text($0.title) })
        posePicker.target = self; posePicker.action = #selector(changed(_:)); content.addSubview(posePicker)
        preview.frame = NSRect(x: 466, y: 238, width: 270, height: 250); content.addSubview(preview)
        _ = label("Preview", frame: NSRect(x: 466, y: 533, width: 270, height: 22))
        _ = label("Pet size", frame: NSRect(x: 466, y: 204, width: 110, height: 22))
        sizeLabel.frame = NSRect(x: 676, y: 204, width: 60, height: 22); sizeLabel.alignment = .right; content.addSubview(sizeLabel)
        sizeSlider.frame = NSRect(x: 466, y: 171, width: 270, height: 26)
        sizeSlider.target = self; sizeSlider.action = #selector(changed(_:)); sizeSlider.isContinuous = true; content.addSubview(sizeSlider)
        sizeSlider.setAccessibilityLabel(text("Pet size"))
        mirrorButton.title = text("Flip horizontally"); mirrorButton.frame = NSRect(x: 466, y: 134, width: 270, height: 24)
        mirrorButton.target = self; mirrorButton.action = #selector(changed(_:)); content.addSubview(mirrorButton)
        motionButton.title = text("Gentle movement"); motionButton.frame = NSRect(x: 466, y: 103, width: 270, height: 24)
        motionButton.target = self; motionButton.action = #selector(changed(_:)); content.addSubview(motionButton)
        _ = label("Use transparent PNGs with matching canvas sizes and alignment. Images stay on this Mac.", frame: NSRect(x: 24, y: 78, width: 415, height: 42), small: true)
        errorLabel.frame = NSRect(x: 24, y: 45, width: 710, height: 32); errorLabel.font = .systemFont(ofSize: 11); errorLabel.textColor = .systemRed; content.addSubview(errorLabel)
        if existingID != nil { _ = button("Delete pet…", action: #selector(deletePet), frame: NSRect(x: 24, y: 9, width: 135, height: 30)) }
        let cancel = button("Cancel", action: #selector(cancel), frame: NSRect(x: 520, y: 9, width: 100, height: 30)); cancel.keyEquivalent = "\u{1b}"
        let save = button("Save pet", action: #selector(savePet), frame: NSRect(x: 627, y: 9, width: 110, height: 30)); save.keyEquivalent = "\r"
    }
    func present() {
        window?.center(); showWindow(nil); NSApp.activate(ignoringOtherApps: true); window?.makeKeyAndOrderFront(nil)
        if timer == nil { timer = Timer.scheduledTimer(withTimeInterval: 0.08, repeats: true) { [weak self] _ in
            guard let self else { return }; self.tick += 1; self.preview.needsDisplay = true
        } }
    }
    func updatePreview() {
        sizeLabel.stringValue = "\(Int((sizeSlider.doubleValue * 100).rounded()))%"
        previewImages = poses.compactMapValues { NSImage(data: $0) }
        for pose in CustomPetPose.allCases {
            poseImages[pose]?.image = previewImages[pose]
            poseLabels[pose]?.stringValue = text(poses[pose] != nil ? "Image selected" : pose == .normal ? "Required" : "Uses normal pose")
        }
        preview.needsDisplay = true
    }
    @objc func changed(_ sender: Any?) { updatePreview() }
    func importPNG(_ url: URL, pose: CustomPetPose) throws {
        poses[pose] = try CustomPetLibrary.png(at: url); errorLabel.stringValue = ""
        posePicker.selectItem(at: CustomPetPose.allCases.firstIndex(of: pose)!); updatePreview()
    }
    @objc func choosePNG(_ sender: NSButton) {
        guard let window, let key = sender.identifier?.rawValue, let pose = CustomPetPose(rawValue: key) else { return }
        let picker = NSOpenPanel(); picker.allowedContentTypes = [.png]; picker.allowsMultipleSelection = false
        picker.canChooseDirectories = false; picker.message = text(pose.title)
        picker.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .OK, let url = picker.url else { return }
            do { try self.importPNG(url, pose: pose) } catch { self.show(error) }
        }
    }
    @objc func clearPose(_ sender: NSButton) {
        guard let key = sender.identifier?.rawValue, let pose = CustomPetPose(rawValue: key) else { return }
        poses.removeValue(forKey: pose); errorLabel.stringValue = ""; updatePreview()
    }
    @discardableResult func commit() throws -> CustomPet {
        try library.save(id: existingID, name: nameField.stringValue, poses: poses, scale: sizeSlider.doubleValue,
                         mirrored: mirrorButton.state == .on, motion: motionButton.state == .on)
    }
    private func show(_ error: Error) { errorLabel.stringValue = text(error.localizedDescription) }
    @objc func savePet() { do { let pet = try commit(); onSaved?(pet); close() } catch { show(error) } }
    @objc func cancel() { close() }
    @objc func deletePet() {
        guard let window, let id = existingID, let pet = library.pet(id) else { return }
        let alert = NSAlert(); alert.messageText = String(format: text("Delete %@?"), pet.name)
        alert.informativeText = text("This removes this pet and its imported images from this Mac.")
        alert.addButton(withTitle: text("Delete")); alert.addButton(withTitle: text("Cancel"))
        alert.beginSheetModal(for: window) { [weak self] response in
            guard let self, response == .alertFirstButtonReturn else { return }
            do { try self.library.remove(id); self.onRemoved?(id); self.close() } catch { self.show(error) }
        }
    }
    func windowWillClose(_ notification: Notification) { timer?.invalidate(); timer = nil; onClosed?() }
}
