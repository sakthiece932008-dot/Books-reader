import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Library, Globe, Brain, Sparkles, CheckCircle2, User as UserIcon } from 'lucide-react';
import LibraryScreen from './screens/LibraryScreen';
import ReaderScreen from './screens/ReaderScreen';
import VocabularyScreen from './screens/VocabularyScreen';
import TutorScreen from './screens/TutorScreen';
import SearchAgentScreen from './screens/SearchAgentScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import NetworkStatusBar from './components/NetworkStatusBar';
import ErrorBoundary from './components/ErrorBoundary';
import LoginModal from './components/LoginModal';

function AppContent() {
  const location = useLocation();
  const isReader = location.pathname.startsWith('/reader');
  const { user, setShowLoginModal } = useAuth();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)] relative">
      <NetworkStatusBar />
      <LoginModal />

      {!isReader && (
        <header className="bg-[var(--surface)] border-b border-[var(--border)] px-4 py-2.5 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-[var(--foreground)]">Polyglot Reader</span>
            <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">
              Bilingual AI Companion
            </span>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] rounded-full pl-2 pr-3 py-1 hover:border-indigo-500 transition-colors"
                title="Account Settings"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {user.name[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold">
                  <span className="max-w-[130px] truncate">{user.email}</span>
                  {user.verified && (
                    <span title="Verified Account">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    </span>
                  )}
                </div>
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In / Verify</span>
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
          <Route path="*" element={<LibraryScreen />} />
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
    <ErrorBoundary>
      <NetworkProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}

export default App;
