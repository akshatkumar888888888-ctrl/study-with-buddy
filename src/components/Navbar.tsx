import React, { useState } from 'react';
import { BookOpen, Users, Calendar, Award, CheckSquare, Menu, X, LogIn, LayoutDashboard } from 'lucide-react';
import { signInWithGoogle } from '../utils/supabase';

interface NavbarProps {
  currentView: 'home' | 'dashboard';
  setCurrentView: (view: 'home' | 'dashboard') => void;
}

/**
 * Navbar Component
 * Equivalent in Next.js: app/components/Navbar.tsx or components/Navbar.tsx
 * 
 * Features:
 * - Logo text "Study with Buddy"
 * - Navigation links to Home and Dashboard
 * - "Sign In" button calling Supabase Google OAuth
 * - Fully responsive for mobile screens
 */
export const Navbar: React.FC<NavbarProps> = ({ currentView, setCurrentView }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthNotice, setShowAuthNotice] = useState(false);

  // Handle the Sign In click as required
  const handleSignIn = async () => {
    // Required action: log "Sign in clicked" to browser console
    console.log("Sign in clicked - Invoking Supabase OAuth");
    
    // Show user-friendly notification
    setShowAuthNotice(true);
    setTimeout(() => setShowAuthNotice(false), 3500);

    // Call Supabase auth Google provider
    await signInWithGoogle();
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-100 transition-all">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo Section */}
          <button 
            onClick={() => setCurrentView('home')} 
            className="flex items-center gap-3 group text-left focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:bg-indigo-700 transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-indigo-900 block leading-none">
                Study with Buddy
              </span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mt-0.5">
                Class 12 Study Hub
              </span>
            </div>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
            <button
              onClick={() => setCurrentView('home')}
              className={`transition-colors hover:text-indigo-600 ${
                currentView === 'home'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-500'
              }`}
            >
              Home
            </button>
            <a
              href="/dashboard"
              className={`flex items-center gap-1.5 transition-colors hover:text-indigo-600 ${
                currentView === 'dashboard'
                  ? 'text-indigo-600 font-bold'
                  : 'text-slate-500'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </a>
            <a
              href="/rooms"
              className="hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <Users className="w-4 h-4" />
              Buddy Rooms 🎧
            </a>
            <a
              href="/leaderboard"
              className="hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <Award className="w-4 h-4" />
              Leaderboard 🏆
            </a>
          </nav>

          {/* Desktop Auth & Get Started Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleSignIn}
              className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors px-2 py-1"
            >
              Sign In
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 px-6 pt-2 pb-6 space-y-3 shadow-xl">
          <button
            onClick={() => {
              setCurrentView('home');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-xl text-base font-medium ${
              currentView === 'home' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              setCurrentView('dashboard');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-xl text-base font-medium flex items-center gap-2 ${
              currentView === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-700'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <a
            href="#features"
            onClick={() => {
              if (currentView === 'dashboard') setCurrentView('home');
              setMobileMenuOpen(false);
            }}
            className="block px-3 py-2 rounded-xl text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Features
          </a>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => {
                handleSignIn();
                setMobileMenuOpen(false);
              }}
              className="w-full text-slate-700 hover:text-indigo-600 font-semibold py-2 text-center"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-full shadow-lg shadow-indigo-100 text-center"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      {/* Auth Toast Notification */}
      {showAuthNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-800 animate-bounce">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
          <div className="text-sm">
            <p className="font-semibold">Sign in clicked!</p>
            <p className="text-xs text-slate-400">Logged to console. Ready for Supabase Auth integration.</p>
          </div>
        </div>
      )}
    </header>
  );
};
