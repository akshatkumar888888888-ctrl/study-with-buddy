import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { User, Target, Calendar, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileFormProps {
  profile: Profile | null;
  onSave: (updatedData: { name: string; target_exam: string; exam_date: string }) => Promise<boolean>;
  loading?: boolean;
}

/**
 * ProfileForm.tsx
 * Allows the student to view and update their Name, Target Exam, and Target Exam Date.
 */
export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSave, loading = false }) => {
  const [name, setName] = useState(profile?.name || '');
  const [targetExam, setTargetExam] = useState(profile?.target_exam || 'CBSE Boards 2026');
  const [examDate, setExamDate] = useState(profile?.exam_date || '2026-03-01');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync internal form state if profile prop changes
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setTargetExam(profile.target_exam || 'CBSE Boards 2026');
      setExamDate(profile.exam_date || '2026-03-01');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Name cannot be empty.');
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const success = await onSave({
      name: name.trim(),
      target_exam: targetExam.trim(),
      exam_date: examDate
    });

    setSaving(false);
    if (success) {
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else {
      setErrorMsg('Failed to save profile changes.');
    }
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Student Profile</h3>
            <p className="text-xs text-slate-500">Update your details and target exam dates</p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Student Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g., Akshat Kumar"
              required
              className="w-full px-4 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Target Exam Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Target Exam
          </label>
          <div className="relative">
            <input
              type="text"
              value={targetExam}
              onChange={(e) => setTargetExam(e.target.value)}
              placeholder="E.g., JEE Main 2027 / CBSE Class 12 Boards"
              required
              className="w-full px-4 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <Target className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Exam Date Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Exam Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving || loading}
          className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Update Profile'}</span>
        </button>
      </form>
    </div>
  );
};
