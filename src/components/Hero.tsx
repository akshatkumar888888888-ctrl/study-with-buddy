import React from 'react';
import { ArrowRight, Flame, Users, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

/**
 * Hero Section Component
 * Equivalent in Next.js: app/components/Hero.tsx
 * 
 * Includes:
 * - Headline: "Study with Buddy"
 * - Subtitle: "Track your daily tasks, study with friends, and stay motivated."
 * - "Get Started" CTA button navigating to /dashboard
 * - Visual interactive feature preview card
 */
export const Hero: React.FC<HeroProps> = ({ onGetStarted }) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/50 via-indigo-50/20 to-white pt-12 pb-16 md:pt-16 md:pb-24">
      {/* Decorative theme background blur shapes */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            
            {/* Badge */}
            <span className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider rounded-full shadow-xs">
              New: Global Study Rooms Now Open
            </span>

            {/* Main Title */}
            <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Study with <span className="text-indigo-600">Buddy</span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Track your daily tasks, study with friends, and stay motivated. The ultimate companion for high-school productivity.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-xl shadow-indigo-200 transition-all hover:shadow-indigo-300 active:scale-95 inline-flex items-center justify-center gap-2"
              >
                <span>Start Your Streak</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <a
                href="#features"
                className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-2xl text-lg font-bold hover:border-indigo-200 transition-colors inline-flex items-center justify-center"
              >
                <span>Watch Demo</span>
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="pt-8 border-t border-slate-100 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              <div>
                <p className="text-2xl font-black text-slate-900">12,400+</p>
                <p className="text-xs text-slate-500 font-medium">Active Students</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">98.4%</p>
                <p className="text-xs text-slate-500 font-medium">Task Completion</p>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">42 Days</p>
                <p className="text-xs text-slate-500 font-medium">To Board Exams</p>
              </div>
            </div>

          </div>

          {/* Right Visual Preview Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Outer Sleek Interface Glass Container */}
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative z-10 space-y-5">
                
                {/* Header Preview */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-xs">
                      AK
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Welcome back, Akshat!</p>
                      <p className="text-xs text-slate-500">Class 12 - CBSE Board Prep</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100">
                    <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                    <span>7 Day Streak</span>
                  </div>
                </div>

                {/* Exam Countdown Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white p-4.5 rounded-2xl shadow-md flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Upcoming Exam</span>
                    <h4 className="text-sm font-bold mt-0.5">CBSE Class 12 Physics</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black block leading-tight">42 Days</span>
                    <span className="text-[10px] text-indigo-200 font-medium">Countdown Active</span>
                  </div>
                </div>

                {/* Daily To-Do Mini Card */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Today's Study Plan</span>
                    <span className="text-xs font-medium text-indigo-600">3 of 4 Completed</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50/80 border border-emerald-100 rounded-2xl flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium text-slate-800 line-through opacity-80">Solve 15 Optics numericals</span>
                      <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Physics</span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-500 shrink-0"></div>
                      <span className="text-xs font-medium text-slate-800">Organic Chemistry reaction mechanisms</span>
                      <span className="ml-auto text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Chemistry</span>
                    </div>
                  </div>
                </div>

                {/* Live Room Teaser */}
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-100/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">R</div>
                      <div className="w-7 h-7 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">P</div>
                      <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">S</div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Late Night Math Grind</p>
                      <p className="text-[10px] text-slate-500">4 friends studying now</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 bg-white px-2.5 py-1 rounded-full border border-indigo-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Room
                  </span>
                </div>

              </div>

              {/* Accent backdrop */}
              <div className="absolute -bottom-3 -left-3 w-full h-full bg-indigo-100/60 rounded-3xl -z-10"></div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
