import React from 'react';
import { CheckCircle2, TrendingUp, CalendarDays } from 'lucide-react';

interface WeeklyStatsProps {
  completedThisWeekCount: number;
}

/**
 * WeeklyStats.tsx
 * Displays total study tasks completed during the current week (Monday through Sunday).
 */
export const WeeklyStats: React.FC<WeeklyStatsProps> = ({ completedThisWeekCount }) => {
  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-white p-6 rounded-3xl border border-indigo-100 shadow-xs space-y-4">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-100/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-indigo-200">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Weekly Progress</h3>
            <p className="text-xs text-slate-600">Monday to Sunday completion stats</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-1 rounded-full border border-indigo-200/80">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>This Week</span>
        </div>
      </div>

      {/* Stats Display Box */}
      <div className="bg-white/90 p-5 rounded-2xl border border-indigo-100/80 shadow-2xs flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Tasks completed this week
          </span>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 flex items-baseline gap-2">
            <span>{completedThisWeekCount}</span>
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">tasks done</span>
          </div>
        </div>

        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <CalendarDays className="w-6 h-6" />
        </div>
      </div>

      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
        🎯 <strong>Goal:</strong> Complete at least 15 tasks per week to keep your Class 12 preparation on track!
      </p>
    </div>
  );
};
