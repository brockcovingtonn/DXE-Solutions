import Foundation

// Mirrors lib/design-studio/pricing.js and the design_studio_quotes /
// design_studio_config tables. Every read and write goes through
// api/design-studio/* (Bearer-authenticated — see APIClient) since both
// tables have RLS enabled with no policies; there is no direct Supabase
// path for this feature.

let designStudioProjectTypeOrder = ["kitchen", "adu", "partial", "fullhouse"]
let designStudioServiceLevelOrder = ["essentials", "design", "premium"]
let designStudioComplexityOrder = ["standard", "complex", "high"]
let designStudioAddOnOrder = ["siteMeasure", "extraConcept", "extraRender", "revisionHour", "finishRoom", "stylingRoom", "sourceFiles"]

struct DesignStudioConfig: Codable {
    var version: Int
    var depositPct: Double
    var rushPct: Double
    var tradePartnerDiscountPct: Double
    var quoteValidDays: Double
    var roundTo: Double
    var complexity: [String: ComplexityLevel]
    var serviceLevels: [String: ServiceLevelDef]
    var projectTypes: [String: ProjectTypeDef]
    var addOns: [String: AddOnDef]
    var targetHourly: Double
}

struct ComplexityLevel: Codable {
    var label: String
    var mult: Double
    var when: String
}

struct ServiceLevelDef: Codable {
    var label: String
    var concepts: String
    var revisions: Int
    var model3d: Bool
    var finishDirection: String
    var styling: String
    var blurb: String
    var recommended: Bool?
}

struct SizeBand: Codable, Identifiable {
    var label: String
    var maxSqft: Double?
    var mult: Double
    var id: String { label }
}

struct ProjectTypeDef: Codable {
    var label: String
    var note: String
    var minimumFee: Double
    var packages: [String: Double]
    var sizeBands: [SizeBand]
    var includedViews: [String: Double]
    var estHours: [String: Double]
}

struct AddOnDef: Codable {
    var label: String
    var unit: String
    var rate: Double
    var premiumRate: Double?
    var clientFacing: Bool?
}

// MARK: - Pricing breakdown (calculateQuote() output)

struct QuoteInputsSnapshot: Codable {
    var clientName: String?
    var clientEmail: String?
    var clientPhone: String?
    var projectAddress: String?
    var projectType: String
    var serviceLevel: String
    var complexity: String
    var areaSqft: Double
}

struct PricingLabels: Codable {
    var projectType: String
    var serviceLevel: String
    var complexity: String
    var sizeBand: String
}

struct SizeBandAdjustment: Codable { var label: String; var mult: Double; var amount: Double }
struct ComplexityAdjustment: Codable { var label: String; var mult: Double; var amount: Double }

struct PackageBreakdown: Codable {
    var base: Double
    var sizeBand: SizeBandAdjustment
    var complexity: ComplexityAdjustment
    var subtotal: Double
}

struct RushBreakdown: Codable { var applied: Bool; var pct: Double; var amount: Double }
struct TradePartnerBreakdown: Codable { var applied: Bool; var pct: Double; var amount: Double }
struct MinimumBreakdown: Codable { var fee: Double; var applied: Bool }

struct AddOnLine: Codable, Identifiable {
    var key: String
    var label: String
    var unit: String
    var qty: Double
    var rate: Double
    var amount: Double
    var id: String { key }
}

struct IncludedSummary: Codable {
    var concepts: String
    var revisions: Int
    var model3d: Bool
    var finishDirection: String
    var styling: String
    var renderedViews: Double
    var baseRenderedViews: Double
    var blurb: String
}

// Margin math. Never present on anything a client can reach — the public
// proposal page strips this before the JSON is even built server-side.
struct InternalBreakdown: Codable {
    var estHours: Double
    var impliedHourly: Double?
    var targetHourly: Double
    var effectivePerSqft: Double?
    var belowTarget: Bool
    var minimumApplied: Bool
    var configVersion: Int
}

