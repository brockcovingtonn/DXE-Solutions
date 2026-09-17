import Foundation
import RoomPlan
import UIKit
import PencilKit
import simd

// Pure geometry helpers over a finished CapturedRoom: square footage and a
// drawn-from-scratch top-down floor plan. RoomPlan doesn't hand you either
// directly — floor area has to be computed from the captured polygon (or
// approximated from the wall layout on iOS 16, before CapturedRoom.floors
// existed), and there's no built-in 2D render, only the 3D export.
enum RoomScanGeometry {
    private static let sqMetersToSqFeet: Double = 10.7639
    private static let metersToFeet: Double = 3.28084

    /// One ScanElement per wall/door/window, in capture order — the
    /// starting point for the Annotate screen's editable measurement list.
    /// dimensions.x is the surface's width, dimensions.y its height (see
    /// endpoints(for:) above for the same convention).
    static func extractElements(_ room: CapturedRoom) -> [ScanElement] {
        func elements(_ surfaces: [CapturedRoom.Surface], type: String, prefix: String) -> [ScanElement] {
            surfaces.enumerated().map { index, surface in
                let (start, end) = endpoints(for: surface)
                return ScanElement(
                    type: type,
                    label: "\(prefix) \(index + 1)",
                    lengthFt: Double(surface.dimensions.x) * metersToFeet,
                    heightFt: Double(surface.dimensions.y) * metersToFeet,
                    startX: Double(start.x), startZ: Double(start.y),
                    endX: Double(end.x), endZ: Double(end.y)
                )
            }
        }
        return elements(room.walls, type: "wall", prefix: "Wall")
            + elements(room.doors, type: "door", prefix: "Door")
            + elements(room.windows, type: "window", prefix: "Window")
    }

    /// Furniture/fixtures RoomPlan's on-device classifier detected —
    /// already produced for every scan and already used for the 3D GLB
    /// export (RoomScanGLBExporter), just not previously persisted or
    /// drawn on the 2D plan. No dedicated "island"/"cabinet" category
    /// exists in RoomPlan; those get classified generically as `.storage`
    /// if picked up at all.
    static func extractObjects(_ room: CapturedRoom) -> [RoomObject] {
        var countsByCategory: [String: Int] = [:]
        return room.objects.map { object in
            let label = categoryLabel(object.category)
            countsByCategory[label, default: 0] += 1
            let t = object.transform
            let xAxis = SIMD3<Float>(t.columns.0.x, t.columns.0.y, t.columns.0.z)
            let rotation = atan2(Double(xAxis.z), Double(xAxis.x))
            return RoomObject(
                category: categoryKey(object.category),
                label: "\(label) \(countsByCategory[label] ?? 1)",
                centerX: Double(t.columns.3.x), centerZ: Double(t.columns.3.z),
                widthMeters: Double(object.dimensions.x), depthMeters: Double(object.dimensions.z),
                rotationRadians: rotation
            )
        }
    }

    private static func categoryKey(_ category: CapturedRoom.Object.Category) -> String {
        switch category {
        case .storage: return "storage"
        case .refrigerator: return "refrigerator"
        case .stove: return "stove"
        case .bed: return "bed"
        case .sink: return "sink"
        case .washerDryer: return "washerDryer"
        case .toilet: return "toilet"
        case .bathtub: return "bathtub"
        case .oven: return "oven"
        case .dishwasher: return "dishwasher"
        case .table: return "table"
        case .sofa: return "sofa"
        case .chair: return "chair"
        case .fireplace: return "fireplace"
        case .television: return "television"
        case .stairs: return "stairs"
        @unknown default: return "storage"
        }
    }

    private static func categoryLabel(_ category: CapturedRoom.Object.Category) -> String {
        switch category {
        case .storage: return "Storage"
        case .refrigerator: return "Refrigerator"
        case .stove: return "Stove"
        case .bed: return "Bed"
        case .sink: return "Sink"
        case .washerDryer: return "Washer/Dryer"
        case .toilet: return "Toilet"
        case .bathtub: return "Bathtub"
        case .oven: return "Oven"
        case .dishwasher: return "Dishwasher"
        case .table: return "Table"
        case .sofa: return "Sofa"
        case .chair: return "Chair"
        case .fireplace: return "Fireplace"
        case .television: return "Television"
        case .stairs: return "Stairs"
        @unknown default: return "Object"
        }
    }

