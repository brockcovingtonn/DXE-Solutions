# DXE Solutions — Website & Client Portal

Built with Next.js, Supabase, Resend, and deployed on Vercel.

## What's in this project

- **Marketing site** — home, about, what we do, projects, get an estimate, contact (all on one scrollable homepage except the estimate form)
- **Client portal** (`/portal`) — authenticated area where clients see their project(s): overview/dashboard, documents, photos, notes & updates, account settings
- **Login** (`/login`) — Supabase email/password auth
- **Estimate form** — submits to `/api/estimate`, which sends an email to Dixie via Resend

---

## Step-by-step setup

### 1. Install dependencies

Open this folder in VS Code, open a terminal (`` Ctrl+` `` or `` Cmd+` ``), and run:

```bash
npm install
```

### 2. Set up environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Open `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your Supabase project's **Settings > API** page
- `SUPABASE_SERVICE_ROLE_KEY` — also from **Settings > API**, under "service_role" (click "Reveal" to see it). **Keep this secret** — it bypasses all security rules and should never be exposed to the browser. It's only used in admin API routes.
- `RESEND_API_KEY` — from your Resend dashboard under **API Keys** (create one if you haven't)
- `ESTIMATE_NOTIFICATION_EMAIL` — the email address that should receive estimate requests (e.g. `dixie@dxesolutions.com`)
- `RESEND_FROM_EMAIL` — while testing, use `onboarding@resend.dev`. Once you verify your own domain in Resend, switch this to something like `estimates@dxesolutions.com`

`.env.local` is gitignored — it will never be pushed to GitHub.

### 3. Set up the Supabase database

1. Go to your Supabase project dashboard → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this project, copy its entire contents, paste into the SQL editor, and click **Run**
3. Go to **Storage** in the left sidebar and create two buckets:
   - `project-documents` (keep it **private**, not public)
   - `project-photos` (keep it **private**, not public)
4. (Optional, for testing) Create a demo client user:
   - Go to **Authentication > Users > Add user**
   - Email: `client@demo.com`, password: your choice, check "Auto Confirm User"
   - Copy that user's UUID
   - Open `supabase/seed.sql`, replace `PASTE_USER_UUID_HERE` with that UUID, paste the whole file into the SQL editor, and run it
   - This creates two sample projects with milestones, documents, notes, and activity so you can see the portal populated

### 4. Run it locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Try logging in at `/login` with your demo user.

### 5. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit - DXE Solutions site"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/dxe-solutions.git
git push -u origin main
```

(Replace the URL with the one GitHub gave you when you created the repo.)

### 6. Deploy to Vercel

1. Go to your Vercel dashboard → **Add New > Project**
2. Select the `dxe-solutions` repo — Vercel will auto-detect Next.js
3. Before clicking **Deploy**, expand **Environment Variables** and add the same variables from your `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `ESTIMATE_NOTIFICATION_EMAIL`
   - `RESEND_FROM_EMAIL`
4. Click **Deploy**

Every time you `git push` to `main` after this, Vercel automatically redeploys.

### 7. Connect a custom domain (later)

1. Buy `dxesolutions.com` (or similar) via Namecheap or Google Domains (~$15/year)
2. In Vercel: **Project Settings > Domains** → add your domain
3. Vercel shows you DNS records to add at your domain registrar — follow those instructions exactly

---

## How Dixie adds new clients & projects

There's now a built-in admin dashboard for this — no SQL required.

### One-time setup: make an account an admin

1. Run `supabase/admin_migration.sql` once in the Supabase SQL editor (same way you ran `schema.sql` — copy, paste, Run). This adds the `is_admin` flag and the security rules that let admins see/manage every client's data.
2. Run `supabase/feature_migration.sql` once as well. This adds the project team table, utilities tracking, milestone notes, and removes the old "estimated value" / "project manager" fields from projects.
3. Run `supabase/utility_entries_migration.sql` once, after `feature_migration.sql`. This restructures utilities so each Electrical/Water/Gas type has one contact plus multiple tracking entries (Application, Work Request #, Status, Action Step, Comments).
4. Run `supabase/admin_utilities_function.sql` once, after `utility_entries_migration.sql`. This adds an admin-only function so the admin dashboard can see and manage entries (including the admin-only Action Step / Comments fields).
5. Run `supabase/contacts_migration.sql` once. This adds a global Contacts list (people/companies Dixie works with regularly), optionally linkable to specific projects.
6. Run `supabase/templates_migration.sql` once. This adds a Templates section and a storage bucket for standard documents Dixie can apply to any project.
7. Run `supabase/email_notifications_migration.sql` once. This adds an email notifications preference to client accounts (default on).
8. Run `supabase/admin_notes_management_migration.sql` once. This lets admins edit and delete any note in the Notes & Updates section.
9. Run `supabase/employee_role_migration.sql` once. This adds the `is_employee` flag, a `project_employees` assignment table, and read-only security rules so employee accounts only see the projects they're assigned to.
10. Run `supabase/action_items_migration.sql` once, after `employee_role_migration.sql`. This adds the `action_items` table admins use to create and assign tasks, employees can mark complete on their assigned projects, and clients only see when explicitly flagged visible to them.
11. Run `supabase/project_permitting_fields_migration.sql` once. This adds APN, jurisdiction, zoning, lot size, and building size fields to projects, editable from the project detail page and shown on the cover sheet. (It also added a `permit_number` field that is no longer used by the app — see the next migration.)
12. Run `supabase/permits_migration.sql` once, after `employee_role_migration.sql`. This adds a full `permits` table (a project can have any number of permits, each with its own type, agency, status, and dates) with a client-safe `get_project_permits` function, replacing the single `permit_number` field from the previous migration.
13. Run `supabase/reviews_migration.sql` once, after `admin_migration.sql`. This adds a `reviews` table — clients submit a star rating + optional written review per project from their portal, admins can mark specific reviews "featured" from `/admin/reviews`, and featured reviews are publicly readable (including by signed-out visitors) for the homepage testimonials section.
14. Run `supabase/invoices_migration.sql` once, after `employee_role_migration.sql`. This adds an `invoices` table (invoices the client owes, and receipts for expenses paid on their behalf), each optionally with an attached PDF. **After running it, go to Storage in the Supabase dashboard and create a new bucket named `project-invoices` (private)** — the same way `project-documents` and `project-photos` were created — the storage policies in this migration depend on that bucket existing.
15. Run `supabase/training_migration.sql` once, after `employee_role_migration.sql`. This adds the `training_steps` table and seeds it with DXE's standard project workflow plus category-specific steps, viewable at `/admin/training` (editable) and `/employee/training` (read-only).
16. Run `supabase/calendar_migration.sql` once, after `employee_role_migration.sql`. This adds `calendar_events` (admin-managed, optionally tagged to a project and to a client) and `google_calendar_connections` (server-only — no client-readable policy; holds OAuth tokens for one-way sync to Google Calendar). See "Google Calendar sync setup" below before connecting.
17. Run `supabase/messages_migration.sql` once, after `employee_role_migration.sql`. This adds the `messages` table powering per-project chat between the client, admins, and assigned employees, and enables Supabase Realtime on it so messages arrive live.
18. Run `supabase/message_reads_migration.sql` once, after `messages_migration.sql`. This adds `message_reads` (who's read a project's chat, and when — also realtime-enabled, powering the "Read" receipt under your last sent message) and a `get_unread_message_counts()` function used to badge "Chat" links around the app.
19. Run `supabase/chat_dm_migration.sql` once, after `message_reads_migration.sql`. This adds direct-message threads (a private line between one client or employee and admin, with no admin id to record since any admin can read/reply to any DM) alongside the existing per-project group threads, and reworks `get_unread_message_counts()` to cover both. This is what powers the floating chat widget — clients only ever see their DM-with-admin thread; employees can pick an assigned project or "Dixie" (their DM thread); admins can open any project or any client/employee's DM.
20. Run `supabase/onboarding_migration.sql` any time. Adds a single `has_seen_portal_tour` flag to `profiles`, powering the first-login walkthrough pop-up in the client portal (skippable, and replayable from Account Settings → "Take the tour again"). No new RLS policy needed — profiles already lets a user update their own row.
21. Run `supabase/chat_client_roster_migration.sql` any time after `chat_dm_migration.sql`. Clients now pick a specific project to chat about (not just a general DM) — this adds the missing RLS so a client can actually see who else is in that conversation (admin, and any employee assigned to their project) for the "online now" roster and read receipts.
22. Run `supabase/chat_client_roster_fix_migration.sql` immediately after it. The migration above had a bug: one of its policies caused a Postgres RLS infinite-recursion loop (`project_employees` ↔ `projects`) that broke every query against `profiles`/`projects`/`project_employees` — for every account, not just clients, including the basic "what's my role" lookup on login. This fixes it by routing the check through a security-definer function instead, the same pattern `is_admin()`/`is_employee()` already use.
23. Run `supabase/client_activity_log_migration.sql` any time. Adds the missing RLS policy letting a client's own session insert into `activity` for their own project — `/api/notes` and `/api/documents` were already trying to log client-authored notes/uploads there, but silently failing since only admins had an insert policy.
24. Run `supabase/employee_project_team_migration.sql` any time after `employee_role_migration.sql`. Adds the missing RLS policy letting an assigned employee view `project_team` — the Cover Sheet page has been silently showing "No team members on file" for employees even when a team is on file, since only admins and the owning client ever had select access.
25. Run `supabase/client_employee_contacts_migration.sql` any time after `contacts_migration.sql` and `employee_role_migration.sql`. Adds scoped select policies so a client sees contacts linked to a project they own, and an employee sees contacts linked to a project they're assigned to — `contacts`/`project_contacts` previously only had an admin-only policy.
26. Run `supabase/push_notifications_migration.sql` any time. Adds a `device_tokens` table (one row per registered device, keyed to `user_id`) so the server can push native alerts via APNs for new chat messages, new documents/photos/notes, project status changes, and action item assignments. See "Push notifications setup" below to generate and configure the APNs credentials — without them, `sendPushToUser()` is a silent no-op.
27. Run `supabase/employee_client_uploads_migration.sql` any time after `employee_role_migration.sql`. Adds the RLS policies (table + storage) letting employees upload documents to projects they're assigned to, and letting both clients and employees upload photos — previously only admins could insert photos, and only clients (not employees) could insert documents. Powers the native app's camera capture / document scanner feature.
28. Run `supabase/chat_attachments_migration.sql` any time after `chat_dm_migration.sql`. Adds `attachment_path`/`attachment_name`/`attachment_type` columns to `messages` and the storage RLS letting anyone in a thread (client, employee, or admin) attach a photo or file to a chat message. **After running it, go to Storage in the Supabase dashboard and create a new bucket named `chat-attachments` (private)** — same as the other storage buckets — the policies in this migration depend on it existing.
29. Run `supabase/calendar_event_types_migration.sql` any time after `calendar_migration.sql` and `action_items_migration.sql`. Adds `event_type`/`assigned_to`/`linked_action_item_id` to `calendar_events`, and lets employees add calendar events to projects they're assigned to (previously admin-only) — powers the "+" quick-add on the admin/employee dashboards and inside a project, including a type picker (Appointment, Inspection, Meeting, Deadline, Action Item, Other) and an assignee. Picking "Action Item" as the type also inserts a real, linked row in `action_items`.
30. Run `supabase/document_signatures_migration.sql` any time. Adds a `document_signatures` table (one row per signed document — a client or an assigned employee can sign a PDF, admins never sign) recording the signer, a timestamp, an audit trail (IP/user agent), and a path to a re-generated PDF with the signature stamped onto a new last page. **After running it, go to Storage in the Supabase dashboard and create a new bucket named `document-signatures` (private)** — the policies in this migration depend on it existing. Only PDF documents can be signed; the "Sign Document" action never appears for other file types.
31. Run `supabase/interested_parties_migration.sql` any time. Adds a `project_interested_parties` table (additional owners/LLCs with an interest in a project, distinct from `project_team`'s trades/contractors) — admin-editable, visible to the owning client and assigned employees, shown on the cover sheet too.
32. Run `supabase/handle_new_project_fix_migration.sql` any time. Fixes the `handle_new_project` trigger, which had been referencing a `status` column that `utility_entries_migration.sql` had already dropped from `project_utilities` — this silently broke creation of every new project until fixed.
33. Run `supabase/message_reads_replica_identity_fix_migration.sql` any time. `message_reads` is Realtime-enabled but never had a real primary key after being reworked for DM threads (`chat_dm_migration.sql`), only a UNIQUE constraint on nullable columns — which Postgres won't accept as a replication identity. That silently blocked any DELETE that cascaded into it (e.g. deleting a profile). Adds a proper `id` primary key.
34. Run `supabase/calendar_v2_migration.sql` any time after `calendar_event_types_migration.sql` and `contacts_migration.sql`. Adds two-way Google Calendar sync bookkeeping to `google_calendar_connections` (sync token + push-notification watch channel), a `calendar_event_guests` table (external email invitees, synced to Google as real attendees), a `calendar_event_contacts` table (tagging a DXE contact — e.g. a structural engineer — on an event for quick reference), and employee update/delete on `calendar_events` for their assigned projects (previously insert-only). See "Google Calendar sync setup" below for the two-way sync setup steps.
35. Run `supabase/calendar_reminders_migration.sql` any time after `calendar_v2_migration.sql`. Adds `reminder_minutes`/`reminder_sent_at` to `calendar_events` and schedules a `pg_cron` job (enabling the `pg_cron`/`pg_net` extensions) that hits `/api/cron/send-reminders` every minute — deliberately Supabase-driven rather than Vercel Cron, since Vercel's cron scheduling can be limited by plan tier and reminders need minute-level granularity to be useful. **Before running it, edit the file to fill in your real site URL and `CRON_SECRET`** (pg_cron has no access to your app's env vars, so these are hardcoded into the scheduled job's SQL). The reminder fires a push notification (via the existing APNs setup — see "Push notifications setup" below) to the event's assignee, or its creator if unassigned.
36. Run `supabase/contacts_website_migration.sql` any time. Adds a `website` column to `contacts` — several agency portals/tools surfaced by the training reorg (next item) only have a URL, no phone or email.
37. Run `supabase/training_reorg_and_contacts_migration.sql` any time after `training_master_guide_migration.sql` and `contacts_website_migration.sql`. The "General" training category had become a 64-row dumping ground (14 original onboarding-SOP steps + 50 rows imported from the Master Guide PDF, never sorted). Splits it into six purpose-built categories — Process Overview, Client Onboarding & Workflow, Construction Phase Guide, Permitting, Utilities, City & Agency Portals — and extracts every phone number, email, and website buried in the prose into 31 real `contacts` rows (adding `City / County Services`, `Bonding / Surety`, and `Equipment Rental / Vendor` to `CONTACT_CATEGORIES` to hold them). `lib/constants.js`'s `TRAINING_CATEGORIES` is no longer derived from `PROJECT_TYPES` — it's its own explicit, ordered list, kept in sync with this migration.
23. In Supabase, go to **Authentication > Users**, find Dixie's account (or create one for her the same way you created the demo client), and copy her User UID
24. In the SQL editor, run:

   ```sql
   update public.profiles set is_admin = true where id = 'HER-UUID-HERE';
   ```

25. Repeat for any other staff who need admin access

### Google Calendar sync setup

Only needed once, before anyone clicks "Connect Google Calendar" in `/admin/calendar`:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or use an existing one).
2. In **APIs & Services > Library**, search for **Google Calendar API** and click **Enable**.
3. In **APIs & Services > OAuth consent screen**, configure it (External is fine for a small business):
   - App name: DXE Solutions
   - User support email + developer contact: your email
   - Scopes: add `https://www.googleapis.com/auth/calendar.events`
   - Test users: while the app is in "Testing" mode, add every Google account that will connect a calendar (this app never needs Google's full verification review as long as it stays under 100 test users — completely fine for a small firm)
4. In **APIs & Services > Credentials**, click **Create Credentials > OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: add `http://localhost:3000/api/admin/google-calendar/callback` for local dev, and `https://your-real-domain.com/api/admin/google-calendar/callback` for production
5. Copy the generated **Client ID** and **Client Secret** into `.env.local` (and your production environment variables) as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
6. Set `GOOGLE_REDIRECT_URI` to match whichever redirect URI you're using in that environment.
7. **Verify your production domain** in [Google Search Console](https://search.google.com/search-console), then add it under **APIs & Services → Domain verification** in the same Google Cloud project. This is required for two-way sync — Google refuses to send push notifications (webhook calls) to an unverified domain. Skip this for local dev; only production needs it, since Google can't reach `localhost` anyway.
8. Set `CRON_SECRET` (any random string — `openssl rand -hex 24`) in `.env.local` and your production environment variables. It authorizes the daily cron job (`vercel.json` → `/api/cron/renew-google-calendar-watch`) that keeps two-way sync alive — Google's push-notification channels expire after ~7 days and need renewing before then.
9. Restart the dev server (or redeploy), then go to **Admin → Calendar** and click **Connect Google Calendar**.

Once connected, sync is two-way:
- **App → Google**: any event created or edited from `/admin/calendar` (or a project's Calendar tab) is pushed to that admin's primary Google Calendar automatically, including any tagged guests as real Google Calendar invitees (they get an email). Deleting an event in the app also removes it from Google Calendar.
- **Google → App**: Google pings `/api/admin/google-calendar/webhook` whenever that admin's calendar changes, which pulls the diff back in — new events, edits, and deletions made directly in Google Calendar all flow into `calendar_events`. Only changes made *after* connecting are pulled — existing events on the calendar at connection time are not imported, so a personal Google Calendar's history doesn't flood the app.

Note: this targets the connected admin's **primary/personal** Google Calendar, not a separate dedicated one — any new personal event added there after connecting will also appear in the DXE Solutions app (visible to other admins/employees per normal calendar visibility rules). If that becomes a problem, the fix is to connect a separate "DXE Solutions" calendar in Google instead of the primary one.

Employees don't get their own Google Calendar connection — an employee-created event syncs to whichever admin has one connected (in practice, the one shared business calendar), the same way an admin-created event would.

### Push notifications setup

Only needed once, to enable native iOS push alerts (new chat message, new document/photo/note, project status change, action item assigned). `lib/push-notifications.js` talks to Apple's APNs directly over HTTP/2 — no third-party push service. Until the env vars below are set, `sendPushToUser()` silently no-ops so nothing else breaks.

1. In [developer.apple.com](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles → Keys**, create a new key with the **Apple Push Notifications service (APNs)** capability enabled. Download the `.p8` file — Apple only lets you download it once.
2. Note the **Key ID** (shown on the key's page) and your **Team ID** (top-right of the developer account, or under Membership).
3. Set these in `.env.local` (and your production environment variables — never commit the key):
   - `APNS_KEY_ID` — the Key ID from step 2
   - `APNS_TEAM_ID` — your Apple Developer Team ID
   - `APNS_PRIVATE_KEY` — the full contents of the `.p8` file (including the `-----BEGIN/END PRIVATE KEY-----` lines; if pasting into a single-line env var, escape newlines as `\n`)
   - `APNS_BUNDLE_ID` — optional, defaults to `com.dxesolutions.native`
4. Restart the dev server (or redeploy).

The `device_tokens` table (see migration 26 above) holds one row per device a user has granted notification permission on, with an `environment` of `production` or `sandbox` (TestFlight/App Store builds vs. local Xcode builds) so each token hits the matching APNs endpoint. Dead tokens (app uninstalled, etc.) are pruned automatically when Apple reports them invalid.

### Weather on calendar

No setup needed — `app/api/weather` calls Open-Meteo (free, no API key) and defaults to Los Angeles, CA, DXE's primary service area. If the firm's actual base is elsewhere, set `WEATHER_LATITUDE` / `WEATHER_LONGITUDE` env vars (decimal degrees) and redeploy. The forecast covers 16 days out and refreshes every 30 minutes; both the web calendar views and the native app call this same endpoint, so there's only one place to change the location.

### AI Assistant setup

The Assistant (bottom of the sidebar, plus a floating icon on every page, in the Master account, the client portal, and the employee portal) is an actual tool-calling Claude agent — it can look up real project data, including permits, documents on file, and accounting balance. No new database migration is needed; it reads and writes through the same tables and RLS policies as the rest of the app, so each role only ever sees what that role can already see elsewhere in the portal:

- **Master**: full access — can also create/update Action Items and calendar events, and generate documents from templates.
- **Employee**: scoped to their assigned project(s) only. Can also browse DXE's Training content (so "what do I do next" answers from the real workflow steps, not guesses) and mark their own assigned action items open/done — but can't create action items, touch the calendar, or generate documents.
- **Client**: scoped to their own project(s), and only what's marked visible to them — same as the rest of their portal.

1. Get an API key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).
2. Set `ANTHROPIC_API_KEY` in `.env.local` (and your production environment variables).
3. Restart the dev server (or redeploy). No key means the Assistant page will load but every message will return a "not set up yet" error — nothing else in the app is affected.
4. If a message instead comes back with a "Server error", and the error in your terminal mentions `anthropic-workspace-id is required` — that means the key is identity-linked to your Anthropic account rather than a standalone workspace key. Go to [console.anthropic.com/settings/workspaces](https://console.anthropic.com/settings/workspaces), open your workspace, and copy its ID from the URL (`wrkspc_...`) into `ANTHROPIC_WORKSPACE_ID` in `.env.local`, then restart the dev server.

Conversations aren't persisted — each one lives only in the browser tab and resets on refresh.

### Using the admin dashboard

Once an account has `is_admin = true`, that person will see an **Admin Dashboard** link in their portal sidebar (under Account). From there they can:

- **Dashboard** — the admin landing page after login, showing client/project counts, a cross-project activity feed, upcoming milestones, and any utility entries marked Pending or In Progress
- **Add a new client** — creates their login (email + temporary password) and their first project in one step. The client can log in immediately.
- **Add a project to an existing client** — from the client list, click "Add project"
- **Edit any project** — update status, overall progress %, dates, and project type
- **Project team** — add team members with a Trade/Title (from a preset list — Owner, Contractor, Grading & Drainage, Electrical Engineer, Mechanical, Plumbing, Structural Engineer, Architect — or add a custom trade), name, phone, and email
- **Edit phases** — add/remove/reorder the 6 progress phases and set each one's percentage and state (pending / active / done / N/A). N/A phases show only the phase name to clients, with no percentage or status.
- **Edit milestones** — add/remove timeline items with custom dates, states, and a notes field visible to the client
- **Utilities** — for Electrical, Water, and Gas, independently toggle each as visible to the client and set one contact (trade, name, phone, email, plus admin-only comments). Below the contact, add any number of entries — each with Application, Work Request Number, and Status (Not Ready / Pending / In Progress / Complete), plus admin-only Action Step and Comments. Entries can be edited or deleted individually. Clients only see enabled utilities, their contact info, and the Application / Work Request # / Status of each entry.
- **Clients** — click any client's name in "All Clients" to edit their profile (name, email, phone) and see/manage their projects from one page
- **Contacts** — a global list of people and companies Dixie works with regularly (consultants, vendors, inspectors). Each contact can optionally be linked to one or more projects.
- **Templates** — upload standard documents (scopes of work, checklists, etc.) once, then apply (copy) them into any project's Documents with one click
- **View as client** — from any project's admin page, open a preview of exactly what the client sees for that project
- **Upload documents** — drag and drop files on behalf of a client; set each document's badge (new / pending / signed)
- **Upload photos** — drag and drop progress photos with optional captions
- **Post notes** — write updates that appear in the client's "Notes & Updates" feed, automatically signed "[Name] — Project Manager". Admins can also edit or delete any note, including ones posted by the client.

Each of these admin actions also logs an entry to the project's activity feed automatically (e.g. "DXE uploaded Change Order #1").

### Email notifications

Once `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `ESTIMATE_NOTIFICATION_EMAIL` are set, the app sends emails automatically:

- **To Dixie (admin)**: whenever a client uploads a document or posts a note, an email goes to `ESTIMATE_NOTIFICATION_EMAIL` with a link to that project in the admin dashboard. This always sends — there's no opt-out for the admin side.
- **To the client**: whenever Dixie adds a document, adds photos, posts a note, or changes the project's status, the client gets an email with a link to their portal. Clients can turn this off from **Account Settings** ("Email me when there's an update on my project" — on by default).

If `RESEND_API_KEY` isn't set (e.g. local development without it configured), these emails are silently skipped — nothing breaks, the app just won't send mail.

## "Coming Soon" mode (temporary)

While the full site is being finished, the public root (`/`) shows a static
**Coming Soon** page instead of the marketing homepage.

- `app/page.js` + `app/coming-soon.module.css` → the Coming Soon page
- `app/preview/page.js` + `app/preview/page.module.css` → the real, in-progress
  homepage. It's not linked anywhere, so it's hidden from the public — preview it
  at **`/preview`** while you keep building.
- `/login`, `/portal`, `/admin`, and `/estimate` all still work normally.

**To go live** (swap back to the full site):

1. Delete `app/page.js` and `app/coming-soon.module.css`.
2. Move `app/preview/page.js` → `app/page.js` and
   `app/preview/page.module.css` → `app/page.module.css`, then remove the empty
   `app/preview/` folder.
3. Commit and push — Vercel redeploys automatically.

## Project structure reference

```
app/
  page.js                    → "Coming Soon" page (temporary — see section above)
  coming-soon.module.css     → styles for the Coming Soon page
  preview/page.js            → the full homepage, hidden at /preview until launch
  estimate/page.js           → estimate request form
  login/page.js              → client login
  api/estimate/route.js      → sends estimate form via Resend
  api/documents/[id]/download/route.js → secure file download
  portal/
    layout.js                → auth check + sidebar shell
    page.js                  → redirects to first project
    settings/page.js         → account settings
    projects/[id]/
      overview/page.js       → dashboard (progress, milestones, activity, docs)
      documents/page.js       → full document list + upload
      photos/page.js          → progress photo gallery
      notes/page.js           → notes & updates thread
  admin/
    layout.js                → admin auth check (requires is_admin)
    clients/page.js          → list all clients + their projects
    clients/new/page.js       → create new client + first project
    clients/[clientId]/page.js → add a project to an existing client
    projects/[id]/page.js     → full project editor (info, phases, milestones, docs, photos, notes)
  api/admin/
    clients/route.js          → creates new auth user + profile + project (uses service role key)
    projects/route.js         → creates a project for an existing client
    projects/[id]/route.js    → updates project info
    phases/route.js           → replaces a project's phases
    milestones/route.js       → replaces a project's milestones
    documents/route.js        → records an admin-uploaded document
    documents/[id]/route.js   → update badge / delete document
    photos/route.js           → records an admin-uploaded photo
    photos/[id]/route.js      → delete photo
    notes/route.js            → posts a note as "[Name] — Project Manager"
components/                   → shared UI components
components/admin/             → admin-only editor components
lib/
  supabase-client.js          → browser Supabase client
  supabase-server.js          → server Supabase client (cookies-based, respects RLS)
  supabase-admin.js           → service-role client (bypasses RLS, server-only, used for creating users)
supabase/
  schema.sql                  → run once to create all tables + policies
  admin_migration.sql         → run once to add is_admin flag + admin policies
  seed.sql                     → optional demo data
```