struct QuotePricing: Codable {
    var inputs: QuoteInputsSnapshot
    var labels: PricingLabels
    var package: PackageBreakdown
    var rush: RushBreakdown
    var addOnLines: [AddOnLine]
    var selectedAddOns: [AddOnLine]
    var addOnTotal: Double
    var tradePartner: TradePartnerBreakdown
    var adjustment: Double
    var adjustmentNote: String
    var minimum: MinimumBreakdown
    var total: Double
    var deposit: Double
    var depositPct: Double
    var balance: Double
    var included: IncludedSummary
    var internalInfo: InternalBreakdown?

    enum CodingKeys: String, CodingKey {
        case inputs, labels, package, rush, addOnLines, selectedAddOns, addOnTotal
        case tradePartner, adjustment, adjustmentNote, minimum, total, deposit, depositPct, balance, included
        case internalInfo = "internal"
    }
}

// MARK: - Quote row (design_studio_quotes)

struct DesignStudioQuote: Codable, Identifiable {
    var id: String
    var quoteNumber: String
    var status: String
    var source: String?
    var clientId: String?
    var clientName: String?
    var clientEmail: String?
    var clientPhone: String?
    var intake: IntakeAnswers?
    var intakeRequestedAt: String?
    var intakeSubmittedAt: String?
    var projectAddress: String?
    var projectType: String
    var serviceLevel: String
    var complexity: String?
    var areaSqft: Double
    var rush: Bool?
    var tradePartner: Bool?
    var addOns: [String: Double]?
    var manualAdjustment: Double?
    var adjustmentNote: String?
    var internalNotes: String?
    var includedOverride: [String]?
    var hideAddOnMenu: Bool?
    var pricing: QuotePricing?
    var configSnapshot: DesignStudioConfig?
    var total: Double
    var deposit: Double?
    var shareToken: String?
    var validUntil: String?
    var sentAt: String?
    var decidedAt: String?
    var createdBy: String?
    var createdByName: String?
    var createdAt: String
    var updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, status, source, pricing, total, deposit, complexity, intake
        case quoteNumber = "quote_number"
        case clientId = "client_id"
        case clientName = "client_name"
        case clientEmail = "client_email"
        case clientPhone = "client_phone"
        case intakeRequestedAt = "intake_requested_at"
        case intakeSubmittedAt = "intake_submitted_at"
        case projectAddress = "project_address"
        case projectType = "project_type"
        case serviceLevel = "service_level"
        case areaSqft = "area_sqft"
        case rush
        case tradePartner = "trade_partner"
        case addOns = "add_ons"
        case manualAdjustment = "manual_adjustment"
        case adjustmentNote = "adjustment_note"
        case internalNotes = "internal_notes"
        case includedOverride = "included_override"
        case hideAddOnMenu = "hide_addon_menu"
        case configSnapshot = "config_snapshot"
        case shareToken = "share_token"
        case validUntil = "valid_until"
        case sentAt = "sent_at"
        case decidedAt = "decided_at"
        case createdBy = "created_by"
        case createdByName = "created_by_name"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

// Mirrors lib/design-studio/intake.js's INTAKE_FIELDS exactly — same field
// ids, so this decodes/encodes the design_studio_quotes.intake JSONB
// column directly with no CodingKeys needed. Used both for the client's
// own submission (web-only, via /intake/[token]) reflected back here, and
// the staff-fill form in IntakeFormView.swift.
struct IntakeAnswers: Codable, Equatable {
    var vision: String = ""
    var rooms: String = ""
    var timeline: String = ""
    var budget: String = ""
    var style: [String] = []
    var inspiration: String = ""
    var keep: String = ""
    var avoid: String = ""
    var structural: String = ""
    var household: String = ""
    var contact: String = ""
    var notes: String = ""

    var hasAnyAnswer: Bool {
        !vision.isEmpty || !rooms.isEmpty || !timeline.isEmpty || !budget.isEmpty || !style.isEmpty
            || !inspiration.isEmpty || !keep.isEmpty || !avoid.isEmpty || !structural.isEmpty
            || !household.isEmpty || !contact.isEmpty || !notes.isEmpty
    }

