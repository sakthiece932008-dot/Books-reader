import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Library, Globe, Brain, Sparkles } from 'lucide-react';
import LibraryScreen from './screens/LibraryScreen';
import ReaderScreen from './screens/ReaderScreen';
import VocabularyScreen from './screens/VocabularyScreen';
import TutorScreen from './screens/TutorScreen';
import SearchAgentScreen from './screens/SearchAgentScreen';

function App() {
  const location = useLocation();
  const isReader = location.pathname.startsWith('/reader');

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--background)]">
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

export default App;
