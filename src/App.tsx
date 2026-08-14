import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Dashboard } from './components/Dashboard';
import { Footer } from './components/Footer';

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

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Navigation Header */}
      <Navbar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Main View Switching */}
      <main className="flex-1">
        {currentView === 'home' ? (
          <>
            <Hero onGetStarted={() => setCurrentView('dashboard')} />
            <Features onSelectFeature={() => setCurrentView('dashboard')} />
          </>
        ) : (
          <Dashboard onBackToHome={() => setCurrentView('home')} />
        )}
      </main>

      {/* Global Footer */}
      <Footer />

    </div>
  );
}
