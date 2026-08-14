import { createClient } from '@supabase/supabase-js';
import { Profile, DbTask, WeeklyLeaderboardEntry } from '../types';

/**
 * ==============================================================================
 * SUPABASE CLIENT INITIALIZATION & GOOGLE OAUTH SETUP GUIDE
 * ==============================================================================
 * 
 * --- 1. HOW TO CREATE A SUPABASE PROJECT ---
 * 1. Go to https://supabase.com and click "Sign In" or "Start your project".
 * 2. Click "New Project", choose an Organization, Name (e.g. "study-with-buddy"), 
 *    Database Password, and Region.
 * 3. Once created, go to Project Settings -> API.
 * 4. Copy the "Project URL" and the "anon / public" API key.
 * 
 * --- 2. HOW TO ENABLE GOOGLE OAUTH IN SUPABASE ---
 * 1. Go to Google Cloud Console (https://console.cloud.google.com).
 * 2. Create a new project or select an existing one.
 * 3. Go to "APIs & Services" -> "OAuth consent screen", set User Type to External, 
 *    fill App Name ("Study with Buddy") and Developer Contact Email.
 * 4. Go to "APIs & Services" -> "Credentials" -> "Create Credentials" -> "OAuth client ID".
 * 5. Application Type: "Web application".
 * 6. Under "Authorized redirect URIs", add your Supabase Callback URL:
 *    https://<YOUR-SUPABASE-PROJECT-REF>.supabase.co/auth/v1/callback
 * 7. Copy the generated Client ID and Client Secret.
 * 8. Return to Supabase Dashboard -> Authentication -> Providers -> Google.
 * 9. Toggle "Enable Google provider", paste your Client ID and Client Secret, and Save.
 * 
 * --- 3. WHERE TO SET ENVIRONMENT VARIABLES ---
 * - For Next.js (Local): Add to `.env.local`
 *     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
 * 
 * - For Vercel Deployment:
 *     Go to Vercel Project Settings -> Environment Variables -> Add NEXT_PUBLIC_SUPABASE_URL 
 *     and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * 
 * - For Vite / AI Studio Environment:
 *     Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your env file or runtime.
 * ==============================================================================
 */

// Retrieve Supabase URL & Anon Key from Vite env vars (set in .env or your host's dashboard)
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Helper flag to check if actual credentials are setup
export const isSupabaseConfigured = 
  supabaseUrl !== 'https://placeholder-project.supabase.co' && 
  supabaseAnonKey !== 'placeholder-anon-key';

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Trigger Supabase Google OAuth Login
 * @param redirectTo Optional custom redirect URL after login
 */
export async function signInWithGoogle(redirectTo?: string) {
  const redirectUrl = redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined);

  if (!isSupabaseConfigured) {
    console.warn("Supabase credentials not configured. Using demo auth fallback.");
    return { data: null, error: new Error("Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL & NEXT_PUBLIC_SUPABASE_ANON_KEY) are missing.") };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { data, error };
}

/**
 * Sign out current user from Supabase session
 */
export async function signOutUser() {
  if (!isSupabaseConfigured) {
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}

/* ==============================================================================
 * DATABASE HELPER FUNCTIONS (PROFILES & TASKS)
 * ============================================================================== */

/**
 * Fetch profile for the currently logged-in user.
 * Creates default profile row if it doesn't exist yet.
 */
export async function fetchUserProfile(userId: string, userEmail?: string, userName?: string): Promise<{ profile: Profile | null; error: any }> {
  if (!isSupabaseConfigured) {
    return {
      profile: {
        id: userId,
        name: userName || 'Class 12 Student',
        target_exam: 'CBSE Boards 2026',
        exam_date: '2026-03-01',
        current_streak: 7,
        longest_streak: 12,
        last_active_date: new Date().toISOString().split('T')[0]
      },
      error: null
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error);
      return { profile: null, error };
    }

    if (data) {
      return { profile: data as Profile, error: null };
    }

    // Profile does not exist yet -> create default profile
    const defaultProfile: Partial<Profile> = {
      id: userId,
      name: userName || userEmail?.split('@')[0] || 'Class 12 Student',
      target_exam: 'CBSE Boards 2026',
      exam_date: '2026-03-01',
      current_streak: 1,
      longest_streak: 1,
      last_active_date: new Date().toISOString().split('T')[0]
    };

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert(defaultProfile)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating profile:', insertError);
      return { profile: defaultProfile as Profile, error: insertError };
    }

    return { profile: newProfile as Profile, error: null };
  } catch (err) {
    console.error('Exception in fetchUserProfile:', err);
    return { profile: null, error: err };
  }
}

