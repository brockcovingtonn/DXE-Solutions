import Foundation
import RoomPlan
import UIKit
import simd

// Pure geometry helpers over a finished CapturedRoom: square footage and a
// drawn-from-scratch top-down floor plan. RoomPlan doesn't hand you either
// directly — floor area has to be computed from the captured polygon (or
// approximated from the wall layout on iOS 16, before CapturedRoom.floors
// existed), and there's no built-in 2D render, only the 3D export.
enum RoomScanGeometry {
    private static let sqMetersToSqFeet: Double = 10.7639

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
    /// canvas. Good enough as a proposal visual — not a CAD export.
    static func renderFloorPlan(_ room: CapturedRoom, size: CGSize = CGSize(width: 900, height: 900)) -> UIImage {
        struct Segment { let a: SIMD2<Float>; let b: SIMD2<Float>; let kind: Kind }
        enum Kind { case wall, door, window }

        var segments: [Segment] = room.walls.map { let (a, b) = endpoints(for: $0); return Segment(a: a, b: b, kind: .wall) }
        segments += room.doors.map { let (a, b) = endpoints(for: $0); return Segment(a: a, b: b, kind: .door) }
        segments += room.windows.map { let (a, b) = endpoints(for: $0); return Segment(a: a, b: b, kind: .window) }

        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))

            guard !segments.isEmpty else { return }

            let margin: CGFloat = 60
            let allPoints = segments.flatMap { [$0.a, $0.b] }
            let minX = CGFloat(allPoints.map(\.x).min() ?? 0)
            let maxX = CGFloat(allPoints.map(\.x).max() ?? 1)
            let minY = CGFloat(allPoints.map(\.y).min() ?? 0)
            let maxY = CGFloat(allPoints.map(\.y).max() ?? 1)
            let spanX = max(maxX - minX, 0.1)
            let spanY = max(maxY - minY, 0.1)
            let scale = min((size.width - margin * 2) / spanX, (size.height - margin * 2) / spanY)
            let offsetX = (size.width - spanX * scale) / 2
            let offsetY = (size.height - spanY * scale) / 2

            func point(_ p: SIMD2<Float>) -> CGPoint {
                CGPoint(x: (CGFloat(p.x) - minX) * scale + offsetX, y: (CGFloat(p.y) - minY) * scale + offsetY)
            }

            for segment in segments {
                let path = UIBezierPath()
                path.move(to: point(segment.a))
                path.addLine(to: point(segment.b))
                switch segment.kind {
                case .wall:
                    UIColor(red: 0.173, green: 0.243, blue: 0.314, alpha: 1).setStroke() // navy-dark
                    path.lineWidth = 5
                case .door:
                    UIColor(red: 0.788, green: 0.659, blue: 0.341, alpha: 1).setStroke() // gold
                    path.lineWidth = 4
                case .window:
                    UIColor(red: 0.243, green: 0.329, blue: 0.408, alpha: 0.6).setStroke() // navy, translucent
                    path.lineWidth = 4
                }
                path.lineCapStyle = .round
                path.stroke()
            }
        }
    }
}
