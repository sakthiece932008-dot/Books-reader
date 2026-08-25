import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Bookmark, List, Type, Globe, 
  ChevronLeft, ChevronRight, Volume2, Sparkles, X, Check, 
  Plus, BookOpen, Layers, Maximize2, Minimize2, Share2, HelpCircle
} from 'lucide-react';
import { db } from '../lib/db';
import { api } from '../lib/api';
import { BookEntity, WordEducationalInfo, ReaderTheme, ReaderFont, ReadingMode, BookmarkEntity } from '../types';

export default function ReaderScreen() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  // Book & Content State
  const [book, setBook] = useState<BookEntity | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pages, setPages] = useState<string[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string>('');

  // Reader Settings (Kindle Customizer)
  const [theme, setTheme] = useState<ReaderTheme>('sepia');
  const [font, setFont] = useState<ReaderFont>('serif');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [readingMode, setReadingMode] = useState<ReadingMode>('standard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live Dual Language Translation Cache
  const [liveTranslations, setLiveTranslations] = useState<Record<number, string[]>>({});
  const [isTranslatingPage, setIsTranslatingPage] = useState(false);

  // Audio / Speech State
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Selection & Word Lookup Modal
  const [selectedText, setSelectedText] = useState('');
  const [wordInfo, setWordInfo] = useState<WordEducationalInfo | null>(null);
  const [loadingWord, setLoadingWord] = useState(false);
  const [savedVocab, setSavedVocab] = useState(false);

  // Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkEntity[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Load Book Data
  useEffect(() => {
    async function loadBookData() {
      if (!bookId) return;
      const b = await db.getBook(Number(bookId));
      if (!b) return;

      setBook(b);
      setCurrentPageIndex(b.lastReadPageIndex || 0);

      // Extract Pages & Chapters
      let allPages: string[] = [];
      let currentChapTitle = 'Chapter 1';

      if (b.chapters && b.chapters.length > 0) {
        b.chapters.forEach(chap => {
          allPages.push(...chap.pages);
        });
        currentChapTitle = b.chapters[0].title;
      } else if (b.fullContent) {
        // split by paragraphs or chunk
        allPages = b.fullContent.split('\n\n').filter(p => p.trim().length > 0);
      } else {
        allPages = [
          b.language === 'ta'
            ? "அகர முதல எழுத்தெல்லாம் ஆதி\nபகவன் முதற்றே உலகு.\n\nகற்றதனால் ஆய பயனென்கொல் வாலறிவன்\nநற்றாள் தொழாஅர் எனின்."
            : "Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest. It was a picture of a boa constrictor in the act of swallowing an animal."
        ];
      }

      setPages(allPages);
      setChapterTitle(currentChapTitle);

      // Load bookmarks
      const bms = await db.getBookmarks(b.id);
      setBookmarks(bms);
      setIsBookmarked(bms.some(bm => bm.pageIndex === (b.lastReadPageIndex || 0)));
    }

    loadBookData();
  }, [bookId]);

  // Sync bookmark status when page changes
  useEffect(() => {
    if (book) {
      setIsBookmarked(bookmarks.some(bm => bm.pageIndex === currentPageIndex));
      // Save current page progress to DB
      db.saveBook({ ...book, lastReadPageIndex: currentPageIndex, totalPages: pages.length || 1 });
    }
  }, [currentPageIndex, bookmarks, pages.length]);

  // TTS Speech Synthesis Engine
  useEffect(() => {
    if (isPlaying && pages[currentPageIndex]) {
      window.speechSynthesis.cancel();
      const currentText = pages[currentPageIndex];
      const utterance = new SpeechSynthesisUtterance(currentText);
      utterance.rate = speechRate;
      utterance.lang = book?.language === 'ta' ? 'ta-IN' : 'en-US';
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      window.speechSynthesis.cancel();
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isPlaying, currentPageIndex, pages, speechRate, book]);

  // Live Dual Language Translation Trigger
  useEffect(() => {
    if (readingMode !== 'standard' && pages[currentPageIndex] && !liveTranslations[currentPageIndex]) {
      fetchLiveTranslation(currentPageIndex);
    }
  }, [readingMode, currentPageIndex, pages]);

  async function fetchLiveTranslation(pageIdx: number) {
    const rawPage = pages[pageIdx];
    if (!rawPage) return;
    setIsTranslatingPage(true);

    const paragraphs = rawPage.split('\n').filter(p => p.trim().length > 0);
    const targetLang = book?.language === 'ta' ? 'en' : 'en';

    try {
      const translatedList = await api.translateLive(paragraphs, book?.language || 'auto', targetLang);
      setLiveTranslations(prev => ({
        ...prev,
        [pageIdx]: translatedList
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslatingPage(false);
    }
  }

  // Text Selection & Word Lookup Logic
  async function handleTextSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0 && text.length < 80) {
      setSelectedText(text);
      setLoadingWord(true);
      setSavedVocab(false);

      try {
        const info = await api.getWordDetails(
          text, 
          pages[currentPageIndex]?.substring(0, 150) || "", 
          book?.language || 'en', 
          'en'
        );
        setWordInfo(info);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingWord(false);
      }
    }
  }

  async function handleSaveVocabulary() {
    if (!wordInfo || !book) return;
    await db.saveVocabulary({
      id: Date.now(),
      word: wordInfo.word,
      sourceLanguage: book.language,
      targetLanguage: 'en',
      translation: wordInfo.translation,
      transliteration: wordInfo.transliteration,
      definition: wordInfo.definition,
      exampleSentence: wordInfo.exampleSentence,
      mastered: false,
      addedTimestamp: Date.now()
    });
    setSavedVocab(true);
  }

  async function toggleBookmark() {
    if (!book) return;
    if (isBookmarked) {
      const bm = bookmarks.find(b => b.pageIndex === currentPageIndex);
      if (bm) {
        await db.deleteBookmark(bm.id);
        const updated = await db.getBookmarks(book.id);
        setBookmarks(updated);
      }
    } else {
      const newBm: BookmarkEntity = {
        id: Date.now(),
        bookId: book.id,
        pageIndex: currentPageIndex,
        selectedText: pages[currentPageIndex]?.substring(0, 50) + "...",
        note: `Bookmark on Page ${currentPageIndex + 1}`,
        timestamp: Date.now()
      };
      await db.saveBookmark(newBm);
      const updated = await db.getBookmarks(book.id);
      setBookmarks(updated);
    }
  }

  // Theme Styling Classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'sepia': return 'bg-[#F7F0E6] text-[#3E2723]';
      case 'dark': return 'bg-[#121212] text-[#E0E0E0]';
      case 'mint': return 'bg-[#EBF3ED] text-[#1C3B2B]';
      case 'paper': default: return 'bg-[#FDFDF9] text-[#1A1A1A]';
    }
  };

  const getFontFamily = () => {
    switch (font) {
      case 'sans': return 'font-sans';
      case 'mono': return 'font-mono';
      case 'dyslexic': return 'font-sans tracking-wide space-y-4';
      case 'serif': default: return 'font-serif';
    }
  };

  const activePageText = pages[currentPageIndex] || "End of book content.";
  const paragraphs = activePageText.split('\n').filter(p => p.trim().length > 0);
  const currentTranslations = liveTranslations[currentPageIndex] || [];

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 ${getThemeClasses()}`}>
      
      {/* 1. Kindle Top Header Navigation */}
      <header className={`flex items-center justify-between px-4 py-3 border-b backdrop-blur z-20 ${
        theme === 'dark' ? 'border-gray-800 bg-black/40' : 'border-amber-950/10 bg-white/40'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => navigate('/library')} 
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Return to Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-sm truncate max-w-[180px] sm:max-w-md">{book?.title || 'Kindle Reader'}</h1>
            <p className="text-[10px] opacity-70 truncate">{book?.author} • {chapterTitle}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mode Switcher Badge */}
          <button
            onClick={() => setReadingMode(m => m === 'standard' ? 'dual' : m === 'dual' ? 'interlinear' : 'standard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              readingMode !== 'standard' 
                ? 'bg-[var(--primary)] text-white' 
                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
            }`}
            title="Toggle Live Translation View"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline capitalize">{readingMode} View</span>
          </button>

          {/* Typography Settings Button */}
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Display & Font Settings"
          >
            <Type className="w-5 h-5" />
          </button>

          {/* Bookmarks Toggle */}
          <button 
            onClick={toggleBookmark}
            className={`p-2 rounded-full transition-colors ${isBookmarked ? 'text-amber-500 fill-amber-500' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
            title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
          </button>

          {/* Table of Contents Drawer Toggle */}
          <button 
            onClick={() => setIsTocOpen(!isTocOpen)} 
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title="Table of Contents & Bookmarks"
          >
            <List className="w-5 h-5" />
          </button>

          {/* Ask AI Tutor */}
          <button 
            onClick={() => navigate('/tutor')} 
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[var(--primary)]"
            title="Ask AI Reading Tutor"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Main Kindle Page Reading Canvas */}
      <main 
        ref={readerContainerRef}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
        className="flex-1 overflow-y-auto px-6 py-8 md:px-16 md:py-12 select-text transition-all max-w-3xl mx-auto w-full"
      >
        <div 
          className={`${getFontFamily()} space-y-6 leading-relaxed`}
          style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}
        >
          {readingMode === 'standard' ? (
            /* Standard Reading View */
            <div className="whitespace-pre-wrap leading-relaxed space-y-4">
              {paragraphs.map((para, idx) => (
                <p key={idx} className="first-letter:text-2xl first-letter:font-bold">
                  {para}
                </p>
              ))}
            </div>
          ) : (
            /* Live Dual-Language / Parallel Translation View */
            <div className="space-y-6">
              {isTranslatingPage && currentTranslations.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2 animate-pulse">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Generating live parallel Gemini translation for Page {currentPageIndex + 1}...</span>
                </div>
              )}

              {paragraphs.map((para, idx) => {
                const trans = currentTranslations[idx] || "";
                return (
                  <div key={idx} className="space-y-2 pb-4 border-b border-black/5 dark:border-white/5">
                    {/* Original Source Text */}
                    <p className="font-semibold text-current">{para}</p>
                    
                    {/* Live Parallel Translation */}
                    {trans && (
                      <div className="pl-4 border-l-2 border-[var(--primary)] text-sm opacity-90 font-sans italic space-y-1">
                        <p className="text-[var(--primary)] font-medium">{trans}</p>
                        {book?.language === 'ta' && readingMode === 'interlinear' && (
                          <p className="text-xs opacity-75 not-italic font-mono">
                            Phonetic: {para.split(' ').map(w => w).join(' ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 3. Bottom Kindle Scrubber & Audio Controls Bar */}
      <footer className={`flex flex-col border-t px-4 py-3 z-20 backdrop-blur ${
        theme === 'dark' ? 'border-gray-800 bg-black/60' : 'border-amber-950/10 bg-white/60'
      }`}>
        <div className="max-w-xl mx-auto w-full space-y-2">
          
          {/* Progress Scrubber Slider */}
          <div className="flex items-center gap-3 text-xs font-medium opacity-80">
            <button 
              onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
              disabled={currentPageIndex === 0}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <input 
              type="range" 
              min={0} 
              max={Math.max(0, pages.length - 1)} 
              value={currentPageIndex}
              onChange={e => setCurrentPageIndex(Number(e.target.value))}
              className="flex-1 accent-[var(--primary)] h-1.5 rounded-lg cursor-pointer"
            />

            <button 
              onClick={() => setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1))}
              disabled={currentPageIndex >= pages.length - 1}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Status Meta Info & TTS Audio Controls */}
          <div className="flex items-center justify-between text-xs opacity-80 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-bold">Page {currentPageIndex + 1} of {pages.length || 1}</span>
              <span>•</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                {book?.language?.toUpperCase()}
              </span>
            </div>

            {/* Audio TTS Player Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSpeechRate(r => r === 1.0 ? 1.25 : r === 1.25 ? 1.5 : 1.0)}
                className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/5 dark:bg-white/10 hover:bg-black/10"
                title="Change Speech Speed"
              >
                {speechRate}x
              </button>

              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--primary)] text-white font-semibold shadow-xs hover:bg-indigo-700 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? "Pause Voice" : "Listen TTS"}</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* 4. Display Settings Drawer (Theme, Font, Size, Margins) */}
      {isSettingsOpen && (
        <div className="absolute inset-x-0 top-16 z-40 p-4 animate-in slide-in-from-top duration-200">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-900 border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-5 text-gray-800 dark:text-gray-100">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Type className="w-4 h-4 text-[var(--primary)]" />
                Kindle Display Customizer
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Themes Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Background Theme</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'paper', name: 'Paper', bg: 'bg-[#FDFDF9]', border: 'border-gray-300', text: 'text-gray-900' },
                  { id: 'sepia', name: 'Sepia', bg: 'bg-[#F5EBE1]', border: 'border-amber-300', text: 'text-amber-900' },
                  { id: 'mint', name: 'Mint', bg: 'bg-[#EBF3ED]', border: 'border-emerald-300', text: 'text-emerald-950' },
                  { id: 'dark', name: 'Dark', bg: 'bg-[#121212]', border: 'border-gray-700', text: 'text-white' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as ReaderTheme)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${t.bg} ${t.text} ${
                      theme === t.id ? 'ring-2 ring-[var(--primary)] border-transparent scale-105' : t.border
                    }`}
                  >
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Font Style</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'serif', label: 'Georgia', class: 'font-serif' },
                  { id: 'sans', label: 'Inter', class: 'font-sans' },
                  { id: 'mono', label: 'Mono', class: 'font-mono' },
                  { id: 'dyslexic', label: 'Dyslexic', class: 'font-sans font-bold' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFont(f.id as ReaderFont)}
                    className={`p-2 rounded-xl border text-xs font-medium transition-all ${f.class} ${
                      font === f.id ? 'bg-[var(--primary)] text-white border-transparent' : 'border-gray-200 dark:border-gray-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Control */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Text Size</span>
                <span>{fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold">A</span>
                <input 
                  type="range" 
                  min={14} 
                  max={32} 
                  value={fontSize} 
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-[var(--primary)] h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                />
                <span className="text-lg font-bold">A</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Table of Contents & Bookmarks Drawer */}
      {isTocOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 h-full p-6 shadow-2xl flex flex-col space-y-6 animate-in slide-in-from-right">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-2 font-bold text-lg text-[var(--primary)]">
                <BookOpen className="w-5 h-5" />
                <span>Contents & Saved</span>
              </div>
              <button onClick={() => setIsTocOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Chapters</h4>
                {book?.chapters && book.chapters.length > 0 ? (
                  <div className="space-y-1">
                    {book.chapters.map((chap, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => {
                          setChapterTitle(chap.title);
                          setCurrentPageIndex(cIdx);
                          setIsTocOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                          chapterTitle === chap.title ? 'bg-indigo-50 dark:bg-indigo-900/40 text-[var(--primary)]' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                      >
                        <span className="truncate">{chap.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">Single Chapter Document</p>
                )}
              </div>

              {/* Bookmarks List */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bookmarks ({bookmarks.length})</h4>
                {bookmarks.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">No bookmarks on this book yet.</p>
                ) : (
                  <div className="space-y-2">
                    {bookmarks.map(bm => (
                      <div 
                        key={bm.id} 
                        onClick={() => {
                          setCurrentPageIndex(bm.pageIndex);
                          setIsTocOpen(false);
                        }}
                        className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-[var(--primary)] transition-all"
                      >
                        <div className="flex justify-between items-center text-xs font-bold text-[var(--primary)]">
                          <span>Page {bm.pageIndex + 1}</span>
                          <span className="text-[10px] text-gray-400">{new Date(bm.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mt-1">{bm.selectedText}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Word / Phrase Lookup Sheet (Gemini Educational Popup) */}
      {selectedText && (
        <div className="absolute bottom-20 inset-x-4 z-50 animate-in slide-in-from-bottom duration-200">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-900 border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden text-gray-800 dark:text-gray-100">
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/60 border-b border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--primary)]" />
                <h3 className="font-bold text-sm text-[var(--primary)]">{selectedText}</h3>
              </div>
              <button onClick={() => setSelectedText('')} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {loadingWord ? (
                <div className="flex flex-col items-center justify-center p-6 space-y-2">
                  <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-500 font-medium">Analyzing with Gemini AI...</p>
                </div>
              ) : wordInfo ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Translation</span>
                    <p className="text-base font-bold text-gray-900 dark:text-white mt-0.5">{wordInfo.translation}</p>
                  </div>

                  {wordInfo.transliteration && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phonetic Transliteration</span>
                      <p className="text-xs italic text-indigo-600 dark:text-indigo-400 mt-0.5">{wordInfo.transliteration}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Definition</span>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{wordInfo.definition}</p>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={() => {
                        const utterance = new SpeechSynthesisUtterance(wordInfo.word);
                        utterance.lang = book?.language === 'ta' ? 'ta-IN' : 'en-US';
                        window.speechSynthesis.speak(utterance);
                      }}
                      className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-semibold flex items-center justify-center gap-1 hover:bg-gray-200"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Speak</span>
                    </button>

                    <button 
                      onClick={handleSaveVocabulary}
                      disabled={savedVocab}
                      className="flex-1 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold flex items-center justify-center gap-1 hover:bg-indigo-700 disabled:bg-emerald-600 transition-colors"
                    >
                      {savedVocab ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{savedVocab ? "Saved" : "Add Vocabulary"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Could not fetch dictionary details.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