/**
 * Update user profile details (name, target_exam, exam_date)
 */
export async function updateUserProfile(userId: string, updates: Partial<Profile>): Promise<{ profile: Profile | null; error: any }> {
  if (!isSupabaseConfigured) {
    return {
      profile: {
        id: userId,
        name: updates.name || 'Class 12 Student',
        target_exam: updates.target_exam || 'CBSE Boards 2026',
        exam_date: updates.exam_date || '2026-03-01',
        current_streak: updates.current_streak ?? 7,
        longest_streak: updates.longest_streak ?? 12,
        last_active_date: updates.last_active_date || new Date().toISOString().split('T')[0]
      },
      error: null
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  return { profile: data as Profile, error };
}

/**
 * Calculates start (Monday 00:00:00) and end (Sunday 23:59:59) of the current week.
 */
export function getStartAndEndOfWeek(): { startOfWeek: string; endOfWeek: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, ...
  
  // Calculate Monday of current week
  const distanceToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  // Calculate Sunday of current week
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    startOfWeek: monday.toISOString(),
    endOfWeek: sunday.toISOString(),
  };
}

/**
 * Fetch total number of tasks completed by user during the current week (Monday to Sunday).
 */
export async function fetchWeeklyCompletedTasksCount(userId: string): Promise<{ count: number; error: any }> {
  if (!isSupabaseConfigured) {
    return { count: 0, error: new Error('Supabase is not configured.') };
  }

  const { startOfWeek, endOfWeek } = getStartAndEndOfWeek();

  try {
    const { count, error } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'done')
      .gte('completed_at', startOfWeek)
      .lte('completed_at', endOfWeek);

    return { count: count || 0, error };
  } catch (err) {
    console.error('Error fetching weekly completed tasks:', err);
    return { count: 0, error: err };
  }
}

/**
 * ==============================================================================
 * WEEKLY LEADERBOARD QUERY FOR CLASS 12 STUDENTS
 * ==============================================================================
 * 
 * Query Logic Explained in Simple Words:
 * 1. Get start (Monday 00:00:00) and end (Sunday 23:59:59) timestamps for this week.
 * 2. Query all student profiles (Name, Target Exam).
 * 3. Query all completed tasks (`status = 'done'`) with `completed_at` in this week.
 * 4. Aggregate: count completed tasks for each `user_id`.
 * 5. Attach the task count to each user profile.
 * 6. Sort users by completed task count in descending order (highest first).
 * 7. Limit to top 10 users and assign ranks 1 to 10.
 */
export async function fetchWeeklyLeaderboard(): Promise<{ leaderboard: WeeklyLeaderboardEntry[]; error: any }> {
  if (!isSupabaseConfigured) {
    // No Supabase connection configured — return an empty leaderboard rather
    // than fabricated names, so the UI never shows fake data.
    return { leaderboard: [], error: new Error('Supabase is not configured.') };
  }

  try {
    // Calls the get_weekly_leaderboard() Postgres function (SECURITY DEFINER),
    // which safely aggregates across all users despite per-user RLS policies.
    const { data, error } = await supabase.rpc('get_weekly_leaderboard');

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return { leaderboard: [], error };
    }

    const top10: WeeklyLeaderboardEntry[] = (data || []).map((row: any, index: number) => ({
      rank: index + 1,
      userId: row.user_id,
      name: row.name || 'Class 12 Student',
      target_exam: row.target_exam || 'CBSE Boards 2026',
      tasksCompletedThisWeek: Number(row.tasks_completed_this_week) || 0
    }));

    return { leaderboard: top10, error: null };
  } catch (err) {
    console.error('Exception fetching leaderboard:', err);
    return { leaderboard: [], error: err };
  }
}

/**
 * ==============================================================================
 * STREAK CALCULATION LOGIC FOR CLASS 12 STUDENTS
 * ==============================================================================
 * 
 * How it works in simple words:
 * 1. When a student marks a task as "done":
 *    - Check the date when they last completed a task (last_active_date).
 *    - If last_active_date is TODAY -> Student already extended streak today; streak remains unchanged.
 *    - If last_active_date is YESTERDAY (gap = 1 day) -> Student studied 2 days in a row! current_streak += 1.
 *    - If last_active_date is 2 or more days ago (gap >= 2 days) -> Streak was broken. current_streak resets to 1.
 *    - If no previous date exists -> First task completed! current_streak = 1.
 * 2. Check if new current_streak beats longest_streak. If yes, update longest_streak.
 * 3. Update last_active_date = today's date in Supabase `profiles` table.
 */
