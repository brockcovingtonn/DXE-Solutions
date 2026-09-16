import Foundation
import RoomPlan
import simd

// A minimal glTF 2.0 binary (.glb) writer, hand-rolled because RoomPlan only
// exports USD/USDZ (CapturedRoom.export), which no ordinary web browser can
// render — only iOS Safari, via native AR Quick Look. Browsers DO render
// glTF/GLB directly (e.g. Google's <model-viewer>), so this gives the
// proposal page and the staff quote detail page a real in-browser 3D view
// instead of a download prompt, while the USDZ stays around for the native
// AR handoff. It's a simplified box mesh (walls/doors/windows/furniture as
// flat-shaded boxes from their captured transforms and dimensions) — not a
// parametric or textured model, just enough geometry to look like the room.
//
// Verified against a real glTF loader (@gltf-transform/core) and a real
// <model-viewer> render before this was wired into the capture flow.
enum RoomScanGLBExporter {
    private struct Box {
        let transform: simd_float4x4
        let halfExtents: SIMD3<Float>
        let color: SIMD4<Float>
    }

    // navy, gold, light blue, sand, muted brown — matching the floor plan's
    // palette and the app's own brand colors.
    private static let wallColor = SIMD4<Float>(0.173, 0.243, 0.314, 1)
    private static let doorColor = SIMD4<Float>(0.788, 0.659, 0.341, 1)
    private static let windowColor = SIMD4<Float>(0.6, 0.75, 0.85, 1)
    private static let floorColor = SIMD4<Float>(0.906, 0.898, 0.855, 1)
    private static let objectColor = SIMD4<Float>(0.55, 0.5, 0.45, 1)

    static func export(_ room: CapturedRoom) -> Data {
        var boxes: [Box] = []

        for wall in room.walls { boxes.append(box(for: wall, color: wallColor)) }
        for door in room.doors { boxes.append(box(for: door, color: doorColor, extraThickness: 0.03)) }
        for window in room.windows { boxes.append(box(for: window, color: windowColor, extraThickness: 0.03)) }
        for object in room.objects { boxes.append(box(for: object, color: objectColor)) }
        if let floor = floorBox(for: room) { boxes.append(floor) }

        return build(boxes)
    }

    private static func box(for surface: CapturedRoom.Surface, color: SIMD4<Float>, extraThickness: Float = 0) -> Box {
        var half = surface.dimensions / 2
        half.z += extraThickness
        return Box(transform: surface.transform, halfExtents: half, color: color)
    }

    private static func box(for object: CapturedRoom.Object, color: SIMD4<Float>) -> Box {
        Box(transform: object.transform, halfExtents: object.dimensions / 2, color: color)
    }

    /// A flat slab spanning the wall footprint — RoomPlan's own floor
    /// surfaces (iOS 17+) aren't always present or confidently detected, so
    /// this falls back to the same wall bounding box computeAreaSqFt() uses.
    private static func floorBox(for room: CapturedRoom) -> Box? {
        guard !room.walls.isEmpty else { return nil }
        var minX = Float.greatestFiniteMagnitude, maxX = -Float.greatestFiniteMagnitude
        var minY = Float.greatestFiniteMagnitude
        var minZ = Float.greatestFiniteMagnitude, maxZ = -Float.greatestFiniteMagnitude
        for wall in room.walls {
            let t = wall.transform.columns.3
            minX = min(minX, t.x); maxX = max(maxX, t.x)
            minY = min(minY, t.y - wall.dimensions.y / 2)
            minZ = min(minZ, t.z); maxZ = max(maxZ, t.z)
        }
        let spanX = max(maxX - minX, 0.1)
        let spanZ = max(maxZ - minZ, 0.1)
        let centerX = (minX + maxX) / 2
        let centerZ = (minZ + maxZ) / 2
        let thickness: Float = 0.05
        let transform = simd_float4x4(translation: SIMD3(centerX, minY - thickness / 2, centerZ))
        return Box(transform: transform, halfExtents: SIMD3(spanX / 2 + 0.1, thickness / 2, spanZ / 2 + 0.1), color: floorColor)
    }

