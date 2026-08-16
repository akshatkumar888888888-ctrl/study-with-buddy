import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { Footer } from './components/Footer';
import { supabase, isSupabaseConfigured, captureGoogleTokensOnSignIn } from './utils/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Main App Component for "Study with Buddy"
 *
 * The app is now a single dashboard experience — there is no separate
 * marketing/home page. Signing in (or not) both land straight on the
 * Dashboard.
 */
export default function App() {
  // Single source of truth for auth state, shared by Navbar and Dashboard.
  const [authUser, setAuthUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // On mount (including right after the Google OAuth redirect back to
    // this site), check for an existing session.
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user);
    });

    // Keep auth state in sync for the lifetime of the app (login, logout,
    // token refresh, etc).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthUser(session?.user ?? null);

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
      <Navbar authUser={authUser} />

      {/* Dashboard is the whole app now */}
      <main className="flex-1">
        <Dashboard authUser={authUser} />
      </main>

      {/* Global Footer */}
      <Footer />

    </div>
  );
}
