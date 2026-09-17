import Foundation

/// Symbol part shapes in NORMALIZED local space: x/z range -1...1 (1 = at
/// the object's half-width/half-depth edge), w/h range 0...2 (2 = the
/// full width/depth). A renderer scales x/w by halfWidthMeters and z/h by
/// halfDepthMeters, then rotates/translates using the object's own
/// rotationRadians/centerX/centerZ — mirrors lib/design-studio/
/// furniture-symbols.js on web exactly, so both platforms draw the same
/// shapes from the same data.
enum FurniturePart {
    case rect(x: Double, z: Double, w: Double, h: Double, rx: Double = 0)
    case circle(x: Double, z: Double, r: Double)
    case ellipse(x: Double, z: Double, rx: Double, rz: Double)
    case line(x1: Double, z1: Double, x2: Double, z2: Double)
    case dots(points: [(Double, Double)], r: Double)
}

struct FurnitureCategory {
    let key: String
    let label: String
    var placedLabel: String?
    var writeCategory: String?
    let defaultWidthM: Double
    let defaultDepthM: Double
    var dashed: Bool = false
    var unfilled: Bool = false
    let parts: [FurniturePart]

    var resolvedWriteCategory: String { writeCategory ?? key }
    var resolvedPlacedLabel: String { placedLabel ?? label }
}

