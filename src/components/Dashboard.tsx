import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Flame, Users, Trophy, Hourglass, Plus, Trash2, 
  CheckCircle2, Circle, Play, Pause, RotateCcw, Volume2, VolumeX,
  Sparkles, Award, Calendar, BookOpen, Clock, ChevronRight, UserCheck, LogOut, LogIn
} from 'lucide-react';
import { Task, TaskCategory, StudyRoom, LeaderboardUser, Exam } from '../types';
import { supabase, signInWithGoogle, signOutUser, isSupabaseConfigured } from '../utils/supabase';
import { User } from '@supabase/supabase-js';

interface DashboardProps {
  onBackToHome: () => void;
  authUser: User | null;
}

// Initial sample tasks for Class 12 student
const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Solve 15 Optics numerical questions (Ray Optics)', category: 'Physics', completed: true, estimatedMinutes: 45 },
  { id: '2', title: 'Revise Organic Chemistry Reaction Mechanisms (Aldehydes & Ketones)', category: 'Chemistry', completed: false, estimatedMinutes: 30 },
  { id: '3', title: 'Integration by Parts - Exercise 7.6 NCERT', category: 'Math', completed: false, estimatedMinutes: 60 },
  { id: '4', title: 'Read Poem "Keeping Quiet" & practice short answers', category: 'English', completed: true, estimatedMinutes: 20 },
];

// Initial Study Buddy Rooms
const INITIAL_ROOMS: StudyRoom[] = [
  { id: 'r1', name: 'Class 12 Physics Numerical Grind', subject: 'Physics', activeMembers: 4, maxMembers: 6, isPrivate: false, hostName: 'Rohan Sharma', tags: ['Ray Optics', 'NCERT'] },
  { id: 'r2', name: 'Late Night Calculus & Vectors', subject: 'Mathematics', activeMembers: 3, maxMembers: 5, isPrivate: false, hostName: 'Priya Patel', tags: ['Calculus', 'JEE Prep'] },
  { id: 'r3', name: 'Silent Pomodoro - Organic Chemistry', subject: 'Chemistry', activeMembers: 5, maxMembers: 8, isPrivate: false, hostName: 'Ananya Roy', tags: ['Pomodoro 25/5', 'Quiet'] },
];

// Initial Leaderboard
const INITIAL_LEADERBOARD: LeaderboardUser[] = [
  { rank: 1, name: 'Siddharth Verma', avatar: 'SV', studyHours: 38.5, streakDays: 14, points: 1420, badge: 'Gold Scholar 🥇' },
  { rank: 2, name: 'Meera Nambiar', avatar: 'MN', studyHours: 35.0, streakDays: 11, points: 1280, badge: 'Silver Scholar 🥈' },
  { rank: 3, name: 'Rohan Sharma', avatar: 'RS', studyHours: 32.2, streakDays: 9, points: 1150, badge: 'Bronze Scholar 🥉' },
  { rank: 4, name: 'Priya Patel', avatar: 'PP', studyHours: 29.8, streakDays: 8, points: 990 },
  { rank: 5, name: 'Akshat Kumar (You)', avatar: 'AK', studyHours: 26.4, streakDays: 7, points: 880 },
];

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

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('Physics');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Active Room State
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);

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

  // Add new task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      completed: false,
      estimatedMinutes: 30
    };

    setTasks([newTask, ...tasks]);
    setNewTaskTitle('');
  };

  // Toggle task completed state
  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Delete task
  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Filter tasks by selected category
  const filteredTasks = selectedCategory === 'All' 
    ? tasks 
    : tasks.filter(t => t.category === selectedCategory);

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

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
              <p className="text-2xl font-black mt-1 text-white">7 Days 🔥</p>
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
                <span>Study Time</span>
                <Clock className="w-4 h-4 text-sky-300" />
              </div>
              <p className="text-2xl font-black mt-1 text-white">3h 45m</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
              <div className="flex items-center justify-between text-indigo-200 text-xs font-medium">
                <span>Weekly Rank</span>
                <Trophy className="w-4 h-4 text-amber-300" />
              </div>
              <p className="text-2xl font-black mt-1 text-white">#5 in Class</p>
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
                {filteredTasks.length === 0 ? (
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
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              
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

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Live Rooms
                </span>
              </div>

              {/* Rooms List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INITIAL_ROOMS.map(room => (
                  <div key={room.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-200 transition-all flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {room.subject}
                        </span>
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {room.activeMembers}/{room.maxMembers} Online
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{room.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Host: {room.hostName}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex gap-1">
                        {room.tags.map(t => (
                          <span key={t} className="text-[10px] text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={() => setActiveRoom(room)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-2xs transition-all"
                      >
                        Join Room
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Active Room Modal / Drawer */}
              {activeRoom && (
                <div className="p-5 bg-indigo-900 text-white rounded-2xl space-y-4 animate-fade-in border border-indigo-700">
                  <div className="flex items-center justify-between border-b border-indigo-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                      <h3 className="font-bold text-base">{activeRoom.name}</h3>
                    </div>
                    <button 
                      onClick={() => setActiveRoom(null)}
                      className="text-xs bg-indigo-800 hover:bg-indigo-700 text-indigo-200 px-2.5 py-1 rounded-lg"
                    >
                      Leave Room
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-indigo-950/60 p-3.5 rounded-xl space-y-2 border border-indigo-800/80">
                      <p className="font-bold text-indigo-200 uppercase tracking-wider text-[10px]">Active Buddies in Room</p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center font-bold">RS</div>
                        <span>Rohan Sharma (Host)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold">PP</div>
                        <span>Priya Patel</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center font-bold text-slate-900">AK</div>
                        <span>Akshat Kumar (You)</span>
                      </div>
                    </div>

                    <div className="bg-indigo-950/60 p-3.5 rounded-xl space-y-2 border border-indigo-800/80">
                      <p className="font-bold text-indigo-200 uppercase tracking-wider text-[10px]">Shared Focus Beats & Sound</p>
                      <div className="flex items-center justify-between">
                        <span>Lofi Girl Study Stream</span>
                        <button
                          onClick={() => setAudioLofi(!audioLofi)}
                          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md text-xs"
                        >
                          {audioLofi ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                          {audioLofi ? 'Mute Lofi' : 'Play Lofi'}
                        </button>
                      </div>
                      <p className="text-[10px] text-indigo-300">Keep mic muted unless asking a quick doubt!</p>
                    </div>
                  </div>
                </div>
              )}

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
                  <span>7 Day Streak</span>
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
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Weekly Leaderboard</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">Class 12</span>
              </div>

              <div className="space-y-2.5">
                {INITIAL_LEADERBOARD.map(user => (
                  <div
                    key={user.rank}
                    className={`p-3 rounded-xl flex items-center justify-between text-xs transition-all ${
                      user.name.includes('(You)')
                        ? 'bg-indigo-50 border border-indigo-200 font-bold text-indigo-900'
                        : 'bg-slate-50/70 border border-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-5 text-center font-extrabold ${
                        user.rank === 1 ? 'text-amber-500 text-sm' :
                        user.rank === 2 ? 'text-slate-400 text-sm' :
                        user.rank === 3 ? 'text-amber-700 text-sm' : 'text-slate-500'
                      }`}>
                        #{user.rank}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-[10px] text-slate-400">{user.studyHours}h studied</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-indigo-600 block">{user.points} pts</span>
                      <span className="text-[10px] text-amber-600 font-medium">🔥 {user.streakDays}d streak</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
};
