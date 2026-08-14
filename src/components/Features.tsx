import React from 'react';
import { CheckSquare, Flame, Users, Trophy, Hourglass, ArrowRight, BookOpen, Sparkles } from 'lucide-react';

interface FeaturesProps {
  onSelectFeature?: (featureKey: string) => void;
}

/**
 * Features Section Component
 * Equivalent in Next.js: app/components/Features.tsx
 * 
 * Showcases the 5 core features requested:
 * 1. Daily To-Do with categories
 * 2. Study streak & stats
 * 3. Study Buddy Rooms
 * 4. Weekly leaderboard
 * 5. Exam countdown
 */
export const Features: React.FC<FeaturesProps> = ({ onSelectFeature }) => {
  const featureList = [
    {
      id: 'todo',
      title: 'Daily To-Do',
      description: 'Organize study tasks by Physics, Chemistry, or Math categories with custom focus timers.',
      icon: CheckSquare,
      iconBox: 'bg-blue-50 text-blue-600',
      statLabel: 'Today\'s Progress',
      statValue: '75%',
      statDetail: '3 of 4 completed',
      progress: 75
    },
    {
      id: 'streak',
      title: 'Study Streak',
      description: 'Visual stats and fire streaks to keep your momentum high every single day.',
      icon: Flame,
      iconBox: 'bg-orange-50 text-orange-600',
      statLabel: 'Active Streak',
      statValue: '12',
      statDetail: 'DAY STREAK 🔥',
      progress: null
    },
    {
      id: 'rooms',
      title: 'Buddy Rooms',
      description: 'Join virtual focus rooms with classmates and study together with live lofi music.',
      icon: Users,
      iconBox: 'bg-indigo-50 text-indigo-600',
      statLabel: 'Active Buddies',
      statValue: '8 Online',
      statDetail: '+5 in Late Night Room',
      progress: null
    },
    {
      id: 'leaderboard',
      title: 'Leaderboard',
      description: 'Weekly rankings and points to see who is leading study hours in your class.',
      icon: Trophy,
      iconBox: 'bg-yellow-50 text-yellow-600',
      statLabel: 'Global Class Rank',
      statValue: '#42',
      statDetail: '1,420 Study Points',
      progress: null
    },
    {
      id: 'countdown',
      title: 'Exam Count',
      description: 'Never miss a crucial deadline with smart countdown widgets for CBSE Boards & JEE.',
      icon: Hourglass,
      iconBox: 'bg-red-50 text-red-600',
      statLabel: 'Deadline Active',
      statValue: '42',
      statDetail: 'DAYS TO BOARDS',
      progress: null
    }
  ];

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full">
            All-In-One Productivity
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Built for Student Success
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Distraction-free tools designed to help Class 12 students plan tasks, study in groups, and stay motivated.
          </p>
        </div>

        {/* Feature Cards Grid matching Sleek Interface Theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {featureList.map((feature) => {
            const Icon = feature.icon;
            
            return (
              <div
                key={feature.id}
                className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all flex flex-col gap-4 justify-between"
              >
                <div className="space-y-3">
                  <div className={`w-12 h-12 ${feature.iconBox} rounded-2xl flex items-center justify-center font-bold shadow-xs`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg">{feature.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Footer Stat Bar matching Theme layout */}
                <div className="mt-auto pt-4 border-t border-slate-100">
                  {feature.progress !== null ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 rounded-full" 
                          style={{ width: `${feature.progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">{feature.statValue}</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900">{feature.statValue}</span>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md">
                        {feature.statDetail}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
