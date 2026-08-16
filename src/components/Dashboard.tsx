import React, { useState, useEffect } from 'react';
import {
  CheckSquare, Flame, Trophy, Hourglass, Plus, Trash2,
  CheckCircle2, Circle, Play, Pause, RotateCcw,
  Sparkles, Calendar, Clock, ChevronRight, ChevronLeft, LogOut, LogIn,
  RefreshCw, CalendarCheck2, Repeat, X
} from 'lucide-react';
import { Task, TaskCategory, Profile, WeeklyLeaderboardEntry, Exam, RepeatRule } from '../types';
import {
  signInWithGoogle, signOutUser, isSupabaseConfigured,
  fetchUserProfile, fetchTasksForToday, createDbTask, toggleDbTaskStatus,
  deleteDbTask, updateStreakOnTaskComplete, fetchWeeklyLeaderboard,
  syncTaskToGoogle, pullGoogleSync, fetchExams, createExam, deleteExam
} from '../utils/supabase';
import { User } from '@supabase/supabase-js';

interface DashboardProps {
  authUser: User | null;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FOCUS_PRESETS = [
  { label: '25 min', seconds: 1500 },
  { label: '45 min', seconds: 2700 },
  { label: '5 min', seconds: 300 },
];

export const Dashboard: React.FC<DashboardProps> = ({ authUser }) => {
  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) console.error("Sign in failed:", error.message);
  };

  const handleSignOut = async () => {
    await signOutUser();
    // App.tsx's onAuthStateChange listener picks up the sign-out.
  };

  // Real profile data (name, current streak) from Supabase — no fallback mock.
  const [profile, setProfile] = useState<Profile | null>(null);

  // Which calendar date the to-do list is showing — like Google Calendar's
  // day view. Defaults to today but the user can navigate to any date,
  // past OR future (e.g. to schedule tomorrow's work ahead of time).
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Tasks state — starts empty and is loaded from Supabase for the signed-in user.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('Physics');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskRepeat, setNewTaskRepeat] = useState<RepeatRule>('none');
  const [newTaskRepeatDays, setNewTaskRepeatDays] = useState<number[]>([]);
  const [newTaskRepeatUntil, setNewTaskRepeatUntil] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Real weekly leaderboard, fetched from the get_weekly_leaderboard() function.
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  // Google Calendar / Tasks sync state — pushes on every add/complete/delete,
  // and a manual "Sync now" pulls back anything changed directly in Google.
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleSyncMessage, setGoogleSyncMessage] = useState<string | null>(null);

  const mapDbTaskToTask = (t: any): Task => ({
    id: t.id,
    title: t.title,
    category: t.category,
    completed: t.status === 'done',
    time: t.time ?? null,
    repeat: (t.repeat as RepeatRule) || 'none',
    repeatDays: t.repeat_days || undefined,
    repeatGroupId: t.repeat_group_id ?? null,
    estimatedMinutes: 30,
    googleTaskId: t.google_task_id,
    googleEventId: t.google_event_id,
  });

  const refreshTasksForSelectedDate = async () => {
    if (!authUser) return;
    setTasksLoading(true);
    const { tasks: dbTasks } = await fetchTasksForToday(authUser.id, selectedDate);
    setTasks(dbTasks.map(mapDbTaskToTask));
    setTasksLoading(false);
  };

  const handleGoogleSyncNow = async () => {
    if (!authUser) return;
    setGoogleSyncing(true);
    setGoogleSyncMessage(null);
    const result = await pullGoogleSync();
    setGoogleSyncing(false);

    if (!result.synced) {
      setGoogleSyncMessage(result.error ? 'Sync failed — try again in a moment.' : 'Connect Google first to sync.');
      return;
    }
    setGoogleSyncMessage(
      `Synced — ${result.pushed || 0} pushed, ${result.pulledIn || 0} new, ${result.pulledUpdates || 0} updated.`
    );
    await refreshTasksForSelectedDate();
  };

  // Step the selected date backward/forward by one day — works for past AND
  // future dates, so you can plan tomorrow (or next week) ahead of time.
  const shiftDate = (deltaDays: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + deltaDays);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Human-friendly label for the date bar: "Today", "Yesterday", "Tomorrow", or a full date.
  const formatDateLabel = (dateStr: string) => {
    const yesterday = new Date(todayStr + 'T00:00:00');
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const tomorrow = new Date(todayStr + 'T00:00:00');
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    if (dateStr === tomorrowStr) return 'Tomorrow';

    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // Load profile + this date's tasks whenever the signed-in user or selected date changes.
  useEffect(() => {
