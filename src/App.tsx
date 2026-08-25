import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Library, Globe, Brain, Sparkles, CheckCircle2, User as UserIcon, LogOut } from 'lucide-react';
import LibraryScreen from './screens/LibraryScreen';
import ReaderScreen from './screens/ReaderScreen';
import VocabularyScreen from './screens/VocabularyScreen';
import TutorScreen from './screens/TutorScreen';
import SearchAgentScreen from './screens/SearchAgentScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';

function AppContent() {
  const location = useLocation();
  const isReader = location.pathname.startsWith('/reader');
  const { user, setShowLoginModal, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)] relative">
      <LoginModal />

      {!isReader && (
        <header className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-[var(--foreground)]">PolyGlot Reader</span>
            <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full">
              தமிழ் Live Translator
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-full pl-2 pr-3 py-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user.name[0]?.toUpperCase()}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <span className="max-w-[120px] truncate">{user.email}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Google Verified Account" />
                </div>
                <button
                  onClick={logout}
                  className="p-1 hover:text-red-500 transition-colors ml-1"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Google OAuth Sign In</span>
              </button>
            )}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<LibraryScreen />} />
          <Route path="/library" element={<LibraryScreen />} />
          <Route path="/reader/:bookId" element={<ReaderScreen />} />
          <Route path="/vocabulary" element={<VocabularyScreen />} />
          <Route path="/tutor" element={<TutorScreen />} />
          <Route path="/search-agent" element={<SearchAgentScreen />} />
        </Routes>
      </main>
      
      {!isReader && (
        <nav className="flex-none bg-[var(--surface-hover)] border-t border-[var(--border)]">
          <ul className="flex justify-around items-center h-16">
            <li>
              <Link 
                to="/library" 
                className={`flex flex-col items-center justify-center w-full h-full p-2 ${
                  location.pathname === '/library' || location.pathname === '/' 
                    ? 'text-[var(--primary)] font-semibold' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Library className="w-6 h-6 mb-1" />
                <span className="text-xs">Library</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/search-agent" 
                className={`flex flex-col items-center justify-center w-full h-full p-2 ${
                  location.pathname === '/search-agent' 
                    ? 'text-[var(--primary)] font-semibold' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Globe className="w-6 h-6 mb-1" />
                <span className="text-xs">Search Agent</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/vocabulary" 
                className={`flex flex-col items-center justify-center w-full h-full p-2 ${
                  location.pathname === '/vocabulary' 
                    ? 'text-[var(--primary)] font-semibold' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Brain className="w-6 h-6 mb-1" />
                <span className="text-xs">Vocabulary</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/tutor" 
                className={`flex flex-col items-center justify-center w-full h-full p-2 ${
                  location.pathname === '/tutor' 
                    ? 'text-[var(--primary)] font-semibold' 
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Sparkles className="w-6 h-6 mb-1" />
                <span className="text-xs">AI Tutor</span>
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