    private static func build(_ boxes: [Box]) -> Data {
        var positions: [SIMD3<Float>] = []
        var normals: [SIMD3<Float>] = []
        var colors: [SIMD4<Float>] = []
        var indices: [UInt16] = []

        for box in boxes {
            let hx = box.halfExtents.x, hy = box.halfExtents.y, hz = box.halfExtents.z
            let corners: [SIMD3<Float>] = [
                SIMD3(-hx, -hy, -hz), SIMD3(hx, -hy, -hz), SIMD3(hx, hy, -hz), SIMD3(-hx, hy, -hz),
                SIMD3(-hx, -hy, hz), SIMD3(hx, -hy, hz), SIMD3(hx, hy, hz), SIMD3(-hx, hy, hz),
            ]
            let faces: [(indices: [Int], normal: SIMD3<Float>)] = [
                ([4, 5, 6, 7], SIMD3(0, 0, 1)),
                ([1, 0, 3, 2], SIMD3(0, 0, -1)),
                ([5, 1, 2, 6], SIMD3(1, 0, 0)),
                ([0, 4, 7, 3], SIMD3(-1, 0, 0)),
                ([3, 7, 6, 2], SIMD3(0, 1, 0)),
                ([0, 1, 5, 4], SIMD3(0, -1, 0)),
            ]

            // Guard against non-finite geometry (a malformed capture
            // shouldn't produce a corrupt GLB that fails to load at all).
            guard hx.isFinite, hy.isFinite, hz.isFinite else { continue }

            for face in faces {
                let faceBaseIndex = UInt16(positions.count)
                for cornerIdx in face.indices {
                    let local4 = SIMD4<Float>(corners[cornerIdx], 1)
                    let worldPos = (box.transform * local4)
                    let normal4 = SIMD4<Float>(face.normal, 0)
                    let worldNormal = simd_normalize((box.transform * normal4).xyz)
                    positions.append(worldPos.xyz)
                    normals.append(worldNormal)
                    colors.append(box.color)
                }
                indices.append(contentsOf: [
                    faceBaseIndex, faceBaseIndex + 1, faceBaseIndex + 2,
                    faceBaseIndex, faceBaseIndex + 2, faceBaseIndex + 3,
                ])
            }
        }

        return buildGLB(positions: positions, normals: normals, colors: colors, indices: indices)
    }

