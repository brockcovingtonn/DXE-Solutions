import Foundation
import Supabase

// Same project the website uses — anon key only, safe to embed client-side
// (identical to what NEXT_PUBLIC_SUPABASE_ANON_KEY ships in the browser
// bundle today). All real authorization still happens via RLS.
enum SupabaseConfig {
    static let url = URL(string: "https://gtlktqkgsuwmzjrkukzs.supabase.co")!
    static let anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bGt0cWtnc3V3bXpqcmt1a3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNzQ0OTAsImV4cCI6MjA5Njk1MDQ5MH0.9lmXP7pd8u4jK-cqdUN5OYNbTh2lhia-8n2Q6Z6YpAc"

    static let client = SupabaseClient(supabaseURL: url, supabaseKey: anonKey)
}
