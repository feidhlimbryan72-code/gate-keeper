import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Registration from './pages/Registration';
import Scanner from './pages/Scanner';
import DigitalId from './pages/DigitalId';
import DesktopAdmin from './pages/DesktopAdmin';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import InductionFlow from './pages/InductionFlow';
import { initMockData } from './lib/db';
import { supabase } from './lib/supabase';
import { QrCode, ShieldCheck, UserPlus, Monitor, HardHat } from 'lucide-react';

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
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Track auth session for rendering header state and guard status
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

  // Worker Auto-Bookmark Redirection
  useEffect(() => {
    // If not logged in as a guard, on '/' route, and has a registered ID, auto-redirect to their ID card
    if (!user && location.pathname === '/') {
      const savedId = localStorage.getItem('my_worker_id');
      if (savedId) {
        navigate(`/id/${savedId}`, { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

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
          <Route path="/induction/:eventId/:userId" element={<InductionFlow />} />
          <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
        </Routes>
      </main>

      <Navigation user={user} />
    </div>
  );
}

function Navigation({ user }) {
  const location = useLocation();
  const myWorkerId = localStorage.getItem('my_worker_id');
  
  // Compute navigation items dynamically based on role
  let navItems = [];
  
  if (user) {
    // Security Officer navigation
    navItems = [
      { path: `/id/${user.id}`, icon: HardHat, label: 'My ID' },
      { path: '/scanner', icon: QrCode, label: 'Guard Scan' },
    ];
  } else {
    // General Operative navigation
    navItems = [
      { path: '/', icon: UserPlus, label: 'Register' },
    ];
    if (myWorkerId) {
      navItems.push({ path: `/id/${myWorkerId}`, icon: HardHat, label: 'My ID' });
    }
  }

  // If there's no navigation items, don't render the bar
  if (navItems.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50 border-t border-gray-800">
      <div className="max-w-md mx-auto flex justify-around relative">
        
        {navItems.map((item) => {
          const isIdTab = item.path.startsWith('/id');
          const isCurrentUrlId = location.pathname.startsWith('/id') || location.pathname.startsWith('/induction');
          const isItemActive = isIdTab ? isCurrentUrlId : (location.pathname === item.path);
          
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-all duration-200 relative ${
                isItemActive ? 'text-yellow-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {isItemActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-yellow-400 rounded-b-full shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
              )}
              <Icon className={`w-6 h-6 mt-1 transition-transform ${isItemActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default App;
