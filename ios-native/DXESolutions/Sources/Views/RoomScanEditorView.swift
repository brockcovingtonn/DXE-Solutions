import SwiftUI

/// Floor-plan editor: select/drag/reshape/delete existing walls, doors,
/// windows and furniture, draw new wall segments with corner/grid
/// snapping, and place new furniture from a palette. Ports the web
/// editor's architecture — FloorPlanCanvasView draws (Canvas, no built-in
/// hit-testing), this view overlays small SwiftUI hit-target views
/// (Circle/Rectangle + DragGesture) positioned via the same
/// FloorPlanTransform so the two layers stay pixel-aligned by
/// construction. No pinch-zoom/pan here (unlike Annotate) — composing a
/// view-level zoom transform with per-object DragGesture math is a real
/// coordinate-space risk that isn't worth taking on for this first native
/// pass; "Fit to view" keeps everything visible instead, matching how the
/// web editor also has no zoom controls.
struct RoomScanEditorView: View {
    let scan: RoomScan
    var onSaved: (RoomScan) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var elements: [ScanElement]
    @State private var objects: [RoomObject]
    @State private var frozenElements: [ScanElement]
    @State private var frozenObjects: [RoomObject]
    @State private var selectedId: String?
    @State private var mode: EditorMode = .select
    @State private var draftWallStart: (x: Double, z: Double)?
    @State private var armedCategory: String?
    @State private var snapGridEnabled = false
    @State private var dirty = false
    @State private var isSaving = false
    @State private var saved = false
    @State private var errorMessage: String?
    @State private var canvasSize: CGSize = .zero
    @State private var showPaletteSheet = false
    @State private var activeDrag: ActiveDrag?
    @State private var undoStack: [Snapshot] = []
    @State private var redoStack: [Snapshot] = []

    private let maxUndoDepth = 50

    private struct Snapshot {
        let elements: [ScanElement]
        let objects: [RoomObject]
    }

    enum EditorMode { case select, drawWall, placeFurniture }
    enum EndpointSide: Equatable { case start, end }

    private struct ActiveDrag {
        enum Kind {
            case elementBody(id: String, originalStart: (Double, Double), originalEnd: (Double, Double))
            case endpoint(id: String, side: EndpointSide, original: (Double, Double))
            case furniture(id: String, originalCenter: (Double, Double))
        }
        let kind: Kind
    }

    init(scan: RoomScan, onSaved: @escaping (RoomScan) -> Void) {
        self.scan = scan
        self.onSaved = onSaved
        _elements = State(initialValue: scan.elements)
        _objects = State(initialValue: scan.objects)
        _frozenElements = State(initialValue: scan.elements)
        _frozenObjects = State(initialValue: scan.objects)
    }

    private var transform: FloorPlanTransform {
        FloorPlanTransform.fit(elements: frozenElements, objects: frozenObjects, size: canvasSize, margin: 36)
    }

    private var selectedElement: ScanElement? {
        guard let id = selectedId, id.hasPrefix("element:") else { return nil }
        let elId = String(id.dropFirst("element:".count))
        return elements.first { $0.id == elId }
    }

