import React from 'react';
import { Flame, Trophy, Award, Calendar } from 'lucide-react';
import { Profile } from '../types';

interface StreakCardProps {
  profile: Profile | null;
}

/**
 * StreakCard.tsx
 * Displays student's active streak ("Streak: X days 🔥") and personal record ("Longest: Y days").
 */
export const StreakCard: React.FC<StreakCardProps> = ({ profile }) => {
  const currentStreak = profile?.current_streak ?? 0;
  const longestStreak = profile?.longest_streak ?? 0;
  const lastActiveDate = profile?.last_active_date;

  const todayStr = new Date().toISOString().split('T')[0];
  const isActiveToday = lastActiveDate === todayStr;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50/60 p-6 rounded-3xl border border-amber-200/60 shadow-xs space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-amber-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-sm shadow-orange-200">
            <Flame className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Study Streak</h3>
            <p className="text-xs text-slate-600">Build daily consistency for your exams</p>
          </div>
        </div>

        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          isActiveToday 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
            : 'bg-amber-100 text-amber-800 border border-amber-200'
        }`}>
          {isActiveToday ? 'Active Today ✨' : 'Complete a Task'}
        </span>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Current Streak */}
        <div className="bg-white/80 p-4 rounded-2xl border border-amber-100 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            <span>Current Streak</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-baseline gap-1">
            <span>Streak: {currentStreak} days</span>
            <span className="text-lg">🔥</span>
          </div>
        </div>

        {/* Longest Streak */}
        <div className="bg-white/80 p-4 rounded-2xl border border-amber-100 shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Personal Best</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            <span>Longest: {longestStreak} days</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
        💡 <strong>Pro Tip:</strong> Completing at least 1 study task every day increases your streak. Don't break the chain!
      </p>
    </div>
  );
};