export async function updateStreakOnTaskComplete(
  userId: string,
  currentProfile: Profile
): Promise<{ profile: Profile; error: any }> {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastActive = currentProfile.last_active_date;

  let newCurrentStreak = currentProfile.current_streak || 0;
  let newLongestStreak = currentProfile.longest_streak || 0;

  if (!lastActive) {
    // Case 1: First task ever completed
    newCurrentStreak = 1;
  } else if (lastActive === todayStr) {
    // Case 2: Already active today -> Streak unchanged
    newCurrentStreak = currentProfile.current_streak || 1;
  } else {
    // Case 3 & 4: Compare calendar day difference
    const lastDate = new Date(lastActive);
    const todayDate = new Date(todayStr);

    const utc1 = Date.UTC(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
    const utc2 = Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Last active was yesterday -> increment streak by 1
      newCurrentStreak = (currentProfile.current_streak || 0) + 1;
    } else if (diffDays >= 2) {
      // Gap >= 2 days -> reset streak to 1
      newCurrentStreak = 1;
    }
  }

  // Update longest streak record
  newLongestStreak = Math.max(newCurrentStreak, newLongestStreak);

  const updates: Partial<Profile> = {
    current_streak: newCurrentStreak,
    longest_streak: newLongestStreak,
    last_active_date: todayStr
  };

  const { profile: updatedProfile, error } = await updateUserProfile(userId, updates);

  return {
    profile: updatedProfile || {
      ...currentProfile,
      ...updates
    },
    error
  };
}

/**
 * Fetch list of tasks for a given date (defaults to today) for a user
 */
export async function fetchTasksForToday(userId: string, dateStr?: string): Promise<{ tasks: DbTask[]; error: any }> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  if (!isSupabaseConfigured) {
    // Return sample local state tasks
    return {
      tasks: [
        {
          id: 'demo-1',
          user_id: userId,
          title: 'Solve 15 Optics numericals from NCERT Physics',
          category: 'Physics',
          status: 'done',
          date: targetDate,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        },
        {
          id: 'demo-2',
          user_id: userId,
          title: 'Revise Organic Chemistry reaction mechanisms',
          category: 'Chemistry',
          status: 'pending',
          date: targetDate,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-3',
          user_id: userId,
          title: 'Complete Integration exercise 7.4 in NCERT Math',
          category: 'Math',
          status: 'pending',
          date: targetDate,
          created_at: new Date().toISOString()
        }
      ],
      error: null
    };
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('date', targetDate)
    .order('created_at', { ascending: false });

  return { tasks: (data || []) as DbTask[], error };
}

/**
 * Create a new task in Supabase
 */
export async function createDbTask(
  userId: string, 
  title: string, 
  category: 'Physics' | 'Chemistry' | 'Math' | 'English' | 'Other', 
  dateStr?: string
): Promise<{ task: DbTask | null; error: any }> {
  const targetDate = dateStr || new Date().toISOString().split('T')[0];

  if (!isSupabaseConfigured) {
    return { task: null, error: new Error('Supabase is not configured.') };
  }

  const newTask = {
    user_id: userId,
    title,
    category,
    status: 'pending' as const,
    date: targetDate
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(newTask)
    .select()
    .single();

  return { task: data as DbTask, error };
}

/**
 * Toggle task status (pending <-> done)
 */
export async function toggleDbTaskStatus(taskId: string, currentStatus: 'pending' | 'done'): Promise<{ task: DbTask | null; error: any }> {
  const nextStatus = currentStatus === 'pending' ? 'done' : 'pending';
  const completedAt = nextStatus === 'done' ? new Date().toISOString() : null;

  if (!isSupabaseConfigured) {
    return {
      task: null,
      error: null
    };
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      status: nextStatus, 
      completed_at: completedAt 
    })
    .eq('id', taskId)
    .select()
    .single();

  return { task: data as DbTask, error };
}

/**
 * Delete a task from Supabase
 */
export async function deleteDbTask(taskId: string): Promise<{ error: any }> {
  if (!isSupabaseConfigured) {
    return { error: null };
  }

  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  return { error };
}