    init(vision: String = "", rooms: String = "", timeline: String = "", budget: String = "", style: [String] = [],
         inspiration: String = "", keep: String = "", avoid: String = "", structural: String = "",
         household: String = "", contact: String = "", notes: String = "") {
        self.vision = vision
        self.rooms = rooms
        self.timeline = timeline
        self.budget = budget
        self.style = style
        self.inspiration = inspiration
        self.keep = keep
        self.avoid = avoid
        self.structural = structural
        self.household = household
        self.contact = contact
        self.notes = notes
    }

    // Swift's synthesized Decodable still requires every key even when a
    // property has a default value — only an Optional type skips a missing
    // key. design_studio_quotes.intake defaults to '{}'::jsonb (no keys at
    // all) for every quote that hasn't had intake filled in yet, which is
    // most of them, so the synthesized decoder threw keyNotFound and the
    // whole DesignStudioQuote decode failed — surfacing as "Could not load
    // this quote." for effectively every quote. Decode each field
    // leniently instead.
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        vision = try container.decodeIfPresent(String.self, forKey: .vision) ?? ""
        rooms = try container.decodeIfPresent(String.self, forKey: .rooms) ?? ""
        timeline = try container.decodeIfPresent(String.self, forKey: .timeline) ?? ""
        budget = try container.decodeIfPresent(String.self, forKey: .budget) ?? ""
        style = try container.decodeIfPresent([String].self, forKey: .style) ?? []
        inspiration = try container.decodeIfPresent(String.self, forKey: .inspiration) ?? ""
        keep = try container.decodeIfPresent(String.self, forKey: .keep) ?? ""
        avoid = try container.decodeIfPresent(String.self, forKey: .avoid) ?? ""
        structural = try container.decodeIfPresent(String.self, forKey: .structural) ?? ""
        household = try container.decodeIfPresent(String.self, forKey: .household) ?? ""
        contact = try container.decodeIfPresent(String.self, forKey: .contact) ?? ""
        notes = try container.decodeIfPresent(String.self, forKey: .notes) ?? ""
    }
}

struct DesignStudioIntakeSavePayload: Encodable { var intake: IntakeAnswers }

// The dashboard's "Send Intake Form" button — creates a design_studio_leads
// row and emails the intake link. No quote exists until the lead converts
// (see lib/design-studio/leads.js); mirrors api/design-studio/leads POST.
struct DesignStudioLeadCreatePayload: Encodable {
    var fullName: String
    var phone: String
    var email: String
    var address: String
}

struct DesignStudioViewer: Codable {
    var id: String
    var email: String
    var name: String
    var role: String
    var isMaster: Bool
}

struct DesignStudioQuoteListResponse: Decodable {
    var quotes: [DesignStudioQuote]
    var viewer: DesignStudioViewer
}

struct DesignStudioQuoteResponse: Decodable {
    var quote: DesignStudioQuote
    var viewer: DesignStudioViewer?
}

struct DesignStudioQuoteRef: Decodable {
    var id: String
    var quoteNumber: String
    var shareToken: String

    enum CodingKeys: String, CodingKey {
        case id
        case quoteNumber = "quote_number"
        case shareToken = "share_token"
    }
}

struct DesignStudioQuoteCreateResponse: Decodable {
    var quote: DesignStudioQuoteRef
}

struct DesignStudioPreviewResponse: Decodable {
    var quote: QuotePricing
}

struct DesignStudioConfigResponse: Decodable {
    var config: DesignStudioConfig
}

// MARK: - Room scans (LiDAR / RoomPlan)
// Captured natively only — no web equivalent — via api/design-studio/scans.

