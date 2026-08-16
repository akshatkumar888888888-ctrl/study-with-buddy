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
    if (!authUser || !isSupabaseConfigured) {
      setProfile(null);
      setTasks([]);
      return;
    }

    let cancelled = false;

    (async () => {
      const { profile: p } = await fetchUserProfile(
        authUser.id,
        authUser.email,
        authUser.user_metadata?.full_name
      );
      if (!cancelled) setProfile(p);

      setTasksLoading(true);
      const { tasks: dbTasks } = await fetchTasksForToday(authUser.id, selectedDate);
      if (!cancelled) {
        setTasks(dbTasks.map(mapDbTaskToTask));
        setTasksLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authUser?.id, selectedDate]);

  // Load the real weekly leaderboard once on mount (visible to everyone, signed in or not).
  useEffect(() => {
    let cancelled = false;
    setLeaderboardLoading(true);
    fetchWeeklyLeaderboard().then(({ leaderboard: lb }) => {
      if (!cancelled) {
        setLeaderboard(lb);
        setLeaderboardLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // ============================= FOCUS TIMER =============================
  const [timerDuration, setTimerDuration] = useState(1500); // seconds selected by preset
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (!isTimerRunning) return;
    if (timerSeconds <= 0) {
      setIsTimerRunning(false);
      alert('🎉 Great job! Your focus session is complete!');
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Starting the timer when it's already at 0 (session just finished) restarts
  // it from the selected duration instead of doing nothing.
  const handleTimerStartPause = () => {
    if (!isTimerRunning && timerSeconds <= 0) {
      setTimerSeconds(timerDuration);
    }
    setIsTimerRunning(prev => !prev);
  };

  const handleTimerReset = () => {
    setIsTimerRunning(false);
    setTimerSeconds(timerDuration);
  };

  const handlePresetSelect = (seconds: number) => {
    setTimerDuration(seconds);
    setTimerSeconds(seconds);
    setIsTimerRunning(false);
  };

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ============================= EXAM COUNTDOWN (multi-exam) =============================
  const [exams, setExams] = useState<Exam[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [newExamName, setNewExamName] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [addingExam, setAddingExam] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  // Ticks every second so every exam card's countdown updates live and
  // independently, driven off each exam's own real date (not a shared, fake timer).
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!authUser) {
      setExams([]);
      return;
    }
    let cancelled = false;
    setExamsLoading(true);
    fetchExams(authUser.id).then(({ exams: e }) => {
      if (!cancelled) {
        setExams(e);
        setExamsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [authUser?.id]);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !newExamName.trim() || !newExamDate) return;
    setAddingExam(true);
    const { exam, error } = await createExam(authUser.id, newExamName.trim(), newExamDate);
    setAddingExam(false);
    if (error || !exam) {
      console.error('Failed to add exam:', error);
      return;
    }
    setExams(prev => [...prev, exam].sort((a, b) => a.date.localeCompare(b.date)));
    setNewExamName('');
    setNewExamDate('');
  };

  const handleDeleteExam = async (examId: string) => {
    if (!authUser) return;
    setExams(prev => prev.filter(x => x.id !== examId));
    await deleteExam(authUser.id, examId);
  };

  const getCountdown = (dateStr: string) => {
    const target = new Date(dateStr + 'T00:00:00').getTime();
    const diff = target - nowTick;
    if (diff <= 0) return null; // exam day has arrived / passed
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds };
  };

  // ============================= TASKS =============================

  // Add new task — writes to Supabase, not just local state. Supports an
  // optional time-of-day and a repeat rule (daily, or a custom set of
  // weekdays), which generates one task row per matching date.
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !authUser) return;
    if (newTaskRepeat === 'custom' && newTaskRepeatDays.length === 0) return;

    setAddingTask(true);
    const title = newTaskTitle.trim();

    const { tasks: created, error } = await createDbTask(authUser.id, title, newTaskCategory, selectedDate, {
      time: newTaskTime || null,
      repeat: newTaskRepeat,
      repeatDays: newTaskRepeatDays,
      repeatUntil: newTaskRepeatUntil || undefined,
    });
    setAddingTask(false);

    if (error || created.length === 0) {
      console.error('Failed to create task:', error);
      return;
    }

    // Reset the form.
    setNewTaskTitle('');
    setNewTaskTime('');
    setNewTaskRepeat('none');
    setNewTaskRepeatDays([]);
    setNewTaskRepeatUntil('');

    // Re-pull this date's list so it reflects exactly what's in the DB
    // (simplest correct way to show any of the repeat's instances that
    // happen to land on the currently viewed date).
    await refreshTasksForSelectedDate();

    // Only push the occurrence that lands on the currently selected date to
    // Google Calendar/Tasks — pushing every date of a 90-day repeat would
    // flood the student's calendar with events.
    const baseTask = created.find(t => t.date === selectedDate) || created[0];
    if (baseTask) {
      syncTaskToGoogle(baseTask.id, 'upsert').then(({ synced, error: syncErr }) => {
        if (syncErr) console.error('Google sync (add) failed:', syncErr);
        if (synced) refreshTasksForSelectedDate();
      });
    }
  };

  const toggleRepeatDay = (day: number) => {
    setNewTaskRepeatDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
  };

  // Toggle task completed state — persists to Supabase and updates streak.
  const toggleTask = async (id: string) => {
    const current = tasks.find(t => t.id === id);
    if (!current) return;
    const currentStatus: 'pending' | 'done' = current.completed ? 'done' : 'pending';

    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

    const { error } = await toggleDbTaskStatus(id, currentStatus);
    if (error) {
      console.error('Failed to update task:', error);
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: current.completed } : t));
      return;
    }

    // If the task just became "done", update the user's streak.
    if (currentStatus === 'pending' && authUser && profile) {
      const { profile: updated } = await updateStreakOnTaskComplete(authUser.id, profile);
      if (updated) setProfile(updated);
    }

    // Reflect the completion (or un-completion) on Google Tasks + Calendar.
    syncTaskToGoogle(id, 'upsert').then(({ error: syncErr }) => {
      if (syncErr) console.error('Google sync (toggle) failed:', syncErr);
    });
  };

  // Delete task — removes the Google Task/event first (needs the row to still
  // exist to look up its google_task_id/google_event_id), then Supabase.
  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await syncTaskToGoogle(id, 'delete').catch(err => console.error('Google sync (delete) failed:', err));
    const { error } = await deleteDbTask(id);
    if (error) console.error('Failed to delete task:', error);
  };

  // Filter tasks by selected category, sorted by time-of-day (untimed tasks last).
  const filteredTasks = (selectedCategory === 'All' ? tasks : tasks.filter(t => t.category === selectedCategory))
    .slice()
    .sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Own rank on the real leaderboard, if present.
  const ownRank = authUser ? leaderboard.find(l => l.userId === authUser.id)?.rank : undefined;

  const repeatLabel = (task: Task) => {
    if (!task.repeat || task.repeat === 'none') return null;
    if (task.repeat === 'daily') return 'Repeats daily';
    if (task.repeat === 'custom' && task.repeatDays?.length) {
      return `Repeats ${task.repeatDays.map(d => WEEKDAY_LABELS[d]).join(', ')}`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">

      {/* Top Banner Header */}
      <div className="bg-indigo-600 text-white pt-8 pb-12 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Student Control Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {authUser
                  ? `Welcome, ${authUser.user_metadata?.full_name || authUser.email?.split('@')[0]} 👋`
                  : 'Study Dashboard'}
              </h1>
              <p className="text-indigo-100 text-sm mt-1">
                {authUser
                  ? `Authenticated as ${authUser.email}`
                  : 'Stay on top of Class 12 syllabus, count down to exams, and track your progress.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {authUser ? (
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-white font-semibold text-xs border border-rose-300/30 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-sm transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sign in with Google</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Stat Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
                <span>Current Streak</span>
                <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <p className="text-2xl font-black mt-1 text-white">
                {profile ? `${profile.current_streak || 0} Days 🔥` : '—'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
                <span>Tasks Today</span>
                <CheckSquare className="w-4 h-4 text-emerald-300" />
              </div>
              <p className="text-2xl font-black mt-1 text-white">{completedCount} / {tasks.length}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
                <span>Longest Streak</span>
                <Clock className="w-4 h-4 text-sky-300" />
              </div>
              <p className="text-2xl font-black mt-1 text-white">
                {profile ? `${profile.longest_streak || 0} Days` : '—'}
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
                <span>Weekly Rank</span>
                <Trophy className="w-4 h-4 text-amber-300" />
              </div>
              <p className="text-2xl font-black mt-1 text-white">
                {ownRank ? `#${ownRank} in Class` : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN (8 cols): To-Do List */}
          <div className="lg:col-span-8 space-y-8">

            {/* FEATURE 1: Daily To-Do with Categories, Timing & Repeats */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm space-y-6">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Daily To-Do List</h2>
                    <p className="text-xs text-slate-500">Schedule work for any date, with a time and optional repeat</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Google Calendar/Tasks connection status + manual two-way sync */}
                  {authUser && (
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        profile?.google_connected
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <CalendarCheck2 className="w-3.5 h-3.5" />
                        {profile?.google_connected ? 'Synced with Google' : 'Google not connected'}
                      </span>
                      {profile?.google_connected && (
                        <button
                          onClick={handleGoogleSyncNow}
                          disabled={googleSyncing}
                          title="Pull in changes made directly in Google Calendar/Tasks"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${googleSyncing ? 'animate-spin' : ''}`} />
                          {googleSyncing ? 'Syncing...' : 'Sync now'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Task Progress Bar */}
                  <div className="w-full sm:w-48 bg-slate-100 h-2.5 rounded-full overflow-hidden self-center">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {googleSyncMessage && (
                <p className="text-[11px] text-slate-400 -mt-3">{googleSyncMessage}</p>
              )}

              {authUser && !profile?.google_connected && (
                <div className="flex items-center justify-between gap-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl px-4 py-2.5 text-xs text-indigo-700">
                  <span>Connect Google Calendar &amp; Tasks so your schedule and completions sync automatically.</span>
                  <button
                    onClick={handleGoogleSignIn}
                    className="shrink-0 font-semibold underline underline-offset-2 hover:text-indigo-900"
                  >
                    Connect
                  </button>
                </div>
              )}

              {/* Date Navigation Bar — Google Calendar-style day switcher.
                  Lets the user browse and manage tasks for ANY date: today,
                  tomorrow, later this week, or any date in the past. */}
              <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors"
                  title="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>{formatDateLabel(selectedDate)}</span>
                  {selectedDate !== todayStr && (
                    <span className="text-[10px] font-medium text-slate-400">({selectedDate})</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedDate !== todayStr && (
                    <button
                      onClick={() => setSelectedDate(todayStr)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-white transition-colors"
                    >
                      Today
                    </button>
                  )}
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    onClick={() => shiftDate(1)}
                    className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Next day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Add New Task Form */}
              <form onSubmit={handleAddTask} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="E.g., Practice Ray Optics NCERT exercise 9.1..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Math">Math</option>
                    <option value="English">English</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Time for this task */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
                    <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="time"
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      className="bg-transparent text-sm text-slate-700 focus:outline-none w-full"
                      title="Optional time of day"
                    />
                    {newTaskTime && (
                      <button type="button" onClick={() => setNewTaskTime('')} className="text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Repeat rule */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
                    <Repeat className="w-4 h-4 text-slate-400 shrink-0" />
                    <select
                      value={newTaskRepeat}
                      onChange={(e) => {
                        const val = e.target.value as RepeatRule;
                        setNewTaskRepeat(val);
                        if (val !== 'custom') setNewTaskRepeatDays([]);
                      }}
                      className="bg-transparent text-sm text-slate-700 focus:outline-none w-full"
                    >
                      <option value="none">Doesn't repeat</option>
                      <option value="daily">Every day</option>
                      <option value="custom">Custom (choose days)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={addingTask}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95 disabled:opacity-60"
                  >
                    <Plus className="w-4 h-4" />
                    {addingTask ? 'Adding...' : 'Add'}
                  </button>
                </div>

                {/* Custom weekday picker + repeat-until, shown only when relevant */}
                {newTaskRepeat !== 'none' && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl px-4 py-3">
                    {newTaskRepeat === 'custom' && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {WEEKDAY_LABELS.map((label, idx) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleRepeatDay(idx)}
                            className={`w-9 h-9 rounded-full text-[11px] font-bold transition-all ${
                              newTaskRepeatDays.includes(idx)
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-500 border border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            {label[0]}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-indigo-700 sm:ml-auto">
                      <span className="font-medium whitespace-nowrap">Repeat until</span>
                      <input
                        type="date"
                        min={selectedDate}
                        value={newTaskRepeatUntil}
                        onChange={(e) => setNewTaskRepeatUntil(e.target.value)}
                        placeholder="optional"
                        className="text-xs bg-white border border-indigo-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <span className="text-indigo-400">(default: 90 days)</span>
                    </div>
                  </div>
                )}
              </form>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                {['All', 'Physics', 'Chemistry', 'Math', 'English', 'Other'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Tasks List */}
              <div className="space-y-2.5">
                {!authUser ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Sign in with Google to create and track your tasks.
                  </div>
                ) : tasksLoading ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Loading your tasks...
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    No tasks found for category "{selectedCategory}" on {formatDateLabel(selectedDate)}. Add one above!
                  </div>
                ) : (
                  filteredTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                        task.completed
                          ? 'bg-slate-50/70 border-slate-200 text-slate-400'
                          : 'bg-white border-slate-200/90 hover:border-indigo-200 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="text-indigo-600 hover:scale-110 transition-transform focus:outline-none"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium block truncate ${task.completed ? 'line-through text-slate-400' : ''}`}>
                          {task.title}
                        </span>
                        {(task.time || repeatLabel(task)) && (
                          <div className="flex items-center gap-2.5 mt-0.5">
                            {task.time && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                                <Clock className="w-3 h-3" />
                                {task.time}
                              </span>
                            )}
                            {repeatLabel(task) && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-indigo-400 font-medium">
                                <Repeat className="w-3 h-3" />
                                {repeatLabel(task)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                        {task.category}
                      </span>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 transition-colors shrink-0"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN (4 cols): Timer, Exam Countdown & Leaderboard */}
          <div className="lg:col-span-4 space-y-8">

            {/* FEATURE 2: Pomodoro-style Focus Timer & Streak */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">Focus Timer</h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                  <Flame className="w-3.5 h-3.5 fill-amber-500" />
                  <span>{profile ? `${profile.current_streak || 0} Day Streak` : 'Sign in to track streak'}</span>
                </div>
              </div>

              {/* Duration presets */}
              <div className="flex items-center gap-2">
                {FOCUS_PRESETS.map(preset => (
                  <button
                    key={preset.seconds}
                    onClick={() => handlePresetSelect(preset.seconds)}
                    className={`flex-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      timerDuration === preset.seconds
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Timer Display */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl text-center space-y-3">
                <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-indigo-300">
                  {formatTime(timerSeconds)}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {isTimerRunning ? '⚡ Focus Session Running...' : timerSeconds === 0 ? '🎉 Session complete!' : 'Ready for a focus sprint?'}
                </p>

                {/* Timer Controls */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleTimerStartPause}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isTimerRunning ? 'Pause' : timerSeconds === 0 ? 'Start Again' : 'Start Focus'}
                  </button>
                  <button
                    onClick={handleTimerReset}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* FEATURE 5: Exam Countdown — multiple exams, each with its own live countdown */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-indigo-800 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Hourglass className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base">Exam Countdown</h3>
                </div>
              </div>

              {!authUser ? (
                <p className="text-xs text-indigo-300 py-2">Sign in to add and track your exams.</p>
              ) : (
                <>
                  {/* Add exam form */}
                  <form onSubmit={handleAddExam} className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Exam name, e.g. CBSE Boards Physics"
                      value={newExamName}
                      onChange={(e) => setNewExamName(e.target.value)}
                      className="w-full px-3 py-2 bg-indigo-900/60 border border-indigo-700/60 rounded-xl text-xs placeholder:text-indigo-400 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={newExamDate}
                        min={todayStr}
                        onChange={(e) => setNewExamDate(e.target.value)}
                        className="flex-1 px-3 py-2 bg-indigo-900/60 border border-indigo-700/60 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                      <button
                        type="submit"
                        disabled={addingExam || !newExamName.trim() || !newExamDate}
                        className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 disabled:opacity-50 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  </form>

                  {/* Exam list, each with its own live countdown */}
                  <div className="space-y-3 pt-1">
                    {examsLoading ? (
                      <p className="text-xs text-indigo-300 text-center py-3">Loading exams...</p>
                    ) : exams.length === 0 ? (
                      <p className="text-xs text-indigo-300 text-center py-3">No exams yet — add your first one above.</p>
                    ) : (
                      exams.map(exam => {
                        const cd = getCountdown(exam.date);
                        return (
                          <div key={exam.id} className="bg-indigo-900/50 border border-indigo-700/50 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-indigo-100 truncate">{exam.name}</h4>
                                <p className="text-[11px] text-indigo-400">
                                  {new Date(exam.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteExam(exam.id)}
                                className="text-indigo-400 hover:text-rose-400 p-1 transition-colors shrink-0"
                                title="Remove exam"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {cd ? (
                              <div className="grid grid-cols-4 gap-1.5 text-center">
                                <div className="bg-indigo-900/70 border border-indigo-700/60 p-1.5 rounded-lg">
                                  <span className="text-base font-bold block text-white">{cd.days}</span>
                                  <span className="text-[9px] uppercase text-indigo-300 font-medium">Days</span>
                                </div>
                                <div className="bg-indigo-900/70 border border-indigo-700/60 p-1.5 rounded-lg">
                                  <span className="text-base font-bold block text-white">{cd.hours}</span>
                                  <span className="text-[9px] uppercase text-indigo-300 font-medium">Hrs</span>
                                </div>
                                <div className="bg-indigo-900/70 border border-indigo-700/60 p-1.5 rounded-lg">
                                  <span className="text-base font-bold block text-white">{cd.minutes}</span>
                                  <span className="text-[9px] uppercase text-indigo-300 font-medium">Min</span>
                                </div>
                                <div className="bg-indigo-900/70 border border-indigo-700/60 p-1.5 rounded-lg">
                                  <span className="text-base font-bold block text-amber-400">{cd.seconds}</span>
                                  <span className="text-[9px] uppercase text-indigo-300 font-medium">Sec</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs font-bold text-amber-400 text-center py-1">🎯 It's exam day (or has passed)!</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>

            {/* FEATURE 4: Weekly Leaderboard */}
            <div id="leaderboard-section" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Weekly Leaderboard</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">Class 12</span>
              </div>

              <div className="space-y-2.5">
                {leaderboardLoading ? (
                  <div className="text-center py-6 text-slate-400 text-xs">Loading leaderboard...</div>
                ) : leaderboard.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No completed tasks yet this week — be the first on the board!
                  </div>
                ) : (
                  leaderboard.map(entry => {
                    const isYou = authUser && entry.userId === authUser.id;
                    return (
                      <div
                        key={entry.userId}
                        className={`p-3 rounded-xl flex items-center justify-between text-xs transition-all ${
                          isYou
                            ? 'bg-indigo-50 border border-indigo-200 font-bold text-indigo-900'
                            : 'bg-slate-50/70 border border-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 text-center font-extrabold ${
                            entry.rank === 1 ? 'text-amber-500 text-sm' :
                            entry.rank === 2 ? 'text-slate-400 text-sm' :
                            entry.rank === 3 ? 'text-amber-700 text-sm' : 'text-slate-500'
                          }`}>
                            #{entry.rank}
                          </span>
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                            {entry.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{entry.name}{isYou ? ' (You)' : ''}</p>
                            <p className="text-[10px] text-slate-400">{entry.target_exam}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-indigo-600 block">{entry.tasksCompletedThisWeek} tasks</span>
                          <span className="text-[10px] text-slate-400 font-medium">this week</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
