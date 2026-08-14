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