struct RoomScan: Codable, Identifiable {
    var id: String
    var quoteId: String?
    var projectId: String?
    var projectName: String?
    var roomLabel: String?
    var showToClient: Bool
    var areaSqft: Double?
    var areaIsEstimate: Bool
    var wallCount: Int
    var doorCount: Int
    var windowCount: Int
    var modelUrl: String?
    var floorPlanUrl: String?
    var modelGltfUrl: String?
    var elements: [ScanElement]
    var objects: [RoomObject]
    var annotatedPdfUrl: String?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case quoteId = "quote_id"
        case projectId = "project_id"
        case projectName = "project_name"
        case roomLabel = "room_label"
        case showToClient = "show_to_client"
        case areaSqft = "area_sqft"
        case areaIsEstimate = "area_is_estimate"
        case wallCount = "wall_count"
        case doorCount = "door_count"
        case windowCount = "window_count"
        case modelUrl = "model_url"
        case floorPlanUrl = "floor_plan_url"
        case modelGltfUrl = "model_gltf_url"
        case elements
        case objects
        case annotatedPdfUrl = "annotated_pdf_url"
        case createdAt = "created_at"
    }
}

// One detected wall/door/window, captured at scan time with RoomPlan's
// measured dimensions and editable later in the "Annotate" flow when a
// tape-measure correction is needed while walking the project.
struct ScanElement: Codable, Identifiable, Equatable {
    var id: String
    var type: String // "wall" | "door" | "window"
    var label: String
    var lengthFt: Double
    var heightFt: Double
    // Top-down position (meters, room-space), captured alongside the
    // dimensions above so a future floor-plan editor can reconstruct and
    // move this element without needing to re-scan. Not surfaced in any
    // UI yet — just persisted while it's available.
    var startX: Double
    var startZ: Double
    var endX: Double
    var endZ: Double

    enum CodingKeys: String, CodingKey {
        case id, type, label
        case lengthFt = "length_ft"
        case heightFt = "height_ft"
        case startX = "start_x"
        case startZ = "start_z"
        case endX = "end_x"
        case endZ = "end_z"
    }

    init(
        id: String = UUID().uuidString, type: String, label: String, lengthFt: Double, heightFt: Double,
        startX: Double = 0, startZ: Double = 0, endX: Double = 0, endZ: Double = 0
    ) {
        self.id = id
        self.type = type
        self.label = label
        self.lengthFt = lengthFt
        self.heightFt = heightFt
        self.startX = startX
        self.startZ = startZ
        self.endX = endX
        self.endZ = endZ
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        type = try container.decode(String.self, forKey: .type)
        label = try container.decode(String.self, forKey: .label)
        lengthFt = try container.decode(Double.self, forKey: .lengthFt)
        heightFt = try container.decode(Double.self, forKey: .heightFt)
        startX = try container.decodeIfPresent(Double.self, forKey: .startX) ?? 0
        startZ = try container.decodeIfPresent(Double.self, forKey: .startZ) ?? 0
        endX = try container.decodeIfPresent(Double.self, forKey: .endX) ?? 0
        endZ = try container.decodeIfPresent(Double.self, forKey: .endZ) ?? 0
    }
}

// One detected piece of furniture/fixture (table, sofa, storage, etc.) from
// RoomPlan's room.objects — captured now so a future asset-library editor
// has real position data to place/replace items against, without needing a
// re-scan. Not drawn anywhere but the 2D floor plan yet.
struct RoomObject: Codable, Identifiable, Equatable {
    var id: String
    var category: String
    var label: String
    var centerX: Double
    var centerZ: Double
    var widthMeters: Double
    var depthMeters: Double
    var rotationRadians: Double

    enum CodingKeys: String, CodingKey {
        case id, category, label
        case centerX = "center_x"
        case centerZ = "center_z"
        case widthMeters = "width_m"
        case depthMeters = "depth_m"
        case rotationRadians = "rotation_radians"
    }

