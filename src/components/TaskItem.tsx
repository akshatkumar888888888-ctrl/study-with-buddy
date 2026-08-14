import React, { useState } from 'react';
import { DbTask } from '../types';
import { CheckCircle2, Circle, Trash2, Tag } from 'lucide-react';

interface TaskItemProps {
  task: DbTask;
  onToggleStatus: (taskId: string, currentStatus: 'pending' | 'done') => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}

/**
 * TaskItem.tsx
 * Individual task row with status checkbox, subject badge, title, and delete action.
 */
export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleStatus, onDeleteTask }) => {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDone = task.status === 'done';

  const categoryColor = {
    Physics: 'bg-blue-50 text-blue-700 border-blue-200',
    Chemistry: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Math: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    English: 'bg-amber-50 text-amber-700 border-amber-200',
    Other: 'bg-slate-100 text-slate-700 border-slate-200'
  }[task.category] || 'bg-slate-100 text-slate-700 border-slate-200';

  const handleToggle = async () => {
    setToggling(true);
    await onToggleStatus(task.id, task.status);
    setToggling(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDeleteTask(task.id);
  };

  return (
    <div className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
      isDone 
        ? 'bg-slate-50/80 border-slate-200/60 opacity-80' 
        : 'bg-white border-slate-100 shadow-xs hover:border-slate-200'
    }`}>
      {/* Checkbox and Title */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={handleToggle}
          disabled={toggling}
          aria-label={isDone ? "Mark as pending" : "Mark as completed"}
          className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0 focus:outline-none"
        >
          {isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
          ) : (
            <Circle className="w-5 h-5 text-slate-300 hover:text-indigo-500" />
          )}
        </button>

        <span className={`text-sm font-medium text-slate-800 break-words ${
          isDone ? 'line-through text-slate-400' : ''
        }`}>
          {task.title}
        </span>
      </div>

      {/* Category Badge & Delete Button */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${categoryColor}`}>
          {task.category}
        </span>

        <button
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete task"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
