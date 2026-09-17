import Foundation

/// Snap/measurement helpers for the floor-plan editor, mirroring
/// lib/design-studio/floor-plan-geometry.js exactly so both platforms
/// snap/measure the same way.
enum FloorPlanGeometryMath {
    static let metersToFeet: Double = 3.28084
    static let wallSnapThresholdMeters: Double = 0.15 // ~6in
    static let defaultWallHeightFt: Double = 8

    static func distanceMeters(_ a: (x: Double, z: Double), _ b: (x: Double, z: Double)) -> Double {
        Foundation.hypot(b.x - a.x, b.z - a.z)
    }

    static func distanceFt(from a: (x: Double, z: Double), to b: (x: Double, z: Double)) -> Double {
        distanceMeters(a, b) * metersToFeet
    }

    /// Nearest existing wall/door/window endpoint within thresholdMeters, or nil.
    static func snapToEndpoint(_ point: (x: Double, z: Double), elements: [ScanElement], thresholdMeters: Double = wallSnapThresholdMeters) -> (x: Double, z: Double)? {
        var best: (x: Double, z: Double)?
        var bestDist = thresholdMeters
        for element in elements {
            for candidate in [(x: element.startX, z: element.startZ), (x: element.endX, z: element.endZ)] {
                let d = distanceMeters(point, candidate)
                if d < bestDist {
                    best = candidate
                    bestDist = d
                }
            }
        }
        return best
    }

    /// Rounds a world point to the nearest gridFt (default 0.5ft) grid line.
    static func snapToGrid(_ point: (x: Double, z: Double), gridFt: Double = 0.5) -> (x: Double, z: Double) {
        let gridM = gridFt / metersToFeet
        return (x: (point.x / gridM).rounded() * gridM, z: (point.z / gridM).rounded() * gridM)
    }

    /// Sensible default height for a newly-drawn wall: average of existing
    /// walls' heights, or 8ft with none yet.
    static func defaultHeightFt(_ elements: [ScanElement]) -> Double {
        let walls = elements.filter { $0.type == "wall" }
        guard !walls.isEmpty else { return defaultWallHeightFt }
        return walls.reduce(0) { $0 + $1.heightFt } / Double(walls.count)
    }
}
