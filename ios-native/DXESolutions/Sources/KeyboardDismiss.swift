import SwiftUI

extension View {
    // SwiftUI doesn't dismiss the keyboard on a tap outside a text field
    // the way UIKit did by default — this adds that back.
    func dismissKeyboardOnTap() -> some View {
        // simultaneousGesture rather than onTapGesture so this never
        // steals the tap from a button/link underneath — it just also
        // fires alongside whatever else handles it.
        simultaneousGesture(
            TapGesture().onEnded {
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
            }
        )
    }
}
