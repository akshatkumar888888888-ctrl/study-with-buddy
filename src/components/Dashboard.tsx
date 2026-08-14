import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Flame, Users, Trophy, Hourglass, Plus, Trash2, 
  CheckCircle2, Circle, Play, Pause, RotateCcw, Volume2, VolumeX,
  Sparkles, Award, Calendar, BookOpen, Clock, ChevronRight, UserCheck, LogOut, LogIn
} from 'lucide-react';
import { Task, TaskCategory, Profile, WeeklyLeaderboardEntry } from '../types';
import {
  supabase, signInWithGoogle, signOutUser, isSupabaseConfigured,
  fetchUserProfile, fetchTasksForToday, createDbTask, toggleDbTaskStatus,
  deleteDbTask, updateStreakOnTaskComplete, fetchWeeklyLeaderboard
} from '../utils/supabase';
import { User } from '@supabase/supabase-js';

interface DashboardProps {
  onBackToHome: () => void;
  authUser: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ onBackToHome, authUser }) => {
  // Auth state now lives in App.tsx and is passed down as a prop, so both
  // the Navbar and Dashboard always agree on whether someone is signed in.

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle();
    if (error) console.error("Sign in failed:", error.message);
  };

  const handleSignOut = async () => {
    await signOutUser();
    // No need to setAuthUser here — App.tsx's onAuthStateChange listener
    // will pick up the sign-out and update the shared authUser state.
  };

  // Real profile data (name, current streak) from Supabase — no fallback mock.
  const [profile, setProfile] = useState<Profile | null>(null);

  // Tasks state — starts empty and is loaded from Supabase for the signed-in user.
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('Physics');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Real weekly leaderboard, fetched from the get_weekly_leaderboard() function.
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  // Load profile + today's tasks whenever the signed-in user changes.
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
      const { tasks: dbTasks } = await fetchTasksForToday(authUser.id);
      if (!cancelled) {
        setTasks(
          dbTasks.map(t => ({
            id: t.id,
            title: t.title,
            category: t.category,
            completed: t.status === 'done',
            estimatedMinutes: 30, // not tracked in the DB schema yet
          }))
        );
        setTasksLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authUser?.id]);

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

  // Focus Timer State (25 mins = 1500 secs)
  const [timerSeconds, setTimerSeconds] = useState(1500);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [audioLofi, setAudioLofi] = useState(false);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      alert('🎉 Great job! Your 25-minute study focus session is complete!');
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  // Exam Countdown (Target: CBSE Class 12 Boards)
  const [examCountdown, setExamCountdown] = useState({ days: 42, hours: 14, minutes: 22, seconds: 45 });

  useEffect(() => {
    const timer = setInterval(() => {
      setExamCountdown(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        return { ...prev, seconds: 59, minutes: prev.minutes - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Add new task — writes to Supabase, not just local state.
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !authUser) return;

    const title = newTaskTitle.trim();
    setNewTaskTitle('');

    const { task, error } = await createDbTask(authUser.id, title, newTaskCategory);
    if (error || !task) {
      console.error('Failed to create task:', error);
      return;
    }
    setTasks(prev => [
      { id: task.id, title: task.title, category: task.category, completed: false, estimatedMinutes: 30 },
      ...prev,
    ]);
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
  };

  // Delete task — removes from Supabase too.
  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    const { error } = await deleteDbTask(id);
    if (error) console.error('Failed to delete task:', error);
  };

  // Filter tasks by selected category
  const filteredTasks = selectedCategory === 'All' 
    ? tasks 
    : tasks.filter(t => t.category === selectedCategory);

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Own rank on the real leaderboard, if present.
  const ownRank = authUser ? leaderboard.find(l => l.userId === authUser.id)?.rank : undefined;

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
                  : 'Stay on top of Class 12 syllabus, count down to exams, and collaborate in rooms.'}
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

              <button
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition-all"
              >
                ← Back
              </button>
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
          
          {/* LEFT COLUMN (8 cols): Tasks & Buddy Rooms */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* FEATURE 1: Daily To-Do with Categories */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Daily To-Do List</h2>
                    <p className="text-xs text-slate-500">Categorize tasks by subject and stay on track</p>
                  </div>
                </div>

                {/* Task Progress Bar */}
                <div className="w-full sm:w-48 bg-slate-100 h-2.5 rounded-full overflow-hidden self-center">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Add New Task Form */}
              <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-3">
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
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5 transition-all shrink-0 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
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
                    No tasks found for category "{selectedCategory}". Add one above!
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

                      <span className={`text-sm flex-1 font-medium ${task.completed ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </span>

                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {task.category}
                      </span>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>

            {/* FEATURE 3: Study Buddy Rooms */}
            <div id="rooms-section" className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Study Buddy Rooms</h2>
                    <p className="text-xs text-slate-500">Study live with classmates and hold each other accountable</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200/60">
                  Coming Soon
                </span>
              </div>

              {/* No real backend for rooms yet — shown honestly instead of fake room data */}
              <div className="text-center py-10 text-slate-400 text-sm space-y-2">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p>Live study rooms aren't built yet — this feature needs a realtime backend (presence, room membership) that hasn't been wired up.</p>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN (4 cols): Timer, Exam Countdown & Leaderboard */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* FEATURE 2: Pomodoro Focus Timer & Streak */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">Focus Timer (25m)</h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                  <Flame className="w-3.5 h-3.5 fill-amber-500" />
                  <span>{profile ? `${profile.current_streak || 0} Day Streak` : 'Sign in to track streak'}</span>
                </div>
              </div>

              {/* Timer Display */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl text-center space-y-3">
                <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-indigo-300">
                  {formatTime(timerSeconds)}
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {isTimerRunning ? '⚡ Focus Session Running...' : 'Ready for a 25-minute study sprint?'}
                </p>

                {/* Timer Controls */}
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isTimerRunning ? 'Pause' : 'Start Focus'}
                  </button>
                  <button
                    onClick={() => {
                      setIsTimerRunning(false);
                      setTimerSeconds(1500);
                    }}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* FEATURE 5: Exam Countdown */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-md border border-indigo-800 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Hourglass className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-base">Exam Countdown</h3>
                </div>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-bold uppercase">
                  CBSE 12
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-indigo-100">CBSE Board Examinations 2026</h4>
                <p className="text-xs text-indigo-300">Target Score: 95%+ in Boards</p>
              </div>

              {/* Countdown Grid */}
              <div className="grid grid-cols-4 gap-2 text-center pt-1">
                <div className="bg-indigo-900/60 border border-indigo-700/60 p-2 rounded-xl">
                  <span className="text-xl font-bold block text-white">{examCountdown.days}</span>
                  <span className="text-[10px] uppercase text-indigo-300 font-medium">Days</span>
                </div>
                <div className="bg-indigo-900/60 border border-indigo-700/60 p-2 rounded-xl">
                  <span className="text-xl font-bold block text-white">{examCountdown.hours}</span>
                  <span className="text-[10px] uppercase text-indigo-300 font-medium">Hours</span>
                </div>
                <div className="bg-indigo-900/60 border border-indigo-700/60 p-2 rounded-xl">
                  <span className="text-xl font-bold block text-white">{examCountdown.minutes}</span>
                  <span className="text-[10px] uppercase text-indigo-300 font-medium">Mins</span>
                </div>
                <div className="bg-indigo-900/60 border border-indigo-700/60 p-2 rounded-xl">
                  <span className="text-xl font-bold block text-amber-400">{examCountdown.seconds}</span>
                  <span className="text-[10px] uppercase text-indigo-300 font-medium">Secs</span>
                </div>
              </div>
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
