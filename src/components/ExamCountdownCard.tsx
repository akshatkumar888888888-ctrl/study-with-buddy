import React from 'react';
import { Hourglass, Calendar, Target, Sparkles, ArrowRight, Clock } from 'lucide-react';

interface ExamCountdownCardProps {
  targetExam?: string;
  examDate?: string;
  onFocusProfileForm?: () => void;
}

/**
 * ExamCountdownCard.tsx
 * 
 * Displays:
 * - "Goal: <target_exam>"
 * - "Days left: X"
 * - If exam_date is missing or invalid: "Set your exam date to see countdown" + button
 */
export const ExamCountdownCard: React.FC<ExamCountdownCardProps> = ({
  targetExam = 'CBSE Boards 2026',
  examDate,
  onFocusProfileForm
}) => {
  // Calculate days remaining until exam
  const calculateDaysLeft = (dateStr?: string): { daysLeft: number | null; isValid: boolean } => {
    if (!dateStr || dateStr.trim() === '') {
      return { daysLeft: null, isValid: false };
    }
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) {
      return { daysLeft: null, isValid: false };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());

    const diffMs = targetDay.getTime() - today.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { daysLeft: Math.max(0, days), isValid: true };
  };

  const { daysLeft, isValid } = calculateDaysLeft(examDate);

  // Format date for display
  const formattedDate = isValid && examDate ? new Date(examDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : null;

  return (
    <div className="bg-gradient-to-br from-rose-50 via-amber-50/50 to-white p-6 rounded-3xl border border-rose-100 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-rose-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-sm shadow-rose-200">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Exam Countdown</h3>
            <p className="text-xs text-slate-600">Track your target board & entrance exams</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <Target className="w-3.5 h-3.5 text-rose-600" />
          <span>Goal: {targetExam}</span>
        </div>
      </div>

      {/* Main Countdown Display */}
      {isValid && daysLeft !== null ? (
        <div className="bg-white/90 p-5 rounded-2xl border border-rose-100 shadow-2xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Goal: <strong className="text-slate-800">{targetExam}</strong>
            </span>
            <div className="text-3xl sm:text-4xl font-black text-rose-900 flex items-baseline gap-2">
              <span>Days left: {daysLeft}</span>
              <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">days</span>
            </div>
            {formattedDate && (
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Exam Date: {formattedDate}</span>
              </p>
            )}
          </div>

          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200/80 flex flex-col items-center justify-center text-rose-700 shrink-0 shadow-2xs">
            <Clock className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{daysLeft}d</span>
          </div>
        </div>
      ) : (
        /* Empty / Not Set Fallback */
        <div className="bg-white/90 p-5 rounded-2xl border border-rose-100 shadow-2xs text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">
              Set your exam date to see countdown
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Current Goal: <strong>{targetExam}</strong>
            </p>
          </div>

          {onFocusProfileForm && (
            <button
              onClick={onFocusProfileForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
            >
              <span>Set Exam Date</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
        ⏳ <strong>Exam Reminder:</strong> Consistent study schedules produce peak performance on exam day!
      </p>
    </div>
  );
};
