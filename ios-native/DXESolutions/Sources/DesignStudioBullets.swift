import Foundation

// Direct port of buildIncludedBullets() in lib/design-studio/pricing.js —
// keep the two in sync; same bullet text and order.
func buildIncludedBullets(_ inc: IncludedSummary) -> [String] {
    var bullets = [
        "Existing conditions set up as a working base plan",
        "\(inc.concepts) proposed layout concept\(inc.concepts == "1" ? "" : "s")",
        "Finalised dimensioned 2D floor plan",
        "Furniture and fixture layout — \(inc.styling.lowercased())",
    ]
    if inc.model3d {
        bullets.append("Complete 3D model of the design")
    }
    if inc.renderedViews > 0 {
        let count = inc.renderedViews == inc.renderedViews.rounded()
            ? String(Int(inc.renderedViews))
            : String(inc.renderedViews)
        bullets.append("\(count) rendered presentation view\(inc.renderedViews == 1 ? "" : "s")")
    }
    if !inc.finishDirection.isEmpty && inc.finishDirection != "Not included" {
        bullets.append("Material and finish direction — \(inc.finishDirection.lowercased())")
    }
    bullets.append("\(inc.revisions) revision round\(inc.revisions == 1 ? "" : "s")")
    bullets.append("Presentation-ready PDF package")
    return bullets
}