    init(
        id: String = UUID().uuidString, category: String, label: String,
        centerX: Double, centerZ: Double, widthMeters: Double, depthMeters: Double, rotationRadians: Double
    ) {
        self.id = id
        self.category = category
        self.label = label
        self.centerX = centerX
        self.centerZ = centerZ
        self.widthMeters = widthMeters
        self.depthMeters = depthMeters
        self.rotationRadians = rotationRadians
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        category = try container.decodeIfPresent(String.self, forKey: .category) ?? "storage"
        label = try container.decodeIfPresent(String.self, forKey: .label) ?? "Object"
        centerX = try container.decodeIfPresent(Double.self, forKey: .centerX) ?? 0
        centerZ = try container.decodeIfPresent(Double.self, forKey: .centerZ) ?? 0
        widthMeters = try container.decodeIfPresent(Double.self, forKey: .widthMeters) ?? 0
        depthMeters = try container.decodeIfPresent(Double.self, forKey: .depthMeters) ?? 0
        rotationRadians = try container.decodeIfPresent(Double.self, forKey: .rotationRadians) ?? 0
    }
}

struct DesignStudioProject: Codable, Identifiable {
    var id: String
    var name: String
    var address: String?
    var ownerName: String?
}

struct DesignStudioProjectListResponse: Decodable { var projects: [DesignStudioProject] }

struct DesignStudioClient: Codable, Identifiable {
    var id: String
    var name: String
    var email: String?
    var phone: String?
}

struct DesignStudioClientListResponse: Decodable { var clients: [DesignStudioClient] }

// Creates a real account (auth user + profiles row), no project — a
// Design Studio quote precedes the project by design. Field names match
// the web builder's POST body (JS convention, see the request-payloads
// note below).
struct DesignStudioClientCreatePayload: Encodable {
    var firstName: String
    var lastName: String
    var email: String
    var phone: String
}

struct DesignStudioClientCreateResponse: Decodable { var client: DesignStudioClient }

struct DesignStudioNewProjectPayload: Encodable {
    var ownerId: String
    var projectName: String
    var address: String?
}

struct DesignStudioNewProjectResponse: Decodable {
    var success: Bool
    var projectId: String
}

struct RoomScanResponse: Decodable { var scan: RoomScan }
struct RoomScanListResponse: Decodable { var scans: [RoomScan] }

struct RoomScanUploadURLResponse: Decodable {
    var scanId: String
    var model: SignedUpload
    var floorPlan: SignedUpload
    var modelGltf: SignedUpload

    struct SignedUpload: Decodable { var path: String; var token: String }
}

struct RoomScanCreatePayload: Encodable {
    var scanId: String
    var quoteId: String?
    var roomLabel: String?
    var showToClient: Bool
    var areaSqft: Double?
    var areaIsEstimate: Bool
    var wallCount: Int
    var doorCount: Int
    var windowCount: Int
    var hasGltf: Bool
    var elements: [ScanElement]
    var objects: [RoomObject]
}

struct RoomScanAttachPayload: Encodable { var quoteId: String }
struct RoomScanVisibilityPayload: Encodable { var showToClient: Bool }

// Signed upload slot for the annotated PDF, minted against an existing
// scan id — see api/design-studio/scans/[id]/annotation-upload-url.
struct RoomScanAnnotationUploadURLResponse: Decodable { var path: String; var token: String }

// Sent after the annotated PDF is uploaded straight to Storage: replaces
// the scan's measurement elements with whatever was edited in the
// Annotate screen and flips annotated_pdf_path on.
struct RoomScanAnnotationSavePayload: Encodable {
    var elements: [ScanElement]
    var hasAnnotatedPdf: Bool
}

// Sent by the floor-plan editor (RoomScanEditorView) — a separate payload
// from RoomScanAnnotationSavePayload since the two are conceptually
// different operations (this never touches annotated_pdf_path, that
// always accompanies a fresh PDF upload) even though both PATCH the same
// endpoint, which already accepts elements/objects independently.
struct RoomScanEditPayload: Encodable {
    var elements: [ScanElement]
    var objects: [RoomObject]
}

