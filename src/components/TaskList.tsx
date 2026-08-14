import React from 'react';
import { DbTask } from '../types';
import { TaskItem } from './TaskItem';
import { CheckSquare, Sparkles } from 'lucide-react';

interface TaskListProps {
  tasks: DbTask[];
  onToggleStatus: (taskId: string, currentStatus: 'pending' | 'done') => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  loading?: boolean;
}

/**
 * TaskList.tsx
 * Renders list of study tasks for today with completion percentage and empty state.
 */
export const TaskList: React.FC<TaskListProps> = ({ tasks, onToggleStatus, onDeleteTask, loading = false }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm space-y-5">
      {/* List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Today's Tasks</h3>
            <p className="text-xs text-slate-500">
              {completedTasks} of {totalTasks} completed ({progressPercent}%)
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full sm:w-48 space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-600">
            <span>Daily Goal</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Task List Items */}
      {loading ? (
        <div className="py-8 text-center text-slate-400 text-xs font-medium">
          Loading tasks from database...
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-10 text-center space-y-2 border-2 border-dashed border-slate-100 rounded-2xl">
          <Sparkles className="w-8 h-8 text-indigo-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No study tasks added for today!</p>
          <p className="text-xs text-slate-500">Use the form above to add your Physics, Chemistry, or Math goals.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggleStatus={onToggleStatus}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};
