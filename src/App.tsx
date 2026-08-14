import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Dashboard } from './components/Dashboard';
import { Footer } from './components/Footer';
import { supabase, isSupabaseConfigured, captureGoogleTokensOnSignIn } from './utils/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Main App Component for "Study with Buddy"
 * 
 * Equivalent Next.js App Router Structure:
 * - app/layout.tsx  -> Root layout wrapper (Navbar, main container, Footer)
 * - app/page.tsx    -> Home landing page (Hero, Features, CTAs)
 * - app/dashboard/page.tsx -> Interactive Dashboard view
 */
export default function App() {
  // Navigation view state: 'home' | 'dashboard'
  const [currentView, setCurrentView] = useState<'home' | 'dashboard'>('home');

  // Single source of truth for auth state, shared by Navbar and Dashboard.
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // On mount (including right after the Google OAuth redirect back to
    // this site), check for an existing session.
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user);
      // If we just landed here already signed in, jump straight to the dashboard.
      if (user) setCurrentView('dashboard');
    });

    // Keep auth state in sync for the lifetime of the app (login, logout,
    // token refresh, etc).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthUser(session?.user ?? null);
      if (session?.user) setCurrentView('dashboard');

      // Right after Google sign-in, grab the refresh token (if this session has
      // one) and hand it to the backend so Calendar/Tasks sync can work later.
      if (event === 'SIGNED_IN' && session) {
        captureGoogleTokensOnSignIn({
          provider_token: (session as any).provider_token,
          provider_refresh_token: (session as any).provider_refresh_token,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        authUser={authUser}
      />

      {/* Main View Switching */}
      <main className="flex-1">
        {currentView === 'home' ? (
          <>
            <Hero onGetStarted={() => setCurrentView('dashboard')} />
            <Features onSelectFeature={() => setCurrentView('dashboard')} />
          </>
        ) : (
          <Dashboard onBackToHome={() => setCurrentView('home')} authUser={authUser} />
        )}
      </main>

      {/* Global Footer */}
      <Footer />

    </div>
  );
}
