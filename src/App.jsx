import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Registration from './pages/Registration';
import Scanner from './pages/Scanner';
import Dashboard from './pages/Dashboard';
import DigitalId from './pages/DigitalId';
import DesktopAdmin from './pages/DesktopAdmin';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { initMockData } from './lib/db';
import { supabase } from './lib/supabase';
import { QrCode, ShieldCheck, LayoutDashboard, UserPlus, Monitor } from 'lucide-react';

function App() {
  useEffect(() => {
    initMockData();
  }, []);

  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Track auth session for rendering header state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const isFullScreen = location.pathname === '/admin' || location.pathname === '/login';

  if (isFullScreen) {
    return (
      <Routes>
        <Route path="/admin" element={<ProtectedRoute><DesktopAdmin /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-900">
      <header className="bg-gray-900 shadow-lg sticky top-0 z-10 border-b-4 border-yellow-400">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
            <ShieldCheck className="w-7 h-7 text-yellow-400" />
            <span>GATE<span className="text-yellow-400">KEEPER</span></span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-red-400 hover:text-red-300 text-xs font-bold uppercase transition-colors cursor-pointer bg-transparent border-none p-1"
              >
                Log Out
              </button>
            )}
            <Link to="/admin" className="text-white hover:text-yellow-400 transition-colors hidden sm:flex items-center gap-1 text-xs font-bold uppercase" title="Desktop Admin">
              <Monitor className="w-4 h-4" /> Desktop View
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto bg-white shadow-2xl relative pb-24 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Registration />} />
          <Route path="/id/:userId" element={<DigitalId />} />
          <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </main>

      <Navigation />
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', icon: UserPlus, label: 'Register' },
    { path: '/scanner', icon: QrCode, label: 'Guard Scan' },
    { path: '/dashboard', icon: LayoutDashboard, label: 'Admin' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50 border-t border-gray-800">
      <div className="max-w-md mx-auto flex justify-around relative">
        
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/id'));
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-all duration-200 relative ${
                isActive ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-yellow-400 rounded-b-full shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
              )}
              <Icon className={`w-6 h-6 mt-1 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default App;
