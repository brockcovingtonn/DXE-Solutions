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
    var clientName: String?
    var clientEmail: String?
    var clientPhone: String?
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
        case id, status, pricing, total, deposit, complexity
        case quoteNumber = "quote_number"
        case clientName = "client_name"
        case clientEmail = "client_email"
        case clientPhone = "client_phone"
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
    var roomLabel: String?
    var areaSqft: Double?
    var areaIsEstimate: Bool
    var wallCount: Int
    var doorCount: Int
    var windowCount: Int
    var modelUrl: String?
    var floorPlanUrl: String?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case quoteId = "quote_id"
        case roomLabel = "room_label"
        case areaSqft = "area_sqft"
        case areaIsEstimate = "area_is_estimate"
        case wallCount = "wall_count"
        case doorCount = "door_count"
        case windowCount = "window_count"
        case modelUrl = "model_url"
        case floorPlanUrl = "floor_plan_url"
        case createdAt = "created_at"
    }
}

struct RoomScanResponse: Decodable { var scan: RoomScan }
struct RoomScanListResponse: Decodable { var scans: [RoomScan] }

struct RoomScanUploadURLResponse: Decodable {
    var scanId: String
    var model: SignedUpload
    var floorPlan: SignedUpload

    struct SignedUpload: Decodable { var path: String; var token: String }
}

struct RoomScanCreatePayload: Encodable {
    var scanId: String
    var quoteId: String?
    var roomLabel: String?
    var areaSqft: Double?
    var areaIsEstimate: Bool
    var wallCount: Int
    var doorCount: Int
    var windowCount: Int
}

struct RoomScanAttachPayload: Encodable { var quoteId: String }

// MARK: - Request payloads
// Sent to the same api/design-studio routes the web builder posts to.
// Property names are deliberately camelCase with no CodingKeys override —
// the API reads body.clientName, body.areaSqft etc. directly (JS convention),
// only the *stored row* is snake_case.

struct DesignStudioQuoteInput: Encodable, Equatable {
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

    static var empty: DesignStudioQuoteInput {
        DesignStudioQuoteInput(
            clientName: "", clientEmail: "", clientPhone: "", projectAddress: "",
            projectType: "adu", serviceLevel: "design", complexity: "standard", areaSqft: 600,
            rush: false, tradePartner: false, addOns: [:], manualAdjustment: 0, adjustmentNote: "", internalNotes: ""
        )
    }
}

struct DesignStudioStatusPayload: Encodable { var status: String }
struct DesignStudioInternalNotesPayload: Encodable { var internalNotes: String }
struct DesignStudioRepricePayload: Encodable { var reprice: DesignStudioQuoteInput }
struct DesignStudioConfigSavePayload: Encodable { var config: DesignStudioConfig; var note: String? }

// MARK: - Display helpers

let designStudioProjectTypeLabels: [String: String] = [
    "kitchen": "Kitchen / Single Room",
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
