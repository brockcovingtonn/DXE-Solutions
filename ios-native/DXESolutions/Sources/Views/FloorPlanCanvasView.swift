import SwiftUI

/// Live-vector rendering of a scan's elements/objects — walls, doors,
/// windows, dimension labels, and furniture symbols — drawn fresh every
/// time from the current data via FloorPlanTransform, replacing the old
/// flattened-PNG display. Pure rendering only (Canvas content isn't
/// independently hit-testable); RoomScanEditorView overlays real SwiftUI
/// views on top of this for drag/select interaction, positioned via the
/// same FloorPlanTransform so the two layers stay pixel-aligned.
struct FloorPlanCanvasView: View {
    let elements: [ScanElement]
    let objects: [RoomObject]
    var selectedId: String?
    var margin: CGFloat = 40

    private let wallColor = Color(red: 0.173, green: 0.243, blue: 0.314)
    private let doorColor = Color(red: 0.788, green: 0.659, blue: 0.341)
    private let windowColor = Color(red: 0.243, green: 0.329, blue: 0.408).opacity(0.55)
    private let selectedColor = Color(red: 0.663, green: 0.475, blue: 0.235)
    private let furnitureStroke = Color(red: 0.788, green: 0.659, blue: 0.341).opacity(0.85)
    private let furnitureFill = Color(red: 0.788, green: 0.659, blue: 0.341).opacity(0.16)

    var body: some View {
        Canvas { context, size in
            let transform = FloorPlanTransform.fit(elements: elements, objects: objects, size: size, margin: margin)
            drawElements(context: context, transform: transform)
            drawDimensionChips(context: context, transform: transform)
            drawFurniture(context: context, transform: transform)
        }
        .background(Color.white)
    }

    private func drawElements(context: GraphicsContext, transform: FloorPlanTransform) {
        for element in elements {
            let a = transform.worldToScreen(element.startX, element.startZ)
            let b = transform.worldToScreen(element.endX, element.endZ)
            var path = Path()
            path.move(to: a)
            path.addLine(to: b)
            let isSelected = selectedId == "element:\(element.id)"
            let (color, lineWidth): (Color, CGFloat) = {
                if isSelected { return (selectedColor, element.type == "wall" ? 5 : 4) }
                switch element.type {
                case "door": return (doorColor, 4)
                case "window": return (windowColor, 4)
                default: return (wallColor, 5)
                }
            }()
            context.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        }
    }

    private func drawDimensionChips(context: GraphicsContext, transform: FloorPlanTransform) {
        for element in elements {
            guard element.lengthFt > 0 else { continue }
            let a = transform.worldToScreen(element.startX, element.startZ)
            let b = transform.worldToScreen(element.endX, element.endZ)
            let mid = CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2)
            var angle = atan2(b.y - a.y, b.x - a.x)
            if angle > .pi / 2 || angle < -.pi / 2 { angle += .pi }

            let text = Text(String(format: "%.1f ft", element.lengthFt))
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(wallColor)
            let resolved = context.resolve(text)
            let textSize = resolved.measure(in: CGSize(width: 200, height: 40))

            var chipContext = context
            chipContext.translateBy(x: mid.x, y: mid.y)
            chipContext.rotate(by: Angle(radians: angle))
            let chipRect = CGRect(x: -textSize.width / 2 - 4, y: -textSize.height / 2 - 10, width: textSize.width + 8, height: textSize.height + 3)
            chipContext.fill(Path(roundedRect: chipRect, cornerRadius: 3), with: .color(.white.opacity(0.85)))
            chipContext.draw(resolved, at: CGPoint(x: 0, y: -9), anchor: .center)
        }
    }

    private func drawFurniture(context: GraphicsContext, transform: FloorPlanTransform) {
        for object in objects {
            guard let symbol = FurnitureSymbols.symbol(for: object) else { continue }
            let isSelected = selectedId == "furniture:\(object.id)"
            let center = transform.worldToScreen(object.centerX, object.centerZ)
            let halfWPx = CGFloat(object.widthMeters / 2) * transform.scale
            let halfDPx = CGFloat(object.depthMeters / 2) * transform.scale
            let angle = Angle(radians: object.rotationRadians)

            var itemContext = context
            itemContext.translateBy(x: center.x, y: center.y)
            itemContext.rotate(by: angle)

            let stroke = isSelected ? selectedColor : furnitureStroke
            let fill = symbol.unfilled ? nil : (isSelected ? selectedColor.opacity(0.16) : furnitureFill)
            let style = symbol.dashed ? StrokeStyle(lineWidth: 1.4, dash: [4, 3]) : StrokeStyle(lineWidth: isSelected ? 2 : 1.4)

            for part in symbol.parts {
                switch part {
                case let .rect(px, pz, pw, ph, prx):
                    let w = CGFloat(pw) * halfWPx
                    let h = CGFloat(ph) * halfDPx
                    let rect = CGRect(x: CGFloat(px) * halfWPx - w / 2, y: CGFloat(pz) * halfDPx - h / 2, width: w, height: h)
                    let radius = prx > 0 ? CGFloat(prx) * min(halfWPx, halfDPx) : 0
                    let path = Path(roundedRect: rect, cornerRadius: radius)
                    if let fill { itemContext.fill(path, with: .color(fill)) }
                    itemContext.stroke(path, with: .color(stroke), style: style)
                case let .circle(px, pz, pr):
                    let rx = CGFloat(pr) * halfWPx
                    let ry = CGFloat(pr) * halfDPx
                    let rect = CGRect(x: CGFloat(px) * halfWPx - rx, y: CGFloat(pz) * halfDPx - ry, width: rx * 2, height: ry * 2)
                    let path = Path(ellipseIn: rect)
                    if let fill { itemContext.fill(path, with: .color(fill)) }
                    itemContext.stroke(path, with: .color(stroke), style: style)
                case let .ellipse(px, pz, prx, prz):
                    let rx = CGFloat(prx) * halfWPx
                    let ry = CGFloat(prz) * halfDPx
                    let rect = CGRect(x: CGFloat(px) * halfWPx - rx, y: CGFloat(pz) * halfDPx - ry, width: rx * 2, height: ry * 2)
                    let path = Path(ellipseIn: rect)
                    if let fill { itemContext.fill(path, with: .color(fill)) }
                    itemContext.stroke(path, with: .color(stroke), style: style)
                case let .line(x1, z1, x2, z2):
                    var path = Path()
                    path.move(to: CGPoint(x: CGFloat(x1) * halfWPx, y: CGFloat(z1) * halfDPx))
                    path.addLine(to: CGPoint(x: CGFloat(x2) * halfWPx, y: CGFloat(z2) * halfDPx))
                    itemContext.stroke(path, with: .color(stroke), style: StrokeStyle(lineWidth: 1))
                case let .dots(points, pr):
                    for (px, pz) in points {
                        let r = CGFloat(pr) * min(halfWPx, halfDPx)
                        let rect = CGRect(x: CGFloat(px) * halfWPx - r, y: CGFloat(pz) * halfDPx - r, width: r * 2, height: r * 2)
                        itemContext.fill(Path(ellipseIn: rect), with: .color(stroke))
                    }
                }
            }

            let label = object.label.isEmpty ? symbol.label : object.label
            let labelText = Text(label).font(.system(size: 10, weight: .medium)).foregroundColor(wallColor)
            context.draw(labelText, at: center, anchor: .center)
        }
    }
}
