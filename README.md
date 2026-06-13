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

Right now, project creation happens directly in Supabase (there's no admin UI yet — that can be a future addition). To onboard a new client:

1. **Create the user**: Supabase dashboard → Authentication → Users → Add user (their email + a temporary password, "Auto Confirm User" checked)
2. **Create their project**: SQL Editor → run an `insert into public.projects (...)` statement (see `supabase/seed.sql` for the format), using their new user's UUID as `owner_id`
3. Add phases, milestones, documents, and notes the same way

A simple internal admin dashboard for Dixie to do this without SQL would be a great next addition once the client-facing site is live.

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
components/                   → shared UI components
lib/
  supabase-client.js          → browser Supabase client
  supabase-server.js          → server Supabase client
supabase/
  schema.sql                  → run once to create all tables + policies
  seed.sql                     → optional demo data
```
