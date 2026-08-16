import React from 'react';
import { BookOpen, Heart } from 'lucide-react';

/**
 * Footer Component
 * Equivalent in Next.js: app/components/Footer.tsx
 */
export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight block">
                Study with Buddy
              </span>
              <span className="text-xs text-slate-400">
                Class 12 Study Hub & Goal Tracker
              </span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a href="#leaderboard-section" className="hover:text-white transition-colors">Leaderboard</a>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>Built for student success</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Class 12 Board Prep</span>
          </div>

        </div>
      </div>
    </footer>
  );
};
