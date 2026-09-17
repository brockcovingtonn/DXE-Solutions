import SwiftUI

/// List of placeable furniture categories with a mini CAD-symbol preview
/// per row, reusing the same FurniturePart data the placed-object
/// renderer uses. Tapping a row arms it for placement; tapping the armed
/// row again disarms it back to select mode.
struct FurniturePaletteView: View {
    let armedKey: String?
    var onArm: (String?) -> Void

    var body: some View {
        List(FurnitureSymbols.categories, id: \.key) { category in
            Button {
                onArm(armedKey == category.key ? nil : category.key)
            } label: {
                HStack(spacing: 12) {
                    FurnitureIconPreview(category: category)
                        .frame(width: 32, height: 32)
                    Text(category.label)
                        .font(.subheadline.weight(armedKey == category.key ? .semibold : .regular))
                        .foregroundColor(Theme.textPrimary)
                }
            }
            .listRowBackground(armedKey == category.key ? Theme.gold.opacity(0.14) : Theme.cardBackground)
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(Theme.screenBackground)
    }
}

private struct FurnitureIconPreview: View {
    let category: FurnitureCategory

    var body: some View {
        Canvas { context, size in
            let half = min(size.width, size.height) / 2 - 3
            var itemContext = context
            itemContext.translateBy(x: size.width / 2, y: size.height / 2)
            let stroke = Color(red: 0.663, green: 0.475, blue: 0.235)
            let fill = category.unfilled ? nil : Color(red: 0.788, green: 0.659, blue: 0.341).opacity(0.2)
            let style = category.dashed ? StrokeStyle(lineWidth: 1.1, dash: [3, 2]) : StrokeStyle(lineWidth: 1.1)

            for part in category.parts {
                switch part {
                case let .rect(px, pz, pw, ph, prx):
                    let w = CGFloat(pw) * half
                    let h = CGFloat(ph) * half
                    let rect = CGRect(x: CGFloat(px) * half - w / 2, y: CGFloat(pz) * half - h / 2, width: w, height: h)
                    let radius = prx > 0 ? CGFloat(prx) * half : 0
                    let path = Path(roundedRect: rect, cornerRadius: radius)
                    if let fill { itemContext.fill(path, with: .color(fill)) }
                    itemContext.stroke(path, with: .color(stroke), style: style)
                case let .circle(px, pz, pr):
                    let r = CGFloat(pr) * half
                    let rect = CGRect(x: CGFloat(px) * half - r, y: CGFloat(pz) * half - r, width: r * 2, height: r * 2)
                    let path = Path(ellipseIn: rect)
                    if let fill { itemContext.fill(path, with: .color(fill)) }
                    itemContext.stroke(path, with: .color(stroke), style: style)
                case let .ellipse(px, pz, prx, prz):
                    let rx = CGFloat(prx) * half
                    let ry = CGFloat(prz) * half
                    let rect = CGRect(x: CGFloat(px) * half - rx, y: CGFloat(pz) * half - ry, width: rx * 2, height: ry * 2)
                    let path = Path(ellipseIn: rect)
                    if let fill { itemContext.fill(path, with: .color(fill)) }
                    itemContext.stroke(path, with: .color(stroke), style: style)
                case let .line(x1, z1, x2, z2):
                    var path = Path()
                    path.move(to: CGPoint(x: CGFloat(x1) * half, y: CGFloat(z1) * half))
                    path.addLine(to: CGPoint(x: CGFloat(x2) * half, y: CGFloat(z2) * half))
                    itemContext.stroke(path, with: .color(stroke), style: StrokeStyle(lineWidth: 1))
                case let .dots(points, pr):
                    for (px, pz) in points {
                        let r = CGFloat(pr) * half
                        let rect = CGRect(x: CGFloat(px) * half - r, y: CGFloat(pz) * half - r, width: r * 2, height: r * 2)
                        itemContext.fill(Path(ellipseIn: rect), with: .color(stroke))
                    }
                }
            }
        }
    }
}