    /// Square footage, plus whether it's an exact polygon measurement or a
    /// bounding-box approximation (no confident floor surface to measure).
    static func computeAreaSqFt(_ room: CapturedRoom) -> (area: Double, isEstimate: Bool) {
        if #available(iOS 17.0, *) {
            let candidate = room.floors
                .filter { $0.polygonCorners.count >= 3 }
                .max { $0.polygonCorners.count < $1.polygonCorners.count }
            if let candidate {
                let points = candidate.polygonCorners.map { SIMD2<Float>($0.x, $0.z) }
                let sqMeters = Double(polygonAreaSqMeters(points))
                return (sqMeters * sqMetersToSqFeet, false)
            }
        }
        guard !room.walls.isEmpty else { return (0, true) }
        var minX = Float.greatestFiniteMagnitude, maxX = -Float.greatestFiniteMagnitude
        var minZ = Float.greatestFiniteMagnitude, maxZ = -Float.greatestFiniteMagnitude
        for wall in room.walls {
            let t = wall.transform.columns.3
            minX = min(minX, t.x); maxX = max(maxX, t.x)
            minZ = min(minZ, t.z); maxZ = max(maxZ, t.z)
        }
        let sqMeters = Double(max(0, maxX - minX) * max(0, maxZ - minZ))
        return (sqMeters * sqMetersToSqFeet, true)
    }

    private static func polygonAreaSqMeters(_ points: [SIMD2<Float>]) -> Float {
        guard points.count >= 3 else { return 0 }
        var sum: Float = 0
        for i in 0..<points.count {
            let p1 = points[i]
            let p2 = points[(i + 1) % points.count]
            sum += p1.x * p2.y - p2.x * p1.y
        }
        return abs(sum) / 2
    }

    /// The two endpoints of a wall/door/window surface, projected onto the
    /// horizontal (XZ) plane — its transform gives the center and
    /// orientation, its dimensions.x gives the width.
    private static func endpoints(for surface: CapturedRoom.Surface) -> (SIMD2<Float>, SIMD2<Float>) {
        let halfWidth = surface.dimensions.x / 2
        let t = surface.transform
        let xAxis = SIMD3<Float>(t.columns.0.x, t.columns.0.y, t.columns.0.z)
        let center = SIMD3<Float>(t.columns.3.x, t.columns.3.y, t.columns.3.z)
        let start = center - xAxis * halfWidth
        let end = center + xAxis * halfWidth
        return (SIMD2(start.x, start.z), SIMD2(end.x, end.z))
    }

    /// A simple top-down line drawing: walls in ink, doors and windows
    /// picked out in the accent color, scaled and centered to fill the
    /// canvas. Good enough as a proposal visual — not a CAD export. Kept
    /// only for the capture-time upload and the download/print path; live
    /// viewing/editing uses FloorPlanCanvasView instead.
    static func renderFloorPlan(_ room: CapturedRoom, size: CGSize = CGSize(width: 900, height: 900)) -> UIImage {
        renderFloorPlan(elements: extractElements(room), objects: extractObjects(room), size: size)
    }

    /// Renders from already-extracted elements/objects, using the shared
    /// FloorPlanTransform — the exact same fit-to-canvas math the live
    /// Canvas view/editor uses, so the flattened PNG and the live view
    /// can't visually drift apart.
    static func renderFloorPlan(elements: [ScanElement], objects: [RoomObject], size: CGSize = CGSize(width: 900, height: 900)) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))

            guard !elements.isEmpty else { return }
            let transform = FloorPlanTransform.fit(elements: elements, objects: objects, size: size, margin: 60)

            for element in elements {
                let a = transform.worldToScreen(element.startX, element.startZ)
                let b = transform.worldToScreen(element.endX, element.endZ)
                let path = UIBezierPath()
                path.move(to: a)
                path.addLine(to: b)
                switch element.type {
                case "door":
                    UIColor(red: 0.788, green: 0.659, blue: 0.341, alpha: 1).setStroke() // gold
                    path.lineWidth = 4
                case "window":
                    UIColor(red: 0.243, green: 0.329, blue: 0.408, alpha: 0.6).setStroke() // navy, translucent
                    path.lineWidth = 4
                default:
                    UIColor(red: 0.173, green: 0.243, blue: 0.314, alpha: 1).setStroke() // navy-dark
                    path.lineWidth = 5
                }
                path.lineCapStyle = .round
                path.stroke()
            }

            // Dimension labels — like a real floor plan/CAD drawing, not
            // just a line diagram. Rotated to sit flush along each segment.
            for element in elements {
                let a = transform.worldToScreen(element.startX, element.startZ)
                let b = transform.worldToScreen(element.endX, element.endZ)
                let midpoint = CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2)
                var angle = atan2(b.y - a.y, b.x - a.x)
                // Keep text upright — flip a near-vertical-reading label
                // rather than rendering it upside down.
                if angle > .pi / 2 || angle < -.pi / 2 { angle += .pi }

                let text = String(format: "%.1f ft", element.lengthFt) as NSString
                let attrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 11, weight: .semibold),
                    .foregroundColor: UIColor(red: 0.173, green: 0.243, blue: 0.314, alpha: 1),
                ]
                let textSize = text.size(withAttributes: attrs)

                ctx.cgContext.saveGState()
                ctx.cgContext.translateBy(x: midpoint.x, y: midpoint.y)
                ctx.cgContext.rotate(by: angle)
                let chipRect = CGRect(x: -textSize.width / 2 - 3, y: -textSize.height / 2 - 8, width: textSize.width + 6, height: textSize.height + 2)
                UIColor(white: 1, alpha: 0.82).setFill()
                UIBezierPath(roundedRect: chipRect, cornerRadius: 3).fill()
                text.draw(at: CGPoint(x: -textSize.width / 2, y: -textSize.height / 2 - 7), withAttributes: attrs)
                ctx.cgContext.restoreGState()
            }

            // Furniture/fixtures — muted labeled boxes so they read as
            // supporting detail, not as precise as the walls.
            for object in objects {
                let corners = FloorPlanTransform.furnitureCorners(object).map { transform.worldToScreen(Double($0.x), Double($0.y)) }
                let boxPath = UIBezierPath()
                boxPath.move(to: corners[0])
                for corner in corners.dropFirst() { boxPath.addLine(to: corner) }
                boxPath.close()
                UIColor(red: 0.788, green: 0.659, blue: 0.341, alpha: 0.18).setFill()
                UIColor(red: 0.788, green: 0.659, blue: 0.341, alpha: 0.8).setStroke()
                boxPath.lineWidth = 1.5
                boxPath.fill()
                boxPath.stroke()

                let center = corners.reduce(CGPoint.zero) { CGPoint(x: $0.x + $1.x / 4, y: $0.y + $1.y / 4) }
                let labelAttrs: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 10, weight: .medium),
                    .foregroundColor: UIColor(red: 0.173, green: 0.243, blue: 0.314, alpha: 1),
                ]
                let labelSize = object.label.size(withAttributes: labelAttrs)
                (object.label as NSString).draw(
                    at: CGPoint(x: center.x - labelSize.width / 2, y: center.y - labelSize.height / 2),
                    withAttributes: labelAttrs
                )
            }
        }
    }

    /// Flattens the PencilKit markup onto the floor plan image for the
    /// Annotate flow's PDF export. `canvasSize` is the on-screen canvas's
    /// bounds (points) — its aspect ratio is kept equal to the image's by
    /// the Annotate view's layout, so scaling the transparent drawing image
    /// up to `baseImage.size` lines strokes up with what was actually drawn.
    static func compositeAnnotation(baseImage: UIImage, drawing: PKDrawing, canvasSize: CGSize) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: baseImage.size)
        return renderer.image { _ in
            baseImage.draw(in: CGRect(origin: .zero, size: baseImage.size))
            guard canvasSize.width > 0, canvasSize.height > 0 else { return }
            let drawingImage = drawing.image(from: CGRect(origin: .zero, size: canvasSize), scale: 1)
            drawingImage.draw(in: CGRect(origin: .zero, size: baseImage.size))
        }
    }

    /// Page 1: the annotated floor plan. Page 2+: a measurements table, one
    /// row per detected wall/door/window — the "notes from walking the
    /// project" the Annotate screen exists for.
    static func renderAnnotationPDF(image: UIImage, elements: [ScanElement], roomLabel: String?) -> Data {
        let pageWidth: CGFloat = 612
        let pageHeight: CGFloat = 792
        let margin: CGFloat = 36
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight))
        return renderer.pdfData { context in
            context.beginPage()
            let title = (roomLabel?.isEmpty == false ? roomLabel! : "Scanned space") as NSString
            title.draw(at: CGPoint(x: margin, y: margin), withAttributes: [.font: UIFont.boldSystemFont(ofSize: 16)])

            let maxImageRect = CGRect(x: margin, y: margin + 30, width: pageWidth - margin * 2, height: pageHeight - margin * 2 - 30)
            let imageAspect = image.size.width / max(image.size.height, 1)
            var drawSize = CGSize(width: maxImageRect.width, height: maxImageRect.width / imageAspect)
            if drawSize.height > maxImageRect.height {
                drawSize = CGSize(width: maxImageRect.height * imageAspect, height: maxImageRect.height)
            }
            let drawOrigin = CGPoint(x: maxImageRect.midX - drawSize.width / 2, y: maxImageRect.minY)
            image.draw(in: CGRect(origin: drawOrigin, size: drawSize))

            context.beginPage()
            ("Measurements" as NSString).draw(at: CGPoint(x: margin, y: margin), withAttributes: [.font: UIFont.boldSystemFont(ofSize: 16)])
            let bodyFont = UIFont.systemFont(ofSize: 12)
            var y = margin + 34
            for element in elements {
                if y > pageHeight - margin {
                    context.beginPage()
                    y = margin
                }
                let line = "\(element.label)  —  \(String(format: "%.1f", element.lengthFt)) ft × \(String(format: "%.1f", element.heightFt)) ft" as NSString
                line.draw(at: CGPoint(x: margin, y: y), withAttributes: [.font: bodyFont])
                y += 20
            }
        }
    }
}
