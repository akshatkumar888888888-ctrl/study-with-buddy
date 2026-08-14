# 📚 Study with Buddy

A high-performance Class 12 & Competitive Exam preparation app built with **Next.js / React**, **Tailwind CSS**, and **Supabase (PostgreSQL & Google Auth)**.

---

## 🚀 Features

1. **Dashboard & Daily Tasks**: Categorized daily study tasks (Physics, Chemistry, Math, English, Other) with completion toggles and instant deletion.
2. **Exam Countdown Widget**: Real-time countdown tracking days left until your target board or entrance exam (CBSE Boards, JEE, NEET).
3. **Study Streak Tracker**: Automatic daily study streak calculation (Current & Longest streak) to maintain daily momentum.
4. **Weekly Study Leaderboard**: Top 10 student ranking based on total tasks completed during the current week (Monday to Sunday) with Gold 🥇, Silver 🥈, and Bronze 🥉 podium highlights.
5. **Study Buddy Rooms**: Virtual study focus rooms with group Pomodoro timers and ambient sound controls.

---

## 🛠️ Supabase Setup Guide

### 1. Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, select an Organization, enter project name `study-with-buddy`, set a secure database password, and select your region.
3. Once created, navigate to **Project Settings** -> **API**.
4. Copy the **Project URL** and the **`anon` public key**.

### 2. Enable Google OAuth in Supabase
1. Open the [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project or select an existing one.
3. Go to **APIs & Services** -> **OAuth consent screen**, select **External**, enter App Name (`Study with Buddy`), and developer email.
4. Go to **APIs & Services** -> **Credentials** -> **Create Credentials** -> **OAuth client ID**.
5. Set Application Type to **Web application**.
6. Under **Authorized redirect URIs**, add your Supabase Callback URL:
   ```
   https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback
   ```
7. Copy the generated **Client ID** and **Client Secret**.
8. In Supabase Dashboard, go to **Authentication** -> **Providers** -> **Google**.
9. Toggle **Enable Google Provider**, paste your **Client ID** & **Client Secret**, and click **Save**.

### 3. Database Tables Setup (SQL Editor)
Run the following SQL snippet in the Supabase SQL Editor:
```sql
-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text default 'Class 12 Student',
  target_exam text default 'CBSE Boards 2026',
  exam_date text default '2026-03-01',
  current_streak integer default 0,
  longest_streak integer default 0,
  last_active_date text,
  updated_at timestamp with time zone default now()
);

-- Tasks table
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  category text default 'Physics',
  status text default 'pending',
  date text not null,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);
```

---

## 🔗 Google Calendar & Google Tasks Two-Way Sync

Study tasks added in the app are pushed to **Google Tasks** (which shows up right
inside Google Calendar's built-in Tasks panel) and to a matching **all-day Calendar
event**. Marking a task done/undone, or deleting it, updates both. A manual
**"Sync now"** button pulls back anything created or changed directly in Google.

### 1. Enable the Google APIs
In the same Google Cloud project used for sign-in (from the OAuth setup above):
1. Go to **APIs & Services** -> **Library**.
2. Enable **Google Calendar API**.
3. Enable **Google Tasks API**.

### 2. Add the extra scopes to the OAuth consent screen
1. **APIs & Services** -> **OAuth consent screen** -> **Data Access** -> **Add or Remove Scopes**.
2. Add:
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/calendar.events`
3. Save. (If your consent screen is in "Testing" mode, make sure your Google account is added under **Test users**.)

### 3. Run the sync migration
In the Supabase SQL Editor, run section **9** at the bottom of `supabase_schema.sql`
(creates `google_tokens`, adds `google_task_id`/`google_event_id` to `tasks`, and
`google_connected` to `profiles`).

### 4. Deploy the Edge Functions
The three functions live in `supabase/functions/`. You'll need the
[Supabase CLI](https://supabase.com/docs/guides/cli) installed and logged in:
```bash
supabase link --project-ref <YOUR-SUPABASE-PROJECT-REF>

# Same Client ID/Secret as your Google provider in step 2 of the OAuth setup above
supabase secrets set GOOGLE_CLIENT_ID=<your-google-client-id>
supabase secrets set GOOGLE_CLIENT_SECRET=<your-google-client-secret>

supabase functions deploy google-store-tokens
supabase functions deploy google-sync-task
supabase functions deploy google-sync-pull
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided
automatically inside every Edge Function — no need to set those yourself.

### 5. (Optional) Auto-pull on a schedule
Without this, sync still happens automatically on every add/complete/delete —
this step only affects picking up changes made *directly in Google* without the
user pressing "Sync now". In the Supabase SQL Editor:
```sql
select cron.schedule(
  'google-sync-pull-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/functions/v1/google-sync-pull',
    headers := jsonb_build_object('Authorization', 'Bearer <A-USER-JWT-OR-SERVICE-ROLE-KEY>')
  );
  $$
);
```
(Requires the `pg_cron` and `pg_net` extensions, enabled under **Database** ->
**Extensions**. Since this function is per-user, a fuller setup would loop over
all rows in `google_tokens` — the manual "Sync now" button in the dashboard covers
this without any of that extra plumbing.)

### How it works
- **Sign in with Google** now also requests Calendar + Tasks permission
  (`src/utils/supabase.ts`). Because `access_type: offline` + `prompt: consent`
  are set, Google returns a long-lived refresh token on that first consent.
- `captureGoogleTokensOnSignIn` (called from `App.tsx`) hands that refresh token
  to the `google-store-tokens` function, which stores it in the server-only
  `google_tokens` table (RLS-locked — only Edge Functions using the service role
  key can read it).
- Every add / complete / uncomplete / delete calls `google-sync-task`, which
  refreshes a short-lived Google access token from the stored refresh token and
  pushes the change to Google Tasks + Calendar.
- The **Sync now** button calls `google-sync-pull`, which pushes anything not
  yet synced and pulls in tasks/events created or edited directly in Google.

---

## ⚡ Deployment on Vercel

Follow these steps to deploy "Study with Buddy" on Vercel:

1. **Push Code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare Study with Buddy for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [https://vercel.com/new](https://vercel.com/new).
   - Select your GitHub repository (`study-with-buddy`) and click **Import**.

3. **Add Environment Variables on Vercel**:
   - Under **Environment Variables**, add the following keys:
     - `NEXT_PUBLIC_SUPABASE_URL` = `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<YOUR-SUPABASE-ANON-KEY>`
     - `VITE_SUPABASE_URL` = `https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `<YOUR-SUPABASE-ANON-KEY>`

4. **Deploy**:
   - Click **Deploy**. Vercel will build and launch your production application URL!
