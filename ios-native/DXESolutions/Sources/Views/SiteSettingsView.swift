import SwiftUI

// Admin-only. Mirrors app/admin/site-settings/page.js: the Google-booking
// toggle, the Google Calendar connection status (reusing the existing
// GoogleCalendarConnection view as-is), and the public booking page's
// availability rules.
struct SiteSettingsView: View {
    @State private var googleBookingEnabled = true
    @State private var rows: [String: DayRow] = [:]
    @State private var sessionMinutes = "15"
    @State private var bufferMinutes = "10"
    @State private var minNoticeHours = "4"
    @State private var maxDaysOut = "14"
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var saved = false

    struct DayRow {
        var open: Bool
        var start: Date
        var end: Date
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                Form {
                    Section {
                        Toggle("Google Calendar booking on \"Book a call\"", isOn: $googleBookingEnabled)
                    }

                    Section("Google Calendar") {
                        GoogleCalendarConnection()
                        Text("The first admin to connect becomes the calendar public bookings are checked against. If no times ever show up as available, disconnect and reconnect — older connections may be missing the calendar permission this feature needs.")
                            .font(.caption2).foregroundColor(.secondary)
                    }

                    Section("Session settings") {
                        labeledNumberField("Session length (min)", text: $sessionMinutes)
                        labeledNumberField("Buffer (min)", text: $bufferMinutes)
                        labeledNumberField("Minimum notice (hrs)", text: $minNoticeHours)
                        labeledNumberField("Book up to (days out)", text: $maxDaysOut)
                    }

                    Section("Weekly hours") {
                        ForEach(bookingDayOrder, id: \.self) { key in
                            dayRow(key)
                        }
                    }

                    if let errorMessage {
                        Text(errorMessage).foregroundColor(.red).font(.caption)
                    }
                    if saved {
                        Text("Saved.").foregroundColor(.secondary).font(.caption)
                    }
                }
            }
        }
        .navigationTitle("Site Settings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button(isSaving ? "Saving…" : "Save") {
                    Task { await save() }
                }
                .disabled(isSaving || isLoading)
            }
        }
        .task { await load() }
    }

    private func labeledNumberField(_ label: String, text: Binding<String>) -> some View {
        HStack {
            Text(label)
            Spacer()
            TextField("", text: text)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 60)
        }
    }

    private func dayRow(_ key: String) -> some View {
        let binding = Binding<DayRow>(
            get: { rows[key] ?? DayRow(open: false, start: timeDate("09:00"), end: timeDate("17:00")) },
            set: { rows[key] = $0 }
        )
        return VStack(alignment: .leading, spacing: 4) {
            Toggle(bookingDayLabels[key] ?? key, isOn: Binding(get: { binding.wrappedValue.open }, set: { binding.wrappedValue.open = $0 }))
            if binding.wrappedValue.open {
                HStack {
                    DatePicker("Start", selection: Binding(get: { binding.wrappedValue.start }, set: { binding.wrappedValue.start = $0 }), displayedComponents: .hourAndMinute)
                        .labelsHidden()
                    Text("–")
                    DatePicker("End", selection: Binding(get: { binding.wrappedValue.end }, set: { binding.wrappedValue.end = $0 }), displayedComponents: .hourAndMinute)
                        .labelsHidden()
                }
            }
        }
    }

    private func timeDate(_ hhmm: String) -> Date {
        let parts = hhmm.split(separator: ":").compactMap { Int($0) }
        var components = DateComponents()
        components.hour = parts.first ?? 9
        components.minute = parts.count > 1 ? parts[1] : 0
        return Calendar.current.date(from: components) ?? Date()
    }

    private func timeString(_ date: Date) -> String {
        let components = Calendar.current.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", components.hour ?? 0, components.minute ?? 0)
    }

    private func load() async {
        if let response: SiteSettingsResponse = try? await APIClient.get("api/admin/site-settings") {
            googleBookingEnabled = response.googleBookingEnabled
        }
        if let response: BookingAvailabilityResponse = try? await APIClient.get("api/admin/booking-availability"),
           let config = response.config {
            sessionMinutes = String(config.sessionMinutes)
            bufferMinutes = String(config.bufferMinutes)
            minNoticeHours = String(config.minNoticeHours)
            maxDaysOut = String(config.maxDaysOut)
            var loaded: [String: DayRow] = [:]
            for key in bookingDayOrder {
                if let window = config.weeklyHours[key]?.first {
                    loaded[key] = DayRow(open: true, start: timeDate(window.start), end: timeDate(window.end))
                } else {
                    loaded[key] = DayRow(open: false, start: timeDate("09:00"), end: timeDate("17:00"))
                }
            }
            rows = loaded
        }
        isLoading = false
    }

    private func save() async {
        isSaving = true
        errorMessage = nil
        saved = false
        defer { isSaving = false }
        do {
            try await APIClient.send(
                "api/admin/site-settings", method: "PATCH",
                body: SiteSettingsPayload(googleBookingEnabled: googleBookingEnabled)
            )
            var weeklyHours: [String: [BookingWindow]] = [:]
            for key in bookingDayOrder {
                let row = rows[key] ?? DayRow(open: false, start: timeDate("09:00"), end: timeDate("17:00"))
                weeklyHours[key] = row.open ? [BookingWindow(start: timeString(row.start), end: timeString(row.end))] : []
            }
            try await APIClient.send(
                "api/admin/booking-availability", method: "PATCH",
                body: BookingAvailabilityPayload(
                    sessionMinutes: Int(sessionMinutes) ?? 15,
                    bufferMinutes: Int(bufferMinutes) ?? 10,
                    minNoticeHours: Int(minNoticeHours) ?? 4,
                    maxDaysOut: Int(maxDaysOut) ?? 14,
                    weeklyHours: weeklyHours
                )
            )
            HapticManager.success()
            saved = true
        } catch let apiError as APIError {
            HapticManager.error()
            errorMessage = apiError.errorDescription
        } catch {
            HapticManager.error()
            errorMessage = "Could not save settings."
        }
    }
}