/// Furniture/fixture category catalog for the floor-plan editor's asset
/// library — the single source of truth for default placement size and
/// symbol shape, matching lib/design-studio/furniture-symbols.js.
enum FurnitureSymbols {
    static let categories: [FurnitureCategory] = [
        FurnitureCategory(
            key: "kitchen_island", label: "Kitchen Island", defaultWidthM: 1.8, defaultDepthM: 0.9,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2, rx: 0.08), .rect(x: 0, z: 0.62, w: 1.8, h: 0.3)]
        ),
        FurnitureCategory(key: "cabinet", label: "Cabinet", defaultWidthM: 0.6, defaultDepthM: 0.6, parts: [.rect(x: 0, z: 0, w: 2, h: 2)]),
        FurnitureCategory(
            key: "counter", label: "Counter", defaultWidthM: 0.6, defaultDepthM: 0.6,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2), .line(x1: -1, z1: -0.75, x2: 1, z2: -0.75)]
        ),
        FurnitureCategory(
            key: "desk", label: "Desk", defaultWidthM: 1.2, defaultDepthM: 0.6,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2), .rect(x: 0.75, z: 0, w: 0.4, h: 1.6)]
        ),
        FurnitureCategory(
            key: "rug", label: "Rug", defaultWidthM: 2.0, defaultDepthM: 1.4, dashed: true, unfilled: true,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2, rx: 0.1)]
        ),
        FurnitureCategory(
            key: "sofa", label: "Sofa", defaultWidthM: 2.0, defaultDepthM: 0.9,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2, rx: 0.15), .rect(x: 0, z: -0.7, w: 1.9, h: 0.35)]
        ),
        FurnitureCategory(
            key: "chair", label: "Chair", defaultWidthM: 0.55, defaultDepthM: 0.55,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2, rx: 0.25), .line(x1: -0.5, z1: 1, x2: 0.5, z2: 1)]
        ),
        FurnitureCategory(
            key: "table_rect", label: "Table (rectangular)", placedLabel: "Table", writeCategory: "table",
            defaultWidthM: 1.5, defaultDepthM: 0.9, parts: [.rect(x: 0, z: 0, w: 2, h: 2)]
        ),
        FurnitureCategory(
            key: "table_round", label: "Table (round)", placedLabel: "Table", writeCategory: "table",
            defaultWidthM: 1.1, defaultDepthM: 1.1, parts: [.circle(x: 0, z: 0, r: 1)]
        ),
        FurnitureCategory(
            key: "bed", label: "Bed", defaultWidthM: 1.5, defaultDepthM: 2.0,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2), .rect(x: 0, z: -0.72, w: 1.6, h: 0.5)]
        ),
        FurnitureCategory(key: "storage", label: "Storage / Shelving", defaultWidthM: 0.9, defaultDepthM: 0.4, parts: [.rect(x: 0, z: 0, w: 2, h: 2)]),
        FurnitureCategory(key: "television", label: "TV", defaultWidthM: 1.2, defaultDepthM: 0.1, parts: [.rect(x: 0, z: 0, w: 2, h: 2)]),
        FurnitureCategory(key: "refrigerator", label: "Refrigerator", defaultWidthM: 0.9, defaultDepthM: 0.7, parts: [.rect(x: 0, z: 0, w: 2, h: 2)]),
        FurnitureCategory(
            key: "stove", label: "Stove / Oven", writeCategory: "stove", defaultWidthM: 0.75, defaultDepthM: 0.65,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2), .dots(points: [(-0.45, -0.45), (0.45, -0.45), (-0.45, 0.45), (0.45, 0.45)], r: 0.12)]
        ),
        FurnitureCategory(
            key: "sink", label: "Sink", defaultWidthM: 0.6, defaultDepthM: 0.5,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2, rx: 0.2), .ellipse(x: 0, z: 0, rx: 0.6, rz: 0.5)]
        ),
        FurnitureCategory(
            key: "toilet", label: "Toilet", defaultWidthM: 0.4, defaultDepthM: 0.65,
            parts: [.rect(x: 0, z: -0.55, w: 1.7, h: 0.5), .ellipse(x: 0, z: 0.25, rx: 0.9, rz: 0.7)]
        ),
        FurnitureCategory(
            key: "bathtub", label: "Bathtub", defaultWidthM: 1.5, defaultDepthM: 0.75,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2, rx: 0.3), .rect(x: 0, z: 0, w: 1.5, h: 1.4, rx: 0.3)]
        ),
        FurnitureCategory(
            key: "washer_dryer", label: "Washer / Dryer", defaultWidthM: 0.65, defaultDepthM: 0.65,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2), .circle(x: 0, z: 0, r: 0.55)]
        ),
        FurnitureCategory(
            key: "fireplace", label: "Fireplace", defaultWidthM: 1.2, defaultDepthM: 0.4,
            parts: [.rect(x: 0, z: 0, w: 2, h: 2), .rect(x: 0, z: 0.1, w: 1.4, h: 1.2)]
        ),
        FurnitureCategory(
            key: "stairs", label: "Stairs", defaultWidthM: 1.0, defaultDepthM: 3.0,
            parts: [
                .rect(x: 0, z: 0, w: 2, h: 2),
                .line(x1: -1, z1: -0.66, x2: 1, z2: -0.66),
                .line(x1: -1, z1: -0.22, x2: 1, z2: -0.22),
                .line(x1: -1, z1: 0.22, x2: 1, z2: 0.22),
                .line(x1: -1, z1: 0.66, x2: 1, z2: 0.66),
            ]
        ),
    ]

    private static let byKey: [String: FurnitureCategory] = Dictionary(uniqueKeysWithValues: categories.map { ($0.key, $0) })

    private static let byWriteCategory: [String: FurnitureCategory] = {
        var map: [String: FurnitureCategory] = [:]
        for cat in categories {
            let key = cat.resolvedWriteCategory
            if map[key] == nil { map[key] = cat }
        }
        return map
    }()

    /// Resolves the symbol to draw for a placed RoomObject. Round vs.
    /// rectangular tables are distinguished purely by aspect ratio (no
    /// extra field needed) since both write category "table".
    static func symbol(for object: RoomObject) -> FurnitureCategory? {
        let category = object.category.isEmpty ? "storage" : object.category
        if category == "table" {
            if abs(object.widthMeters - object.depthMeters) < 0.05 { return byKey["table_round"] }
            return byKey["table_rect"]
        }
        return byWriteCategory[category] ?? byWriteCategory["storage"]
    }

    static func category(forKey key: String) -> FurnitureCategory? {
        byKey[key]
    }
}
