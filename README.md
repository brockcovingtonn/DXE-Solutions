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
2. In Supabase, go to **Authentication > Users**, find Dixie's account (or create one for her the same way you created the demo client), and copy her User UID
3. In the SQL editor, run:

   ```sql
   update public.profiles set is_admin = true where id = 'HER-UUID-HERE';
   ```

4. Repeat for any other staff who need admin access

### Using the admin dashboard

Once an account has `is_admin = true`, that person will see an **Admin Dashboard** link in their portal sidebar (under Account). From there they can:

- **Add a new client** — creates their login (email + temporary password) and their first project in one step. The client can log in immediately.
- **Add a project to an existing client** — from the client list, click "Add project"
- **Edit any project** — update status, overall progress %, dates, and project manager name
- **Edit phases** — add/remove/reorder the 6 progress phases and set each one's percentage and state (pending / active / done)
- **Edit milestones** — add/remove timeline items with custom dates and states
- **Upload documents** — drag and drop files on behalf of a client; set each document's badge (new / pending / signed)
- **Upload photos** — drag and drop progress photos with optional captions
- **Post notes** — write updates that appear in the client's "Notes & Updates" feed, automatically signed "[Name] — Project Manager"

Each of these admin actions also logs an entry to the project's activity feed automatically (e.g. "DXE uploaded Change Order #1").

## Project structure reference

```
app/
  page.js                    → homepage (hero, about, services, projects, contact)
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
