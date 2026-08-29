import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Search, BookOpen, ExternalLink, Sparkles, CheckCircle2, BookMarked, ArrowRight, DownloadCloud, FileText } from 'lucide-react';
import { api } from '../lib/api';
import { db } from '../lib/db';
import { BookEntity } from '../types';
import { cleanBinaryToText } from '../lib/fileParser';

export default function SearchAgentScreen() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'all' | 'books' | 'news'>('books');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    answer: string;
    readableText?: string;
    bookMetadata?: { title: string; author: string };
    directBooks?: Array<{ title: string; author: string; downloadUrl?: string; source: string }>;
    sources: { title: string; uri: string }[];
    query: string;
    timestamp: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingBook, setImportingBook] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const navigate = useNavigate();

  const suggestedQueries = [
    { title: 'Pride and Prejudice', query: 'Pride and Prejudice by Jane Austen full text', mode: 'books' as const },
    { title: 'Alice in Wonderland', query: 'Alice in Wonderland Lewis Carroll full text', mode: 'books' as const },
    { title: 'Ponniyin Selvan', query: 'Ponniyin Selvan Kalki full story chapters', mode: 'books' as const },
    { title: 'The Art of War', query: 'The Art of War Sun Tzu full translated text', mode: 'books' as const },
  ];

  async function handleSearch(e?: React.FormEvent, customQuery?: string, customMode?: 'all' | 'books' | 'news', autoOpenReader: boolean = false) {
    if (e) e.preventDefault();
    const searchQuery = customQuery || query;
    const searchMode = customMode || mode;

    if (!searchQuery.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);
    setImportStatus(null);

    try {
      const res = await api.searchAgent(searchQuery, searchMode);
      setResult(res);

      // If user searched for a specific book title and readable content or direct link was fetched, offer or auto-launch direct import
      if (searchMode === 'books' && autoOpenReader) {
        if (res.directBooks && res.directBooks.length > 0 && res.directBooks[0].downloadUrl) {
          await importDirectBookUrl(res.directBooks[0].downloadUrl, res.directBooks[0].title, res.directBooks[0].author);
        } else if (res.readableText && res.readableText.length > 150) {
          await importReadableTextAsBook(res.bookMetadata?.title || searchQuery, res.bookMetadata?.author || "Public Domain Author", res.readableText);
        }
      }
    } catch (err: any) {
      console.error("Search agent error:", err);
      setError(err?.message || "Failed to complete book search. Please check network connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Import directly from Gutenberg or Archive.org raw text link
  async function importDirectBookUrl(downloadUrl: string, title: string, author: string) {
    setImportingBook(true);
    setImportStatus(`Fetching full readable text from open-source archive...`);
    try {
      const fetched = await api.fetchBookUrl(downloadUrl, title);
      const rawText = fetched.content || "";
      const cleaned = cleanBinaryToText(rawText);

      await importReadableTextAsBook(title, author, cleaned || rawText);
    } catch (err: any) {
      console.error("Direct fetch failed, fallback to text import:", err);
      // Fallback to importing text from search agent
      if (result?.readableText) {
        await importReadableTextAsBook(title, author, result.readableText);
      } else {
        setError(`Could not download full text: ${err?.message || "Check connection"}`);
        setImportingBook(false);
      }
    }
  }

  // Parses raw book text into pages and immediately launches the Reader
  async function importReadableTextAsBook(title: string, author: string, rawText: string) {
    setImportingBook(true);
    setImportStatus(`Formatting chapters and launching Reader & Translator...`);
    try {
      // Split raw text into readable pages (approx 2000 characters or 3-4 paragraphs per page)
      const paragraphs = rawText
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const pages: string[] = [];
      let currentPage: string[] = [];
      let currentLen = 0;

      for (const p of paragraphs) {
        currentPage.push(p);
        currentLen += p.length;
        if (currentLen >= 1500) {
          pages.push(currentPage.join("\n\n"));
          currentPage = [];
          currentLen = 0;
        }
      }
      if (currentPage.length > 0) {
        pages.push(currentPage.join("\n\n"));
      }

      if (pages.length === 0) {
        pages.push(rawText);
      }

      const newBook: BookEntity = {
        id: Date.now(),
        title: title || query || "Imported E-Book",
        author: author || "Open Source Archive",
        filePath: `web_search_${Date.now()}`,
        fileType: 'WEB_IMPORT',
        language: 'en',
        lastReadPageIndex: 0,
        totalPages: Math.max(1, pages.length),
        coverBg: 'from-emerald-700 to-teal-900',
        description: `Full book import (${pages.length} pages) • Open-Source Public Domain`,
        addedTimestamp: Date.now(),
        category: 'Web Discovery',
        chapters: [
          {
            title: title || 'Full Book Content',
            pages: pages
          }
        ],
        fullContent: rawText
      };

      await db.saveBook(newBook);
      setImportStatus(`Success! Opening "${newBook.title}" in Dual Reader...`);
      setTimeout(() => {
        navigate(`/reader/${newBook.id}`);
      }, 800);
    } catch (err) {
      console.error("Import error:", err);
      setError("Failed to import book into reader.");
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
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Open-Source E-Book & Literature Search</h1>
              <p className="text-xs text-gray-500 font-medium">Direct full-text book search & instant import to Reader</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Search Mode Toggle & Input */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Search Engine Mode:</span>
            <div className="flex gap-2">
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
                Full Books & Gutenberg
              </button>

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
                Literature Discussion & Facts
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
                placeholder="Search full book title (e.g. 'Pride and Prejudice', 'Wings of Fire', 'The Odyssey')..."
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
                  Searching Open Catalogs...
                </>
              ) : (
                <>
                  <Globe className="w-4 h-4" />
                  Fetch Readable Book
                </>
              )}
            </button>
          </form>

          {/* Quick Prompts */}
          <div className="pt-2">
            <span className="text-[11px] font-medium text-gray-400 block mb-2">Instant Classic Book Titles:</span>
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

        {/* Notifications & Error Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/40 text-red-600 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-red-800 dark:text-red-200">Search Notice</h4>
                <p className="text-xs">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSearch()}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 transition-colors shadow-xs"
            >
              Retry
            </button>
          </div>
        )}

        {importStatus && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium flex items-center gap-2 animate-pulse">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Direct Open-Source Book Downloads from Gutenberg / OpenLibrary */}
        {result && result.directBooks && result.directBooks.length > 0 && (
          <div className="bg-[var(--surface)] border border-emerald-500/30 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <DownloadCloud className="w-4 h-4" />
                Available Full-Text E-Books Ready for Reader:
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {result.directBooks.map((book, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)] flex flex-col justify-between gap-3 hover:border-emerald-500 transition-all"
                >
                  <div>
                    <h4 className="font-bold text-sm text-[var(--foreground)] line-clamp-1">{book.title}</h4>
                    <p className="text-xs text-gray-500">By {book.author} • <span className="text-emerald-600 dark:text-emerald-400 font-medium">{book.source}</span></p>
                  </div>
                  <button
                    type="button"
                    disabled={importingBook}
                    onClick={() => {
                      if (book.downloadUrl) {
                        importDirectBookUrl(book.downloadUrl, book.title, book.author);
                      } else if (result.readableText) {
                        importReadableTextAsBook(book.title, book.author, result.readableText);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Open in Dual Reader & Translator</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Readable Book Content</span>
                </div>
                <button
                  onClick={() => importReadableTextAsBook(result.bookMetadata?.title || result.query, result.bookMetadata?.author || "Author", result.readableText || result.answer)}
                  disabled={importingBook}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  <FileText className="w-4 h-4" />
                  {importingBook ? "Importing to Reader..." : "Read Now in Dual Reader"}
                </button>
              </div>

              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-line text-[var(--foreground)] max-h-96 overflow-y-auto p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                {result.readableText || result.answer}
              </div>

              {/* Direct Read Action Card */}
              <div className="mt-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Ready for line-by-line translation and TTS?</h4>
                    <p className="text-[11px] text-gray-500">Automatically parses text into paginated bilingual Kindle reader format.</p>
                  </div>
                </div>
                <button
                  onClick={() => importReadableTextAsBook(result.bookMetadata?.title || result.query, result.bookMetadata?.author || "Author", result.readableText || result.answer)}
                  disabled={importingBook}
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <span>Open in Reader</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sources & Citations */}
            {result.sources && result.sources.length > 0 && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-500" />
                  Open Repositories & Archives ({result.sources.length}):
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
