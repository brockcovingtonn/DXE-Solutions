import Foundation

struct Project: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let address: String?
    let projectType: String?
    let status: String
    let progressPct: Int?
    let startedOn: String?
    let estimatedCompletion: String?
    let apn: String?
    let jurisdiction: String?
    let zoning: String?
    let lotSize: String?
    let buildingSize: String?

    enum CodingKeys: String, CodingKey {
        case id, name, address, status, apn, jurisdiction, zoning
        case projectType = "project_type"
        case progressPct = "progress_pct"
        case startedOn = "started_on"
        case estimatedCompletion = "estimated_completion"
        case lotSize = "lot_size"
        case buildingSize = "building_size"
    }
}

struct ProjectPhase: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let pct: Int?
    let state: String
    let sortOrder: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, pct, state
        case sortOrder = "sort_order"
    }
}

struct ProjectMilestone: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let displayDate: String?
    let state: String
    let notes: String?
    let sortOrder: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, state, notes
        case displayDate = "display_date"
        case sortOrder = "sort_order"
    }
}

struct ProjectDocument: Codable, Identifiable, Hashable {
    let id: String
    let fileName: String
    let filePath: String
    let fileType: String?
    let badge: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case fileName = "file_name"
        case filePath = "file_path"
        case fileType = "file_type"
        case badge
        case createdAt = "created_at"
    }
}

struct ProjectPhoto: Codable, Identifiable, Hashable {
    let id: String
    let filePath: String
    let caption: String?
    let takenOn: String?

    enum CodingKeys: String, CodingKey {
        case id
        case filePath = "file_path"
        case caption
        case takenOn = "taken_on"
    }
}

struct ChatMessage: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String?
    let dmUserId: String?
    let senderId: String
    let senderName: String
    let senderRole: String
    let body: String
    let createdAt: String
    let attachmentPath: String?
    let attachmentName: String?
    let attachmentType: String?

    enum CodingKeys: String, CodingKey {
        case id, body
        case projectId = "project_id"
        case dmUserId = "dm_user_id"
        case senderId = "sender_id"
        case senderName = "sender_name"
        case senderRole = "sender_role"
        case createdAt = "created_at"
        case attachmentPath = "attachment_path"
        case attachmentName = "attachment_name"
        case attachmentType = "attachment_type"
    }
}

struct MessageRead: Codable, Hashable {
    let projectId: String?
    let dmUserId: String?
    let userId: String
    let lastReadAt: String

    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case dmUserId = "dm_user_id"
        case userId = "user_id"
        case lastReadAt = "last_read_at"
    }
}

struct CalendarEvent: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String?
    let title: String
    let description: String?
    let startTime: String
    let endTime: String?
    let allDay: Bool
    let visibleToClient: Bool
    let eventType: String?
    let assignedTo: String?
    let projects: AdminProjectRef?

    enum CodingKeys: String, CodingKey {
        case id, title, description, projects
        case projectId = "project_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case allDay = "all_day"
        case visibleToClient = "visible_to_client"
        case eventType = "event_type"
        case assignedTo = "assigned_to"
    }
}

struct ProjectRosterMember: Codable, Identifiable, Hashable {
    let id: String
    let firstName: String?
    let lastName: String?
    let role: String

    enum CodingKeys: String, CodingKey {
        case id, role
        case firstName = "first_name"
        case lastName = "last_name"
    }

    var name: String { [firstName, lastName].compactMap { $0 }.joined(separator: " ") }
}

struct ProjectRoster: Codable {
    let staff: [ProjectRosterMember]
}

struct Permit: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String
    let permitType: String
    let permitNumber: String?
    let agency: String?
    let status: String
    let submittedDate: String?
    let issuedDate: String?
    let expirationDate: String?

    enum CodingKeys: String, CodingKey {
        case id, status, agency
        case projectId = "project_id"
        case permitType = "permit_type"
        case permitNumber = "permit_number"
        case submittedDate = "submitted_date"
        case issuedDate = "issued_date"
        case expirationDate = "expiration_date"
    }
}

struct UtilityEntry: Codable, Identifiable, Hashable {
    let id: String
    let application: String?
    let workRequestNumber: String?
    let status: String

    enum CodingKeys: String, CodingKey {
        case id, application, status
        case workRequestNumber = "work_request_number"
    }
}

struct ProjectUtility: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String
    let utilityType: String
    let enabled: Bool
    let contactTrade: String?
    let contactName: String?
    let contactPhone: String?
    let contactEmail: String?
    let entries: [UtilityEntry]

    enum CodingKeys: String, CodingKey {
        case id, enabled, entries
        case projectId = "project_id"
        case utilityType = "utility_type"
        case contactTrade = "contact_trade"
        case contactName = "contact_name"
        case contactPhone = "contact_phone"
        case contactEmail = "contact_email"
    }
}

struct Invoice: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String
    let kind: String
    let description: String
    let amount: Double
    let status: String
    let dueDate: String?
    let paidDate: String?
    let filePath: String?
    let fileName: String?

    enum CodingKeys: String, CodingKey {
        case id, kind, description, amount, status
        case projectId = "project_id"
        case dueDate = "due_date"
        case paidDate = "paid_date"
        case filePath = "file_path"
        case fileName = "file_name"
    }
}

struct Note: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String
    let authorId: String?
    let authorName: String
    let authorRole: String
    let body: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, body
        case projectId = "project_id"
        case authorId = "author_id"
        case authorName = "author_name"
        case authorRole = "author_role"
        case createdAt = "created_at"
    }
}

