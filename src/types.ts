/**
 * Study with Buddy - Shared Data Types
 * Clean, well-commented types for Class 12 student project
 */

// Category types for tasks
export type TaskCategory = 'Physics' | 'Chemistry' | 'Math' | 'English' | 'Other';

// Repeat rule for a to-do task
export type RepeatRule = 'none' | 'daily' | 'custom';

// To-Do Task item interface (for legacy app UI compatibility)
export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  completed: boolean;
  dueDate?: string;
  time?: string | null; // "HH:MM" 24-hour time this task is scheduled for
  estimatedMinutes: number;
  repeat?: RepeatRule; // whether this task repeats
  repeatDays?: number[]; // for 'custom': 0=Sun ... 6=Sat
  repeatGroupId?: string | null; // links all instances generated from one repeating task
  googleTaskId?: string | null; // set once this task is synced to Google Tasks
  googleEventId?: string | null; // set once a matching Google Calendar event exists
}

// Supabase Profile interface (matches profiles table)
export interface Profile {
  id: string;
  name: string;
  target_exam: string;
  exam_date: string; // ISO date string YYYY-MM-DD
  current_streak: number;
  longest_streak: number;
  last_active_date?: string;
  created_at?: string;
  google_connected?: boolean; // true once the user has granted Calendar/Tasks access
}

// Supabase Task interface (matches tasks table)
export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  category: 'Physics' | 'Chemistry' | 'Math' | 'English' | 'Other';
  status: 'pending' | 'done';
  date: string; // YYYY-MM-DD
  time?: string | null; // "HH:MM"
  repeat?: RepeatRule;
  repeat_days?: number[] | null; // 0=Sun ... 6=Sat, used when repeat = 'custom'
  repeat_group_id?: string | null;
  created_at?: string;
  completed_at?: string | null;
  google_task_id?: string | null;
  google_event_id?: string | null;
  google_synced_at?: string | null;
}

// Weekly Leaderboard entry (Supabase aggregated)
export interface WeeklyLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  target_exam: string;
  tasksCompletedThisWeek: number;
}

// Exam Countdown item (multiple exams supported, each with its own live countdown)
export interface Exam {
  id: string;
  name: string;
  date: string; // ISO date format YYYY-MM-DD
  user_id?: string;
  created_at?: string;
}