    private static func buildGLB(positions: [SIMD3<Float>], normals: [SIMD3<Float>], colors: [SIMD4<Float>], indices: [UInt16]) -> Data {
        var binary = Data()
        func align4(_ data: inout Data) {
            while data.count % 4 != 0 { data.append(0) }
        }

        let positionsOffset = binary.count
        for p in positions {
            withUnsafeBytes(of: p.x) { binary.append(contentsOf: $0) }
            withUnsafeBytes(of: p.y) { binary.append(contentsOf: $0) }
            withUnsafeBytes(of: p.z) { binary.append(contentsOf: $0) }
        }
        align4(&binary)

        let normalsOffset = binary.count
        for n in normals {
            withUnsafeBytes(of: n.x) { binary.append(contentsOf: $0) }
            withUnsafeBytes(of: n.y) { binary.append(contentsOf: $0) }
            withUnsafeBytes(of: n.z) { binary.append(contentsOf: $0) }
        }
        align4(&binary)

        let colorsOffset = binary.count
        for c in colors {
            withUnsafeBytes(of: c.x) { binary.append(contentsOf: $0) }
            withUnsafeBytes(of: c.y) { binary.append(contentsOf: $0) }
            withUnsafeBytes(of: c.z) { binary.append(contentsOf: $0) }
            withUnsafeBytes(of: c.w) { binary.append(contentsOf: $0) }
        }
        align4(&binary)

        let indicesOffset = binary.count
        for i in indices {
            withUnsafeBytes(of: i) { binary.append(contentsOf: $0) }
        }
        align4(&binary)

        var minPos = SIMD3<Float>(repeating: .greatestFiniteMagnitude)
        var maxPos = SIMD3<Float>(repeating: -.greatestFiniteMagnitude)
        for p in positions {
            minPos = simd_min(minPos, p)
            maxPos = simd_max(maxPos, p)
        }
        if positions.isEmpty {
            minPos = SIMD3(0, 0, 0)
            maxPos = SIMD3(0, 0, 0)
        }

        let json: [String: Any] = [
            "asset": ["version": "2.0", "generator": "DXE Solutions Room Scan"],
            "scene": 0,
            "scenes": [["nodes": [0]]],
            "nodes": [["mesh": 0]],
            "meshes": [[
                "primitives": [[
                    "attributes": ["POSITION": 0, "NORMAL": 1, "COLOR_0": 2],
                    "indices": 3,
                    "mode": 4,
                    "material": 0,
                ]],
            ]],
            "materials": [[
                "pbrMetallicRoughness": [
                    "baseColorFactor": [1, 1, 1, 1],
                    "metallicFactor": 0,
                    "roughnessFactor": 0.9,
                ],
            ]],
            "buffers": [["byteLength": binary.count]],
            "bufferViews": [
                ["buffer": 0, "byteOffset": positionsOffset, "byteLength": normalsOffset - positionsOffset, "target": 34962],
                ["buffer": 0, "byteOffset": normalsOffset, "byteLength": colorsOffset - normalsOffset, "target": 34962],
                ["buffer": 0, "byteOffset": colorsOffset, "byteLength": indicesOffset - colorsOffset, "target": 34962],
                ["buffer": 0, "byteOffset": indicesOffset, "byteLength": binary.count - indicesOffset, "target": 34963],
            ],
            "accessors": [
                ["bufferView": 0, "componentType": 5126, "count": positions.count, "type": "VEC3", "min": [minPos.x, minPos.y, minPos.z], "max": [maxPos.x, maxPos.y, maxPos.z]],
                ["bufferView": 1, "componentType": 5126, "count": normals.count, "type": "VEC3"],
                ["bufferView": 2, "componentType": 5126, "count": colors.count, "type": "VEC4"],
                ["bufferView": 3, "componentType": 5123, "count": indices.count, "type": "SCALAR"],
            ],
        ]

        let jsonData = (try? JSONSerialization.data(withJSONObject: json)) ?? Data()
        var jsonChunk = jsonData
        while jsonChunk.count % 4 != 0 { jsonChunk.append(0x20) }

        var binChunk = binary
        while binChunk.count % 4 != 0 { binChunk.append(0) }

        var glb = Data()
        func appendUInt32(_ v: UInt32, to data: inout Data) {
            withUnsafeBytes(of: v.littleEndian) { data.append(contentsOf: $0) }
        }

        let totalLength = UInt32(12 + 8 + jsonChunk.count + 8 + binChunk.count)
        appendUInt32(0x4654_6C67, to: &glb) // "glTF"
        appendUInt32(2, to: &glb)
        appendUInt32(totalLength, to: &glb)

        appendUInt32(UInt32(jsonChunk.count), to: &glb)
        appendUInt32(0x4E4F_534A, to: &glb) // "JSON"
        glb.append(jsonChunk)

        appendUInt32(UInt32(binChunk.count), to: &glb)
        appendUInt32(0x004E_4942, to: &glb) // "BIN\0"
        glb.append(binChunk)

        return glb
    }
}

private extension simd_float4x4 {
    init(translation: SIMD3<Float>) {
        self = matrix_identity_float4x4
        columns.3 = SIMD4(translation, 1)
    }
}

private extension SIMD4 where Scalar == Float {
    var xyz: SIMD3<Float> { SIMD3(x, y, z) }
}
