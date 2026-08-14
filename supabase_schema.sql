-- ==============================================================================
-- STUDY WITH BUDDY - SUPABASE DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. ENABLE UUID EXTENSION (if not enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE PROFILES TABLE
-- Stores student information linked directly to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Class 12 Student',
  target_exam TEXT DEFAULT 'CBSE Boards 2026',
  exam_date DATE DEFAULT '2026-03-01',
  current_streak INT NOT NULL DEFAULT 1,
  longest_streak INT NOT NULL DEFAULT 1,
  last_active_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CREATE TASKS TABLE
-- Stores daily tasks created by students
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Physics', 'Chemistry', 'Math', 'English', 'Other')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR PROFILES
-- Users can view their own profile
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 6. RLS POLICIES FOR TASKS
-- Users can view their own tasks
CREATE POLICY "Users can view own tasks" 
  ON public.tasks FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own tasks
CREATE POLICY "Users can insert own tasks" 
  ON public.tasks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks" 
  ON public.tasks FOR UPDATE 
  USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks" 
  ON public.tasks FOR DELETE 
  USING (auth.uid() = user_id);

-- 7. LEADERBOARD FUNCTION (bypasses RLS safely via SECURITY DEFINER)
-- Returns name + target_exam + weekly completed task count for every user,
-- without exposing any other profile data. Safe to call from any logged-in user.
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  target_exam TEXT,
  tasks_completed_this_week BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.name,
    p.target_exam,
    COUNT(t.id) FILTER (
      WHERE t.status = 'done'
      AND t.completed_at >= date_trunc('week', now())
      AND t.completed_at < date_trunc('week', now()) + interval '7 days'
    ) AS tasks_completed_this_week
  FROM public.profiles p
  LEFT JOIN public.tasks t ON t.user_id = p.id
  GROUP BY p.id, p.name, p.target_exam
  ORDER BY tasks_completed_this_week DESC
  LIMIT 10;
$$;

-- Allow any authenticated user to call this function
GRANT EXECUTE ON FUNCTION public.get_weekly_leaderboard() TO authenticated;

-- 8. AUTOMATIC PROFILE CREATION TRIGGER ON USER SIGNUP
-- Automatically creates a profile record when a new user registers via Supabase Auth / Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, target_exam)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Class 12 Student'),
    'CBSE Boards 2026'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