// projectId: nil means "detach" and must reach the server as an explicit
// JSON null, not an omitted key — Swift's synthesized Encodable silently
// drops nil optionals instead, which the API reads as "no change".
struct RoomScanProjectPayload: Encodable {
    var projectId: String?

    enum CodingKeys: String, CodingKey { case projectId }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(projectId, forKey: .projectId)
    }
}

// MARK: - Floor plans (manually uploaded PDF/image/CAD)
// No capture step, unlike room scans — just a file staff already has.

struct FloorPlan: Codable, Identifiable {
    var id: String
    var quoteId: String?
    var projectId: String?
    var projectName: String?
    var fileName: String
    var fileType: String
    var isRenderable: Bool
    var showToClient: Bool
    var fileUrl: String?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case quoteId = "quote_id"
        case projectId = "project_id"
        case projectName = "project_name"
        case fileName = "file_name"
        case fileType = "file_type"
        case isRenderable = "is_renderable"
        case showToClient = "show_to_client"
        case fileUrl = "file_url"
        case createdAt = "created_at"
    }
}

struct FloorPlanResponse: Decodable { var floorPlan: FloorPlan }
struct FloorPlanListResponse: Decodable { var floorPlans: [FloorPlan] }

struct FloorPlanUploadURLResponse: Decodable {
    var id: String
    var fileName: String
    var path: String
    var token: String
}

struct FloorPlanCreatePayload: Encodable {
    var id: String
    var path: String
    var fileName: String
    var quoteId: String?
    var showToClient: Bool
}

struct FloorPlanVisibilityPayload: Encodable { var showToClient: Bool }

// MARK: - Request payloads
// Sent to the same api/design-studio routes the web builder posts to.
// Property names are deliberately camelCase with no CodingKeys override —
// the API reads body.clientName, body.areaSqft etc. directly (JS convention),
// only the *stored row* is snake_case.

struct DesignStudioQuoteInput: Encodable, Equatable {
    var clientId: String?
    var clientName: String
    var clientEmail: String
    var clientPhone: String
    var projectAddress: String
    var projectType: String
    var serviceLevel: String
    var complexity: String
    var areaSqft: Double
    var rush: Bool
    var tradePartner: Bool
    var addOns: [String: Double]
    var manualAdjustment: Double
    var adjustmentNote: String
    var internalNotes: String
    var includedOverride: [String]?
    var hideAddOnMenu: Bool

    static var empty: DesignStudioQuoteInput {
        DesignStudioQuoteInput(
            clientId: nil, clientName: "", clientEmail: "", clientPhone: "", projectAddress: "",
            projectType: "adu", serviceLevel: "design", complexity: "standard", areaSqft: 600,
            rush: false, tradePartner: false, addOns: [:], manualAdjustment: 0, adjustmentNote: "", internalNotes: "",
            includedOverride: nil, hideAddOnMenu: false
        )
    }
}

struct DesignStudioStatusPayload: Encodable { var status: String }
struct DesignStudioInternalNotesPayload: Encodable { var internalNotes: String }
struct DesignStudioRepricePayload: Encodable { var reprice: DesignStudioQuoteInput }
struct DesignStudioConfigSavePayload: Encodable { var config: DesignStudioConfig; var note: String? }
struct DesignStudioReassignPayload: Encodable { var reassignTo: String }

// MARK: - Display helpers

let designStudioProjectTypeLabels: [String: String] = [
    "kitchen": "Single Room",
    "adu": "ADU / Garage Conversion",
    "partial": "Partial Home / Multi-Room",
    "fullhouse": "Full House",
]

let designStudioServiceLevelLabels: [String: String] = [
    "essentials": "Essentials",
    "design": "Design",
    "premium": "Premium",
]

let designStudioComplexityLabels: [String: String] = [
    "standard": "Standard",
    "complex": "Complex",
    "high": "High Complexity",
]

func designStudioCurrency(_ amount: Double?) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.locale = Locale(identifier: "en_US")
    formatter.maximumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount ?? 0)) ?? "$0"
}
