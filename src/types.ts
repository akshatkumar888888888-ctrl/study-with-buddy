/**
 * Study with Buddy - Shared Data Types
 * Clean, well-commented types for Class 12 student project
 */

// Category types for tasks
export type TaskCategory = 'Physics' | 'Chemistry' | 'Math' | 'English' | 'Other';

// To-Do Task item interface (for legacy app UI compatibility)
export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  completed: boolean;
  dueDate?: string;
  estimatedMinutes: number;
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
}

// Supabase Task interface (matches tasks table)
export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  category: 'Physics' | 'Chemistry' | 'Math' | 'English' | 'Other';
  status: 'pending' | 'done';
  date: string; // YYYY-MM-DD
  created_at?: string;
  completed_at?: string | null;
}

// Study Buddy Room interface
export interface StudyRoom {
  id: string;
  name: string;
  subject: string;
  activeMembers: number;
  maxMembers: number;
  isPrivate: boolean;
  hostName: string;
  tags: string[];
}

// Student Leaderboard entry
export interface LeaderboardUser {
  rank: number;
  name: string;
  avatar: string;
  studyHours: number;
  streakDays: number;
  points: number;
  badge?: string;
}

// Weekly Leaderboard entry (Supabase aggregated)
export interface WeeklyLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  target_exam: string;
  tasksCompletedThisWeek: number;
}

// Exam Countdown item
export interface Exam {
  id: string;
  name: string;
  subject: string;
  date: string; // ISO date format YYYY-MM-DD
  targetGoal: string;
}
