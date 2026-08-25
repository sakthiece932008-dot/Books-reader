import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Search, BookOpen, ExternalLink, Sparkles, CheckCircle2, PlusCircle, Newspaper, BookMarked, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { db } from '../lib/db';
import { BookEntity } from '../types';

export default function SearchAgentScreen() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'all' | 'books' | 'news'>('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    answer: string;
    sources: { title: string; uri: string }[];
    query: string;
    timestamp: string;
  } | null>(null);
  const [importingBook, setImportingBook] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  const navigate = useNavigate();

  const suggestedQueries = [
    { title: 'Find Classics', query: 'Search for famous public domain literature books and summaries', mode: 'books' as const },
    { title: 'Latest Book News', query: 'What are recent awards and news in global literature this year?', mode: 'news' as const },
    { title: 'Tamil Epics History', query: 'Fact check historical origins of Ponniyin Selvan and Chola dynasty', mode: 'all' as const },
    { title: 'Learn Modern Fiction', query: 'Top rated modern translated novels to read', mode: 'books' as const },
  ];

  async function handleSearch(e?: React.FormEvent, customQuery?: string, customMode?: 'all' | 'books' | 'news') {
    if (e) e.preventDefault();
    const searchQuery = customQuery || query;
    const searchMode = customMode || mode;

    if (!searchQuery.trim()) return;

    setLoading(true);
    setResult(null);
    setImportSuccess(null);

    try {
      const res = await api.searchAgent(searchQuery, searchMode);
      setResult(res);
    } catch (err) {
      console.error("Search agent error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function importSearchAsBook(title: string, author: string, summary: string) {
    setImportingBook(true);
    try {
      const newBook: BookEntity = {
        id: Date.now(),
        title: title || query || "Discovered Book",
        author: author || "Google Search Discovery",
        filePath: `web_search_${Date.now()}`,
        fileType: 'WEB_IMPORT',
        language: 'en',
        lastReadPageIndex: 0,
        totalPages: 2,
        coverBg: 'from-emerald-700 to-teal-900',
        description: summary.slice(0, 180) + '...',
        addedTimestamp: Date.now(),
        category: 'Web Discovery',
        chapters: [
          {
            title: 'Overview & Key Chapters',
            pages: [
              `Book Discovery via Google Realtime Agent:\n"${title}" by ${author}\n\n${summary}`,
              `Chapter 1: Principles & Literary Insights\n\nReading and exploring timeless ideas across cultures. Use PolyGlot Reader's dual-language translation bar, phonetic transliterator, and AI tutor for deep learning.`
            ]
          }
        ],
        fullContent: `${title}\nBy ${author}\n\n${summary}`
      };

      await db.saveBook(newBook);
      setImportSuccess(`Successfully imported "${newBook.title}" to your Library!`);
      setTimeout(() => {
        navigate(`/reader/${newBook.id}`);
      }, 1200);
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setImportingBook(false);
    }
  }

  return (
    <div className="min-h-full pb-20 bg-[var(--background)]">
      {/* Header Bar */}
      <div className="sticky top-0 z-30 bg-[var(--surface)]/95 backdrop-blur border-b border-[var(--border)] px-4 py-4 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Real-Time Google Search Agent</h1>
              <p className="text-xs text-gray-500 font-medium">Live news, literature search, fact-checking & web citations</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Search Mode Toggle & Input */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Agent Capability:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  mode === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[var(--background)] border border-[var(--border)] text-gray-600 hover:text-gray-900 dark:text-gray-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                All / Fact-Check
              </button>

              <button
                type="button"
                onClick={() => setMode('books')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  mode === 'books'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[var(--background)] border border-[var(--border)] text-gray-600 hover:text-gray-900 dark:text-gray-300'
                }`}
              >
                <BookMarked className="w-3.5 h-3.5" />
                Search & Import Books
              </button>

              <button
                type="button"
                onClick={() => setMode('news')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  mode === 'news'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-[var(--background)] border border-[var(--border)] text-gray-600 hover:text-gray-900 dark:text-gray-300'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                Current News
              </button>
            </div>
          </div>

          <form onSubmit={(e) => handleSearch(e)} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  mode === 'books'
                    ? "Search for books, classical authors, summaries..."
                    : mode === 'news'
                    ? "Search recent news, literary awards, current events..."
                    : "Ask anything, discuss current events, or fact check facts..."
                }
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Searching Live Web...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Search Web
                </>
              )}
            </button>
          </form>

          {/* Quick Prompts */}
          <div className="pt-2">
            <span className="text-[11px] font-medium text-gray-400 block mb-2">Suggested Agent Searches:</span>
            <div className="flex flex-wrap gap-2">
              {suggestedQueries.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(item.query);
                    setMode(item.mode);
                    handleSearch(undefined, item.query, item.mode);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-gray-600 dark:text-gray-300 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        {importSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{importSuccess} Opening Reader...</span>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Grounded Response</span>
                </div>
                {mode === 'books' && (
                  <button
                    onClick={() => importSearchAsBook(result.query, "Search Discovery", result.answer)}
                    disabled={importingBook}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <PlusCircle className="w-4 h-4" />
                    {importingBook ? "Importing..." : "Import as Ebook to Reader"}
                  </button>
                )}
              </div>

              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line text-[var(--foreground)]">
                {result.answer}
              </div>

              {/* Action card to read in reader */}
              <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Want to read this in PolyGlot Kindle?</h4>
                    <p className="text-[11px] text-gray-500">Convert search answers into a translated book chapter instantly.</p>
                  </div>
                </div>
                <button
                  onClick={() => importSearchAsBook(result.query, "Google Search Agent", result.answer)}
                  disabled={importingBook}
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <span>Create Ebook</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sources & Citations */}
            {result.sources && result.sources.length > 0 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-500" />
                  Verified Real-Time Web Sources ({result.sources.length}):
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {result.sources.map((src, idx) => (
                    <a
                      key={idx}
                      href={src.uri}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] hover:border-indigo-500 transition-all text-xs group"
                    >
                      <span className="font-medium text-gray-700 dark:text-gray-200 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                        {src.title}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