struct Review: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String
    let clientId: String
    let clientName: String
    let projectType: String?
    let rating: Int
    let body: String?
    let featured: Bool
    let createdAt: String
    let updatedAt: String
    let projects: AdminProjectRef?

    enum CodingKeys: String, CodingKey {
        case id, rating, body, featured, projects
        case projectId = "project_id"
        case clientId = "client_id"
        case clientName = "client_name"
        case projectType = "project_type"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CoverSheetOwner: Codable, Hashable {
    let firstName: String?
    let lastName: String?
    let email: String?
    let phone: String?

    enum CodingKeys: String, CodingKey {
        case email, phone
        case firstName = "first_name"
        case lastName = "last_name"
    }
}

struct CoverSheetProject: Codable, Hashable {
    let id: String
    let name: String
    let address: String?
    let projectType: String?
    let status: String
    let progressPct: Int?
    let startedOn: String?
    let estimatedCompletion: String?
    let apn: String?
    let jurisdiction: String?
    let zoning: String?
    let lotSize: String?
    let buildingSize: String?
    let profiles: CoverSheetOwner?

    enum CodingKeys: String, CodingKey {
        case id, name, address, status, apn, jurisdiction, zoning, profiles
        case projectType = "project_type"
        case progressPct = "progress_pct"
        case startedOn = "started_on"
        case estimatedCompletion = "estimated_completion"
        case lotSize = "lot_size"
        case buildingSize = "building_size"
    }
}

struct ProjectTeamMember: Codable, Identifiable, Hashable {
    let id: String
    let trade: String
    let name: String?
    let phone: String?
    let email: String?
}

struct AdminProjectRef: Codable, Hashable {
    let id: String
    let name: String
}

struct ActivityItem: Codable, Identifiable, Hashable {
    let id: String
    let type: String
    let text: String
    let createdAt: String
    let projects: AdminProjectRef?

    enum CodingKeys: String, CodingKey {
        case id, type, text, projects
        case createdAt = "created_at"
    }
}

struct AdminMilestoneItem: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let displayDate: String?
    let state: String
    let projects: AdminProjectRef?

    enum CodingKeys: String, CodingKey {
        case id, name, state, projects
        case displayDate = "display_date"
    }
}

struct AdminUtilityRef: Codable, Hashable {
    let utilityType: String?
    let projects: AdminProjectRef?

    enum CodingKeys: String, CodingKey {
        case projects
        case utilityType = "utility_type"
    }
}

struct AdminUtilityEntry: Codable, Identifiable, Hashable {
    let id: String
    let application: String?
    let workRequestNumber: String?
    let status: String
    let projectUtilities: AdminUtilityRef?

    enum CodingKeys: String, CodingKey {
        case id, application, status
        case workRequestNumber = "work_request_number"
        case projectUtilities = "project_utilities"
    }
}

struct AdminProjectListItem: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let address: String?
    let projectType: String?
    let status: String
    let progressPct: Int?
    let profiles: CoverSheetOwner?

    enum CodingKeys: String, CodingKey {
        case id, name, address, status, profiles
        case projectType = "project_type"
        case progressPct = "progress_pct"
    }
}

struct AdminUtilityEntryDetail: Codable, Identifiable, Hashable {
    let id: String
    let application: String?
    let workRequestNumber: String?
    let status: String
    let actionStep: String?
    let comments: String?

    enum CodingKeys: String, CodingKey {
        case id, application, status, comments
        case workRequestNumber = "work_request_number"
        case actionStep = "action_step"
    }
}

struct AdminProjectUtility: Codable, Identifiable, Hashable {
    let id: String?
    let projectId: String?
    let utilityType: String
    let enabled: Bool
    let contactTrade: String?
    let contactName: String?
    let contactPhone: String?
    let contactEmail: String?
    let contactComments: String?
    let entries: [AdminUtilityEntryDetail]

    enum CodingKeys: String, CodingKey {
        case id, enabled, entries
        case projectId = "project_id"
        case utilityType = "utility_type"
        case contactTrade = "contact_trade"
        case contactName = "contact_name"
        case contactPhone = "contact_phone"
        case contactEmail = "contact_email"
        case contactComments = "contact_comments"
    }
}

struct ProjectContactLink: Codable, Hashable {
    let projectId: String
    let projects: AdminProjectRef?

    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case projects
    }
}

struct Contact: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let company: String?
    let trade: String?
    let phone: String?
    let email: String?
    let notes: String?
    let projectContacts: [ProjectContactLink]?

    enum CodingKeys: String, CodingKey {
        case id, name, company, trade, phone, email, notes
        case projectContacts = "project_contacts"
    }
}

struct DocumentTemplate: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String?
    let category: String?
    let filePath: String
    let fileName: String
    let fileSize: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, description, category
        case filePath = "file_path"
        case fileName = "file_name"
        case fileSize = "file_size"
    }
}

struct RosterMember: Identifiable, Hashable {
    let id: String
    let name: String
    let role: String
}

struct ActionItemProjectRef: Codable, Hashable {
    let name: String
}

struct ActionItem: Codable, Identifiable, Hashable {
    let id: String
    let projectId: String
    let title: String
    let description: String?
    let status: String
    let dueDate: String?
    let assignedTo: String?
    let visibleToClient: Bool?
    let projects: ActionItemProjectRef?

    enum CodingKeys: String, CodingKey {
        case id, title, description, status, projects
        case projectId = "project_id"
        case dueDate = "due_date"
        case assignedTo = "assigned_to"
        case visibleToClient = "visible_to_client"
    }
}

struct TrainingStep: Codable, Identifiable, Hashable {
    let id: String
    let projectType: String
    let title: String
    let description: String?
    let sortOrder: Int?

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case projectType = "project_type"
        case sortOrder = "sort_order"
    }
}
