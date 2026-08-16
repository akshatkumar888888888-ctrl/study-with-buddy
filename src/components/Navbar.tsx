import React, { useState } from 'react';
import { BookOpen, Award, Menu, X } from 'lucide-react';
import { signInWithGoogle } from '../utils/supabase';
import { User } from '@supabase/supabase-js';

interface NavbarProps {
  authUser: User | null;
}

/**
 * Navbar Component
 *
 * Now a lightweight top bar for the single-page Dashboard app:
 * - Logo
 * - Quick jump to the Leaderboard section
 * - Sign-in / signed-in-as indicator
 */
export const Navbar: React.FC<NavbarProps> = ({ authUser }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Handle the Sign In click: trigger real Supabase Google OAuth.
  // On success, the browser redirects to Google then back to this site —
  // no further action needed here. On failure, surface the real error.
  const handleSignIn = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      console.error("Sign in failed:", error.message);
      setAuthError(error.message);
      setTimeout(() => setAuthError(null), 5000);
    }
    // On success, signInWithOAuth redirects the browser away immediately —
    // nothing else to do here.
  };

  const scrollToLeaderboard = () => {
    document.getElementById('leaderboard-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-100 transition-all">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="flex items-center justify-between h-20">

          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
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
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
            <button
              onClick={scrollToLeaderboard}
              className="hover:text-indigo-600 transition-colors flex items-center gap-1"
            >
              <Award className="w-4 h-4" />
              Leaderboard 🏆
            </button>
          </nav>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center gap-4">
            {authUser ? (
              <span className="text-sm font-semibold text-slate-700 px-2 py-1">
                {authUser.user_metadata?.full_name || authUser.email}
              </span>
            ) : (
              <button
                onClick={handleSignIn}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                Sign in with Google
              </button>
            )}
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
              scrollToLeaderboard();
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 rounded-xl text-base font-medium text-slate-700 flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            Leaderboard
          </button>
          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            {authUser ? (
              <span className="w-full text-slate-700 font-semibold py-2 text-center">
                {authUser.user_metadata?.full_name || authUser.email}
              </span>
            ) : (
              <button
                onClick={() => {
                  handleSignIn();
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-full shadow-lg shadow-indigo-100 text-center"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}

      {/* Auth Error Toast — only shown if sign-in actually fails */}
      {authError && (
        <div className="fixed bottom-6 right-6 z-50 bg-red-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-red-800">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
          <div className="text-sm">
            <p className="font-semibold">Sign in failed</p>
            <p className="text-xs text-red-200">{authError}</p>
          </div>
        </div>
      )}
    </header>
  );
};
