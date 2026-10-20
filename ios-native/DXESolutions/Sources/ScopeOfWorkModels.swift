import Foundation

struct ScopeItem: Codable, Identifiable, Hashable {
    let id: String
    let areaId: String
    let projectId: String
    var description: String
    var completed: Bool
    var completedAt: String?
    var notes: String?
    var timeline: String?
    let sortOrder: Int?

    enum CodingKeys: String, CodingKey {
        case id, description, completed, notes, timeline
        case areaId = "area_id"
        case projectId = "project_id"
        case completedAt = "completed_at"
        case sortOrder = "sort_order"
    }
}

struct ScopeArea: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String
    var name: String
    let sortOrder: Int?
    var scopeItems: [ScopeItem]

    enum CodingKeys: String, CodingKey {
        case id, name
        case projectId = "project_id"
        case sortOrder = "sort_order"
        case scopeItems = "scope_items"
    }
}

// Mirrors lib/constants.js's PROPERTY_AREAS verbatim.
enum PropertyAreas {
    static let all = [
        "Kitchen",
        "Primary Bedroom",
        "Primary Bathroom",
        "Walk-in Closet",
        "Living Room",
        "Dining Room",
        "Family Room",
        "HVAC / Laundry",
        "Laundry Room",
        "Garage",
        "Exterior",
        "Backyard / Patio",
        "Hallway",
        "Office",
        "Other",
    ]
}

// Mirrors lib/constants.js's MILESTONE_PRESETS verbatim.
enum MilestonePresets {
    static let all = [
        "Contract Signed",
        "Consultants Engaged",
        "Plans Submitted to City",
        "1st Plan-Check Corrections Received",
        "Corrections Resubmitted",
        "Plan Check Approved",
        "Fees Paid",
        "Permit Issued",
        "Utility Applications Submitted",
        "Construction Start",
        "Foundation / Grading Inspection Passed",
        "Framing Inspection Passed",
        "Rough MEP Inspections Passed",
        "Insulation / Drywall Inspection Passed",
        "Utility Service Connected",
        "Final Inspection Passed",
        "Certificate of Occupancy Issued",
        "Project Closeout",
    ]
}