    private var selectedFurniture: RoomObject? {
        guard let id = selectedId, id.hasPrefix("furniture:") else { return nil }
        let objId = String(id.dropFirst("furniture:".count))
        return objects.first { $0.id == objId }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                toolbar
                HStack(spacing: 0) {
                    canvasArea
                    if horizontalSizeClass == .regular {
                        Divider()
                        FurniturePaletteView(armedKey: armedCategory, onArm: armFurniture)
                            .frame(width: 230)
                    }
                }
            }
            .background(Theme.screenBackground.ignoresSafeArea())
            .navigationTitle("Edit floor plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") { Task { await save() } }
                        .disabled(!dirty || isSaving)
                }
            }
            .sheet(isPresented: $showPaletteSheet) {
                NavigationStack {
                    FurniturePaletteView(armedKey: armedCategory) { key in
                        armFurniture(key)
                        showPaletteSheet = false
                    }
                    .navigationTitle("Furniture")
                    .navigationBarTitleDisplayMode(.inline)
                }
                .presentationDetents([.medium, .large])
            }
        }
    }

    // MARK: - Toolbar

    private var toolbar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                modeChip("Select", isActive: mode == .select) { enterSelectMode() }
                modeChip("Draw wall", isActive: mode == .drawWall) { enterDrawWallMode() }
                HStack(spacing: 2) {
                    Button { undo() } label: { Image(systemName: "arrow.uturn.backward.circle") }
                        .disabled(undoStack.isEmpty)
                    Button { redo() } label: { Image(systemName: "arrow.uturn.forward.circle") }
                        .disabled(redoStack.isEmpty)
                }
                .font(.title3)
                .foregroundColor(Theme.gold)
                if mode == .drawWall, draftWallStart != nil {
                    Button("Cancel") { draftWallStart = nil }.font(.caption)
                }
                Button {
                    snapGridEnabled.toggle()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: snapGridEnabled ? "checkmark.square.fill" : "square")
                        Text("Snap 0.5ft")
                    }.font(.caption)
                }
                if horizontalSizeClass == .compact {
                    Button(armedCategory.flatMap { FurnitureSymbols.category(forKey: $0)?.label } ?? "Add furniture") {
                        showPaletteSheet = true
                    }.font(.caption)
                }
                Button("Fit to view") { fitToView() }.font(.caption)
                Button("Delete") { deleteSelected() }.font(.caption).disabled(selectedId == nil)

                if let selectedElement {
                    Text("\(selectedElement.type) — \(String(format: "%.1f", selectedElement.lengthFt)) ft")
                        .font(.caption2).foregroundColor(.secondary)
                }
                if let selectedFurniture {
                    Text(selectedFurniture.label).font(.caption2).foregroundColor(.secondary)
                }
                if let errorMessage {
                    Text(errorMessage).font(.caption2).foregroundColor(.red)
                } else if saved {
                    Text("Saved").font(.caption2).foregroundColor(.green)
                } else if dirty {
                    Text("Unsaved changes").font(.caption2).foregroundColor(.orange)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .background(Theme.cardBackground)
    }

    private func modeChip(_ title: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(isActive ? .bold : .regular))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(isActive ? Theme.navy : Theme.cardBackground)
                .foregroundColor(isActive ? .white : Theme.textPrimary)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(Theme.cardBorder, lineWidth: isActive ? 0 : 1))
        }
    }

    // MARK: - Canvas

    private var canvasArea: some View {
        GeometryReader { geo in
            ZStack {
                FloorPlanCanvasView(elements: elements, objects: objects, selectedId: selectedId, margin: 36)
                interactionOverlay
            }
            .onAppear { canvasSize = geo.size }
            .onChange(of: geo.size) { canvasSize = $0 }
            .gesture(SpatialTapGesture().onEnded { value in handleCanvasTap(value.location) })
        }
    }

    private var interactionOverlay: some View {
        ZStack {
            ForEach(elements) { element in
                elementHitStrip(element)
            }
            if let selectedElement {
                endpointHandles(selectedElement)
            }
            ForEach(objects) { object in
                furnitureHitTarget(object)
            }
            if mode == .drawWall, let start = draftWallStart {
                let screenStart = transform.worldToScreen(start.x, start.z)
                Circle()
                    .fill(Color(red: 0.663, green: 0.475, blue: 0.235))
                    .overlay(Circle().stroke(Color.white, lineWidth: 1.5))
                    .frame(width: 12, height: 12)
                    .position(screenStart)
                    .allowsHitTesting(false)
            }
            if mode == .select {
                selectionDeleteButton
            }
        }
    }

    /// A small floating "×" right on the selected item, so deleting it
    /// doesn't require scrolling the toolbar to find "Delete".
    @ViewBuilder
    private var selectionDeleteButton: some View {
        if let selectedElement {
            let a = transform.worldToScreen(selectedElement.startX, selectedElement.startZ)
            let b = transform.worldToScreen(selectedElement.endX, selectedElement.endZ)
            let mid = CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2)
            deleteButton.position(x: mid.x, y: mid.y - 22)
        } else if let selectedFurniture {
            let center = transform.worldToScreen(selectedFurniture.centerX, selectedFurniture.centerZ)
            let halfDPx = CGFloat(selectedFurniture.depthMeters / 2) * transform.scale
            deleteButton.position(x: center.x, y: center.y - halfDPx - 16)
        }
    }

    private var deleteButton: some View {
        Button { deleteSelected() } label: {
            ZStack {
                Circle().fill(Color(red: 0.663, green: 0.475, blue: 0.235))
                Image(systemName: "xmark")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(width: 24, height: 24)
            .overlay(Circle().stroke(Color.white, lineWidth: 1.5))
        }
    }

    private func elementHitStrip(_ element: ScanElement) -> some View {
        let a = transform.worldToScreen(element.startX, element.startZ)
        let b = transform.worldToScreen(element.endX, element.endZ)
        let length = max(Foundation.hypot(b.x - a.x, b.y - a.y), 1)
        let angle = atan2(b.y - a.y, b.x - a.x)
        let mid = CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2)
        return Rectangle()
            .fill(Color.clear)
            .contentShape(Rectangle())
            .frame(width: length, height: 26)
            .rotationEffect(Angle(radians: angle))
            .position(mid)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in beginOrUpdateElementBodyDrag(element, translation: value.translation) }
                    .onEnded { _ in endDrag() }
            )
            .allowsHitTesting(mode == .select)
    }

    private func endpointHandles(_ element: ScanElement) -> some View {
        let a = transform.worldToScreen(element.startX, element.startZ)
        let b = transform.worldToScreen(element.endX, element.endZ)
        return ZStack {
            endpointHandle(element: element, side: .start, screenPoint: a)
            endpointHandle(element: element, side: .end, screenPoint: b)
        }
    }

    private func endpointHandle(element: ScanElement, side: EndpointSide, screenPoint: CGPoint) -> some View {
        Circle()
            .fill(Color(red: 0.663, green: 0.475, blue: 0.235))
            .overlay(Circle().stroke(Color.white, lineWidth: 1.5))
            .frame(width: 18, height: 18)
            .position(screenPoint)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in beginOrUpdateEndpointDrag(element, side: side, translation: value.translation) }
                    .onEnded { _ in endDrag() }
            )
            .allowsHitTesting(mode == .select)
    }

    private func furnitureHitTarget(_ object: RoomObject) -> some View {
        let center = transform.worldToScreen(object.centerX, object.centerZ)
        let halfWPx = CGFloat(object.widthMeters / 2) * transform.scale
        let halfDPx = CGFloat(object.depthMeters / 2) * transform.scale
        return Rectangle()
            .fill(Color.clear)
            .contentShape(Rectangle())
            .frame(width: max(halfWPx * 2, 24), height: max(halfDPx * 2, 24))
            .rotationEffect(Angle(radians: object.rotationRadians))
            .position(center)
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in beginOrUpdateFurnitureDrag(object, translation: value.translation) }
                    .onEnded { _ in endDrag() }
            )
            .allowsHitTesting(mode == .select)
    }

    // MARK: - Drag handling

    private func beginOrUpdateElementBodyDrag(_ element: ScanElement, translation: CGSize) {
        guard mode == .select else { return }
        if case let .elementBody(id, originalStart, originalEnd)? = activeDrag?.kind, id == element.id {
            applyElementBodyDrag(id: id, originalStart: originalStart, originalEnd: originalEnd, translation: translation)
        } else {
            // A plain tap also fires this (DragGesture(minimumDistance: 0)
            // reports onChanged immediately with translation == .zero) —
            // select on the first call, but only start tracking/mutating
            // once the finger actually moves, so a tap-to-select alone
            // doesn't spuriously mark the scan dirty.
            selectedId = "element:\(element.id)"
            guard translation != .zero else { return }
            pushUndoSnapshot()
            let originalStart = (element.startX, element.startZ)
            let originalEnd = (element.endX, element.endZ)
            activeDrag = ActiveDrag(kind: .elementBody(id: element.id, originalStart: originalStart, originalEnd: originalEnd))
            applyElementBodyDrag(id: element.id, originalStart: originalStart, originalEnd: originalEnd, translation: translation)
        }
    }

    private func applyElementBodyDrag(id: String, originalStart: (Double, Double), originalEnd: (Double, Double), translation: CGSize) {
        let dx = Double(translation.width) / Double(transform.scale)
        let dz = Double(translation.height) / Double(transform.scale)
        updateElement(id) { el in
            el.startX = originalStart.0 + dx
            el.startZ = originalStart.1 + dz
            el.endX = originalEnd.0 + dx
            el.endZ = originalEnd.1 + dz
        }
        dirty = true
        saved = false
    }

    private func beginOrUpdateEndpointDrag(_ element: ScanElement, side: EndpointSide, translation: CGSize) {
        guard mode == .select else { return }
        if case let .endpoint(id, existingSide, original)? = activeDrag?.kind, id == element.id, existingSide == side {
            applyEndpointDrag(id: id, side: side, original: original, translation: translation)
        } else {
            selectedId = "element:\(element.id)"
            guard translation != .zero else { return }
            pushUndoSnapshot()
            let original = side == .start ? (element.startX, element.startZ) : (element.endX, element.endZ)
            activeDrag = ActiveDrag(kind: .endpoint(id: element.id, side: side, original: original))
            applyEndpointDrag(id: element.id, side: side, original: original, translation: translation)
        }
    }

    private func applyEndpointDrag(id: String, side: EndpointSide, original: (Double, Double), translation: CGSize) {
        let dx = Double(translation.width) / Double(transform.scale)
        let dz = Double(translation.height) / Double(transform.scale)
        var point: (x: Double, z: Double) = (x: original.0 + dx, z: original.1 + dz)
        let others = elements.filter { $0.id != id }
        if let snapped = FloorPlanGeometryMath.snapToEndpoint(point, elements: others) {
            point = snapped
        } else if snapGridEnabled {
            point = FloorPlanGeometryMath.snapToGrid(point)
        }
        updateElement(id) { el in
            if side == .start {
                el.startX = point.x
                el.startZ = point.z
            } else {
                el.endX = point.x
                el.endZ = point.z
            }
            el.lengthFt = FloorPlanGeometryMath.distanceFt(from: (el.startX, el.startZ), to: (el.endX, el.endZ))
        }
        dirty = true
        saved = false
    }

    private func beginOrUpdateFurnitureDrag(_ object: RoomObject, translation: CGSize) {
        guard mode == .select else { return }
        if case let .furniture(id, originalCenter)? = activeDrag?.kind, id == object.id {
            applyFurnitureDrag(id: id, originalCenter: originalCenter, translation: translation)
        } else {
            selectedId = "furniture:\(object.id)"
            guard translation != .zero else { return }
            pushUndoSnapshot()
            let originalCenter = (object.centerX, object.centerZ)
            activeDrag = ActiveDrag(kind: .furniture(id: object.id, originalCenter: originalCenter))
            applyFurnitureDrag(id: object.id, originalCenter: originalCenter, translation: translation)
        }
    }

    private func applyFurnitureDrag(id: String, originalCenter: (Double, Double), translation: CGSize) {
        let dx = Double(translation.width) / Double(transform.scale)
        let dz = Double(translation.height) / Double(transform.scale)
        updateObject(id) { obj in
            obj.centerX = originalCenter.0 + dx
            obj.centerZ = originalCenter.1 + dz
        }
        dirty = true
        saved = false
    }

    private func endDrag() {
        guard activeDrag != nil else { return }
        activeDrag = nil
        frozenElements = elements
        frozenObjects = objects
    }

    private func updateElement(_ id: String, _ mutate: (inout ScanElement) -> Void) {
        guard let idx = elements.firstIndex(where: { $0.id == id }) else { return }
        mutate(&elements[idx])
    }

    private func updateObject(_ id: String, _ mutate: (inout RoomObject) -> Void) {
        guard let idx = objects.firstIndex(where: { $0.id == id }) else { return }
        mutate(&objects[idx])
    }

    // MARK: - Draw wall / place furniture

    private func handleCanvasTap(_ location: CGPoint) {
        if mode == .select {
            selectedId = nil
            return
        }
        let world = transform.screenToWorld(location)
        var point: (x: Double, z: Double) = (x: world.x, z: world.z)
        if let snapped = FloorPlanGeometryMath.snapToEndpoint(point, elements: elements) {
            point = snapped
        } else if snapGridEnabled {
            point = FloorPlanGeometryMath.snapToGrid(point)
        }

        if mode == .drawWall {
            if let start = draftWallStart {
                commitWall(start: start, end: point)
                draftWallStart = point
            } else {
                draftWallStart = point
            }
        } else if mode == .placeFurniture, let category = armedCategory {
            placeFurniture(categoryKey: category, at: point)
        }
    }

    private func commitWall(start: (x: Double, z: Double), end: (x: Double, z: Double)) {
        let lengthFt = FloorPlanGeometryMath.distanceFt(from: start, to: end)
        guard lengthFt >= 0.1 else { return }
        pushUndoSnapshot()
        let wallCount = elements.filter { $0.type == "wall" }.count
        let newWall = ScanElement(
            type: "wall", label: "Wall \(wallCount + 1)",
            lengthFt: lengthFt, heightFt: FloorPlanGeometryMath.defaultHeightFt(elements),
            startX: start.x, startZ: start.z, endX: end.x, endZ: end.z
        )
        elements.append(newWall)
        dirty = true
        saved = false
        frozenElements = elements
        frozenObjects = objects
    }

    private func placeFurniture(categoryKey: String, at point: (x: Double, z: Double)) {
        guard let category = FurnitureSymbols.category(forKey: categoryKey) else { return }
        pushUndoSnapshot()
        let writeCategory = category.resolvedWriteCategory
        let count = objects.filter { $0.category == writeCategory }.count + 1
        let newObject = RoomObject(
            category: writeCategory, label: "\(category.resolvedPlacedLabel) \(count)",
            centerX: point.x, centerZ: point.z,
            widthMeters: category.defaultWidthM, depthMeters: category.defaultDepthM,
            rotationRadians: 0
        )
        objects.append(newObject)
        dirty = true
        saved = false
        frozenElements = elements
        frozenObjects = objects
        // Return to Select and select the just-placed item, rather than
        // staying armed indefinitely — placing one item at a time reads
        // more clearly on a touch screen than a "stay armed" model, and
        // this also means Delete is immediately available if it's wrong.
        selectedId = "furniture:\(newObject.id)"
        mode = .select
        armedCategory = nil
    }

    // MARK: - Modes / toolbar actions

    private func enterSelectMode() {
        mode = .select
        draftWallStart = nil
        armedCategory = nil
    }

    private func enterDrawWallMode() {
        mode = .drawWall
        selectedId = nil
        draftWallStart = nil
        armedCategory = nil
    }

    private func armFurniture(_ key: String?) {
        guard let key else {
            enterSelectMode()
            return
        }
        mode = .placeFurniture
        selectedId = nil
        draftWallStart = nil
        armedCategory = key
    }

    private func fitToView() {
        frozenElements = elements
        frozenObjects = objects
    }

    private func deleteSelected() {
        guard let id = selectedId else { return }
        pushUndoSnapshot()
        if id.hasPrefix("element:") {
            let elId = String(id.dropFirst("element:".count))
            elements.removeAll { $0.id == elId }
        } else if id.hasPrefix("furniture:") {
            let objId = String(id.dropFirst("furniture:".count))
            objects.removeAll { $0.id == objId }
        }
        selectedId = nil
        dirty = true
        saved = false
        frozenElements = elements
        frozenObjects = objects
    }

    // MARK: - Undo / redo

    private func pushUndoSnapshot() {
        undoStack.append(Snapshot(elements: elements, objects: objects))
        if undoStack.count > maxUndoDepth { undoStack.removeFirst() }
        redoStack.removeAll()
    }

    private func undo() {
        guard let last = undoStack.popLast() else { return }
        redoStack.append(Snapshot(elements: elements, objects: objects))
        elements = last.elements
        objects = last.objects
        frozenElements = elements
        frozenObjects = objects
        selectedId = nil
        dirty = true
        saved = false
    }

    private func redo() {
        guard let next = redoStack.popLast() else { return }
        undoStack.append(Snapshot(elements: elements, objects: objects))
        elements = next.elements
        objects = next.objects
        frozenElements = elements
        frozenObjects = objects
        selectedId = nil
        dirty = true
        saved = false
    }

    // MARK: - Save

    private func save() async {
        isSaving = true
        errorMessage = nil
        defer { isSaving = false }
        do {
            let response: RoomScanResponse = try await APIClient.sendDecoding(
                "api/design-studio/scans/\(scan.id)", method: "PATCH",
                body: RoomScanEditPayload(elements: elements, objects: objects)
            )
            frozenElements = elements
            frozenObjects = objects
            dirty = false
            saved = true
            HapticManager.success()
            onSaved(response.scan)
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not save the floor plan."
        }
    }
}
