import CoreGraphics
import Foundation

/// World-meters <-> screen-pixels fit-to-canvas transform for a scan's
/// elements/objects — shared by the flattened raster render
/// (RoomScanGeometry.renderFloorPlan) and the live floor-plan
/// view/editor, so render and hit-test math can never drift apart.
///
/// Points use CGPoint with .x = world X, .y = world Z (meters) — the same
/// "no flip" convention RoomScanGeometry already used: world Z maps
/// directly to screen Y.
struct FloorPlanTransform {
    let scale: CGFloat
    let offsetX: CGFloat
    let offsetY: CGFloat
    let minX: CGFloat
    let minY: CGFloat

    /// Recompute this from the CURRENT elements/objects on every relevant
    /// change (load, add, delete, drag-end, "fit to view") — but freeze it
    /// (keep using the last-computed value) during an active drag, or the
    /// canvas will rescale/recenter under the cursor mid-drag.
    static func fit(elements: [ScanElement], objects: [RoomObject], size: CGSize, margin: CGFloat = 60) -> FloorPlanTransform {
        var points: [CGPoint] = []
        for element in elements {
            points.append(CGPoint(x: element.startX, y: element.startZ))
            points.append(CGPoint(x: element.endX, y: element.endZ))
        }
        for object in objects {
            points.append(contentsOf: furnitureCorners(object))
        }
        guard !points.isEmpty, size.width > 0, size.height > 0 else {
            return FloorPlanTransform(scale: 1, offsetX: size.width / 2, offsetY: size.height / 2, minX: 0, minY: 0)
        }
        let minX = points.map(\.x).min() ?? 0
        let maxX = points.map(\.x).max() ?? 1
        let minY = points.map(\.y).min() ?? 0
        let maxY = points.map(\.y).max() ?? 1
        let spanX = max(maxX - minX, 0.1)
        let spanY = max(maxY - minY, 0.1)
        let scale = min((size.width - margin * 2) / spanX, (size.height - margin * 2) / spanY)
        let offsetX = (size.width - spanX * scale) / 2
        let offsetY = (size.height - spanY * scale) / 2
        return FloorPlanTransform(scale: scale, offsetX: offsetX, offsetY: offsetY, minX: minX, minY: minY)
    }

    func worldToScreen(_ x: Double, _ z: Double) -> CGPoint {
        CGPoint(x: (CGFloat(x) - minX) * scale + offsetX, y: (CGFloat(z) - minY) * scale + offsetY)
    }

    func screenToWorld(_ point: CGPoint) -> (x: Double, z: Double) {
        (x: Double((point.x - offsetX) / scale) + Double(minX), z: Double((point.y - offsetY) / scale) + Double(minY))
    }

    /// Four rotated world-space corners of a furniture item's oriented
    /// bounding box (same rotate-then-translate convention RoomScanGeometry
    /// already used for drawing furniture on the raster plan).
    static func furnitureCorners(_ object: RoomObject) -> [CGPoint] {
        let halfW = object.widthMeters / 2
        let halfD = object.depthMeters / 2
        let cosR = cos(object.rotationRadians)
        let sinR = sin(object.rotationRadians)
        let local: [(Double, Double)] = [(-halfW, -halfD), (halfW, -halfD), (halfW, halfD), (-halfW, halfD)]
        return local.map { lx, lz in
            let worldX = object.centerX + lx * cosR - lz * sinR
            let worldZ = object.centerZ + lx * sinR + lz * cosR
            return CGPoint(x: worldX, y: worldZ)
        }
    }
}
