import React, { useState } from 'react';
import { Plus, BookOpen, Calendar, Tag } from 'lucide-react';

interface TaskFormProps {
  onAddTask: (title: string, category: 'Physics' | 'Chemistry' | 'Math' | 'English' | 'Other', date: string) => Promise<boolean>;
  loading?: boolean;
}

/**
 * TaskForm.tsx
 * Allows students to add a daily study task with category tag and date.
 */
export const TaskForm: React.FC<TaskFormProps> = ({ onAddTask, loading = false }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Physics' | 'Chemistry' | 'Math' | 'English' | 'Other'>('Physics');
  const [date, setDate] = useState(todayStr);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    const success = await onAddTask(title.trim(), category, date);
    setSubmitting(false);

    if (success) {
      setTitle('');
    }
  };

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <Plus className="w-5 h-5 text-indigo-600" />
        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Add New Study Task</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Task Title */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Task Description
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="E.g., Solve 15 Optics numericals from NCERT..."
            required
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject Category
            </label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
              >
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Math">Math</option>
                <option value="English">English</option>
                <option value="Other">Other</option>
              </select>
              <Tag className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Task Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || loading || !title.trim()}
          className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{submitting ? 'Adding Task...' : 'Add Task'}</span>
        </button>
      </form>
    </div>
  );
};
