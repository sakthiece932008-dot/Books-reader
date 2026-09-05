import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Book as BookIcon, Globe, Upload, X, Trash2, BookOpen, Sparkles, Filter, ChevronRight } from 'lucide-react';
import { db } from '../lib/db';
import { BookEntity } from '../types';
import { initialSampleBooks } from '../data/sampleBooks';
import { parseUploadedFile } from '../lib/fileParser';
import { useNetwork } from '../context/NetworkContext';

export default function LibraryScreen() {
  const [books, setBooks] = useState<BookEntity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress'>('recent');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('Processing file...');
  const [bookToDelete, setBookToDelete] = useState<BookEntity | null>(null);
  const [showClearDemoConfirm, setShowClearDemoConfirm] = useState(false);
  const navigate = useNavigate();
  const { showErrorToast, showSuccessToast } = useNetwork();

  useEffect(() => {
    loadBooks();
  }, []);

  async function loadBooks() {
    try {
      const isInitialized = localStorage.getItem('books_initialized');
      let storedBooks = await db.getBooks();
      
      // Seed initial sample books only once on first run
      if (storedBooks.length === 0 && !isInitialized) {
        for (const b of initialSampleBooks) {
          await db.saveBook({ 
            ...b, 
            id: Date.now() + Math.floor(Math.random() * 100000), 
            addedTimestamp: Date.now() 
          });
        }
        localStorage.setItem('books_initialized', 'true');
        storedBooks = await db.getBooks();
      }
      setBooks(storedBooks);
    } catch (err: any) {
      console.error("Failed to load library books:", err);
      showErrorToast("Could not load your local library database. Please refresh the page.", "Library Error");
    }
  }

  async function restoreSampleBooks() {
    try {
      for (const b of initialSampleBooks) {
        await db.saveBook({ 
          ...b, 
          id: Date.now() + Math.floor(Math.random() * 100000), 
          addedTimestamp: Date.now() 
        });
      }
      localStorage.setItem('books_initialized', 'true');
      const updated = await db.getBooks();
      setBooks(updated);
      showSuccessToast("Classic demo library restored successfully.", "Library Updated");
    } catch (err: any) {
      showErrorToast("Failed to restore sample books.", "Operation Failed");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size limit (e.g. 50MB)
    if (file.size > 50 * 1024 * 1024) {
      showErrorToast("File is too large (over 50MB). Please select a smaller document.", "Upload Error");
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadStatus('Reading file bytes...');

    try {
      const parsed = await parseUploadedFile(file, (msg) => {
        setUploadStatus(msg);
      });

      if (!parsed.fullContent || parsed.fullContent.trim().length === 0) {
        throw new Error("No readable text found in this file. Please ensure it contains readable text.");
      }

      const newBook: BookEntity = {
        id: Date.now(),
        title: parsed.title || file.name.replace(/\.[^/.]+$/, ''),
        author: 'User Import',
        filePath: file.name,
        fileType: parsed.fileType,
        language: parsed.language || 'en',
        lastReadPageIndex: 0,
        totalPages: Math.max(1, parsed.totalPages),
        coverBg: 'from-purple-700 to-indigo-900',
        description: `Uploaded file (${parsed.fileType}) • ${parsed.totalPages} page(s)`,
        addedTimestamp: Date.now(),
        category: 'Uploaded Docs',
        chapters: parsed.chapters,
        fullContent: parsed.fullContent
      };
      await db.saveBook(newBook);
      localStorage.setItem('books_initialized', 'true');
      await loadBooks();
      showSuccessToast(`"${newBook.title}" imported successfully!`, "Book Added");
      // Auto open uploaded book
      navigate(`/reader/${newBook.id}`);
    } catch (err: any) {
      console.error("Upload error:", err);
      showErrorToast(err?.message || "Failed to process document. Please check the file format (PDF, TXT, EPUB).", "Import Failed");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  }

  async function handleConfirmDeleteBook() {
    if (!bookToDelete) return;
    try {
      await db.deleteBook(bookToDelete.id);
      localStorage.setItem('books_initialized', 'true');
      setBooks(prev => prev.filter(b => b.id !== bookToDelete.id));
      showSuccessToast(`"${bookToDelete.title}" removed from library.`, "Book Deleted");
      setBookToDelete(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      showErrorToast("Could not delete book from storage.", "Delete Failed");
    }
  }

  async function handleConfirmClearDemoBooks() {
    try {
      const all = await db.getBooks();
      for (const b of all) {
        if (b.fileType === 'SAMPLE') {
          await db.deleteBook(b.id);
        }
      }
      localStorage.setItem('books_initialized', 'true');
      const updated = await db.getBooks();
      setBooks(updated);
      setShowClearDemoConfirm(false);
      showSuccessToast("Demo books cleared.", "Library Updated");
    } catch (err) {
      console.error("Clear demo error:", err);
      showErrorToast("Failed to remove sample books.", "Operation Failed");
    }
  }

  const filterList = ["All", "Tamil Classics", "Foreign Literature", "PDF", "EPUB", "Uploaded Docs"];

  const filteredBooks = books.filter(book => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      book.title.toLowerCase().includes(query) || 
      book.author.toLowerCase().includes(query) ||
      book.description.toLowerCase().includes(query) ||
      (book.category && book.category.toLowerCase().includes(query)) ||
      book.language.toLowerCase().includes(query);

    const matchesFilter = (() => {
      switch (selectedFilter) {
        case 'Tamil Classics': return book.language === 'ta' || book.category === 'Tamil Classics';
        case 'Foreign Literature': return book.category === 'Foreign Literature' || book.language === 'fr' || book.language === 'es';
        case 'PDF': return book.fileType === 'PDF';
        case 'EPUB': return book.fileType === 'EPUB';
        case 'Uploaded Docs': return book.category === 'Uploaded Docs' || book.author === 'User Import';
        default: return true;
      }
    })();

    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'progress') {
      const progA = (a.lastReadPageIndex + 1) / (a.totalPages || 1);
      const progB = (b.lastReadPageIndex + 1) / (b.totalPages || 1);
      return progB - progA;
    }
    return b.addedTimestamp - a.addedTimestamp;
  });

  const recentlyRead = books.slice().sort((a, b) => b.addedTimestamp - a.addedTimestamp)[0];

  return (
    <div className="min-h-full pb-20 bg-[var(--background)]">
      {/* Top Search Header Bar */}
      <div className="sticky top-0 z-30 bg-[var(--surface)]/95 backdrop-blur border-b border-[var(--border)] px-4 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          {/* Logo / Brand Title */}
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight">ClearText Reader</h1>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Multilingual Reader</p>
            </div>
          </div>

          {/* Primary Top Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search library by title, author, Tamil / English keywords..."
              className="w-full pl-10 pr-9 py-2.5 text-sm rounded-full bg-[var(--background)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => navigate('/search-agent')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors shrink-0 shadow-2xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Search</span>
            </button>

            <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--primary)] text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0 shadow-sm">
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? "Uploading..." : "Import Book"}</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.epub,.txt" 
                onChange={handleFileUpload} 
                disabled={isUploading}
              />
            </label>

            {books.some(b => b.fileType === 'SAMPLE') && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowClearDemoConfirm(true);
                }}
                title="Remove sample/demo books"
                className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Banner Card */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-900 via-indigo-950 to-slate-900 text-white p-6 shadow-lg border border-amber-500/20">
          <div className="relative z-10 max-w-lg space-y-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
              <Sparkles className="w-3 h-3" /> Live Gemini Translation
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight">Kindle Reader for Tamil & Classics</h2>
            <p className="text-sm text-white/95 leading-relaxed font-medium">
              Read books with line-by-line parallel translations, Romanized phonetics, and instant word lookup. Supports PDF, TXT, and classical literature.
            </p>
          </div>
        </div>

        {/* Recently Reading Quick Jump (if available) */}
        {recentlyRead && !searchQuery && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-16 rounded-lg bg-gradient-to-br ${recentlyRead.coverBg || 'from-indigo-600 to-purple-800'} flex items-center justify-center text-white shrink-0 shadow-md`}>
                <BookIcon className="w-6 h-6 opacity-90" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Continue Reading</span>
                <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-100 line-clamp-1">{recentlyRead.title}</h3>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{recentlyRead.author} • Page {recentlyRead.lastReadPageIndex + 1} of {recentlyRead.totalPages}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/reader/${recentlyRead.id}`)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors w-full sm:w-auto justify-center shadow-xs"
            >
              <span>Resume</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Category Filters Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
          <div className="flex gap-2 overflow-x-auto pb-1 w-full sm:w-auto scrollbar-none">
            {filterList.map(filter => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedFilter === filter 
                    ? 'bg-[var(--primary)] text-white shadow-xs' 
                    : 'bg-[var(--surface)] border border-[var(--border)] text-gray-600 dark:text-gray-300 hover:bg-[var(--surface-hover)]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 self-end sm:self-auto shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Sort:</span>
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2 py-1 text-xs focus:outline-none"
            >
              <option value="recent">Recently Added</option>
              <option value="title">Title (A-Z)</option>
              <option value="progress">Reading Progress</option>
            </select>
          </div>
        </div>

        {/* Results Count Summary */}
        <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <span>
            {searchQuery ? `Search results for "${searchQuery}"` : `${selectedFilter} Books`}
          </span>
          <span className="font-semibold">{filteredBooks.length} book(s)</span>
        </div>

        {/* Book Grid */}
        {filteredBooks.length === 0 ? (
          <div className="bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-2xl p-12 text-center space-y-4">
            <BookIcon className="w-12 h-12 text-gray-300 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-gray-700 dark:text-gray-200">No books found</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                {searchQuery ? `No titles or authors match "${searchQuery}". Try a different keyword.` : `No books in category "${selectedFilter}".`}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {searchQuery ? (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold hover:bg-gray-200"
                >
                  Clear Search
                </button>
              ) : (
                <>
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 shadow-sm">
                    <Upload className="w-4 h-4" />
                    Upload Book
                    <input type="file" className="hidden" accept=".pdf,.epub,.txt" onChange={handleFileUpload} />
                  </label>
                  <button
                    onClick={restoreSampleBooks}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Restore Sample Books
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map(book => {
              const progressPct = Math.round(((book.lastReadPageIndex + 1) / (book.totalPages || 1)) * 100);

              return (
                <div 
                  key={book.id}
                  onClick={() => navigate(`/reader/${book.id}`)}
                  className="group relative bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 flex gap-4 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer overflow-hidden"
                >
                  {/* Book Cover Visual */}
                  <div className={`w-20 h-28 rounded-xl bg-gradient-to-br ${book.coverBg || 'from-indigo-600 to-slate-800'} text-white p-2 flex flex-col justify-between shrink-0 shadow-sm relative overflow-hidden`}>
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-extrabold uppercase bg-black/30 backdrop-blur px-1.5 py-0.5 rounded text-white/90">
                        {book.language.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-[11px] font-extrabold line-clamp-2 leading-snug">{book.title}</h4>
                      <p className="text-[9px] text-white/70 truncate">{book.author}</p>
                    </div>
                  </div>

                  {/* Book Metadata & Actions */}
                  <div className="flex flex-col flex-1 min-w-0 justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-sm text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                          {book.title}
                        </h3>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBookToDelete(book);
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors shrink-0"
                          title="Remove book from library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{book.author}</p>
                      <p className="text-[11px] text-gray-400 line-clamp-2 mt-1.5 leading-relaxed">{book.description}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium">
                        <span>Page {book.lastReadPageIndex + 1} / {book.totalPages}</span>
                        <span>{progressPct}% read</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[var(--primary)] h-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, progressPct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PDF Uploading & Processing Indicator Modal */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-[var(--border)] rounded-3xl shadow-2xl p-6 space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900 shadow-inner">
              <Sparkles className="w-7 h-7 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">Importing Document</h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                {uploadStatus}
              </p>
              <p className="text-[11px] text-gray-400 mt-2">
                Extracting and formatting text for offline reading...
              </p>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full w-2/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Single Book Deletion */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Remove Book</h3>
                <p className="text-xs text-gray-500">Are you sure you want to remove this book?</p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 line-clamp-2">{bookToDelete.title}</p>
              <p className="text-[11px] text-gray-500">{bookToDelete.author}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBook}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
              >
                Delete Book
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Clearing Demo Books */}
      {showClearDemoConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Remove Demo Books</h3>
                <p className="text-xs text-gray-500">Remove all built-in sample books from your library?</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              This will clean out sample literature and leave only your imported and web-saved books. You can restore sample books at any time.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearDemoConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearDemoBooks}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors"
              >
                Remove Samples
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
