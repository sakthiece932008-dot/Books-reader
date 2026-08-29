import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Pause, Bookmark, List, Type, Globe, 
  ChevronLeft, ChevronRight, Volume2, Sparkles, X, Check, 
  Plus, BookOpen, SkipForward, SkipBack, Trash2,
  Sliders, Languages, AudioLines, Radio, AlertCircle, RefreshCw
} from 'lucide-react';
import { db } from '../lib/db';
import { api } from '../lib/api';
import AiTutorSheet from '../components/AiTutorSheet';
import { 
  BookEntity, WordEducationalInfo, ReaderTheme, ReaderFont, 
  ReaderTextColor, ReadingMode, BookmarkEntity, TamilAccent
} from '../types';
import { 
  SUPPORTED_LANGUAGES, GEMINI_AI_VOICES, getLanguageName, 
  getLanguageLocale, normalizeTextForSpeech, parseRawParagraphs, pcmToWavBlob,
  detectScriptLanguage
} from '../lib/languages';
import {
  TAMIL_ACCENTS, applyTamilProsodyAndNaturalFlow, isTamilText
} from '../lib/tamilProsody';
import { TamilPhoneticNLP } from '../lib/tamilNLP';


type TtsEngine = 'gemini' | 'browser';
type SpeechReadTarget = 'original' | 'translated';

export default function ReaderScreen() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  // 1. Book & Content State
  const [book, setBook] = useState<BookEntity | null>(null);
  const [bookNotFound, setBookNotFound] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [pages, setPages] = useState<string[]>([]);
  const [chapterTitle, setChapterTitle] = useState<string>('');

  // 2. Kindle Customizer & Reading Modes
  const [theme, setTheme] = useState<ReaderTheme>('sepia');
  const [font, setFont] = useState<ReaderFont>('serif');
  const [fontSize, setFontSize] = useState<number>(18);
  const [lineHeight, setLineHeight] = useState<number>(1.8);
  const [textColor, setTextColor] = useState<ReaderTextColor>(() => {
    return (localStorage.getItem('reader_text_color') as ReaderTextColor) || 'auto';
  });
  const [readingMode, setReadingMode] = useState<ReadingMode>('standard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  // 3. Multi-Language Live Translation & Transliteration
  const [sourceLanguage, setSourceLanguage] = useState<string>('ta');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [liveTranslations, setLiveTranslations] = useState<Record<number, string[]>>({});
  const [liveTransliterations, setLiveTransliterations] = useState<Record<number, string[]>>({});
  const [isTranslatingPage, setIsTranslatingPage] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);

  // 3.5 AI Smart Paragraph Extractor & Noise Filtration (Active by default)
  const [aiCleanedPagesMap, setAiCleanedPagesMap] = useState<Record<number, string[]>>({});

  // 4. Advanced Audio & TTS Engine - Default to Gemini AI Neural Voice for 100% authentic native Tamil fluency
  const [ttsEngine, setTtsEngineState] = useState<TtsEngine>(() => {
    const saved = localStorage.getItem('reader_tts_engine');
    return (saved as TtsEngine) || 'gemini';
  });
  const setTtsEngine = useCallback((engine: TtsEngine) => {
    setTtsEngineState(engine);
    localStorage.setItem('reader_tts_engine', engine);
  }, []);
  const [selectedGeminiVoice, setSelectedGeminiVoice] = useState<string>('Kore');
  const [selectedBrowserVoiceURI, setSelectedBrowserVoiceURI] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(() => {
    const saved = localStorage.getItem('reader_speech_rate');
    return saved ? parseFloat(saved) : 1.0;
  });
  const speechRateRef = useRef<number>(speechRate);
  speechRateRef.current = speechRate;

  // Regional Tamil Accent Configuration
  const [tamilAccent, setTamilAccent] = useState<TamilAccent>(() => {
    const saved = localStorage.getItem('reader_tamil_accent');
    return (saved as TamilAccent) || 'standard';
  });
  const tamilAccentRef = useRef<TamilAccent>(tamilAccent);
  tamilAccentRef.current = tamilAccent;

  // Voice Pitch Slider (0.5x to 1.5x)
  const [voicePitch, setVoicePitch] = useState<number>(() => {
    const saved = localStorage.getItem('reader_voice_pitch');
    return saved ? parseFloat(saved) : 1.0;
  });
  const voicePitchRef = useRef<number>(voicePitch);
  voicePitchRef.current = voicePitch;

  // Natural Flow Prosody Mode (Dynamic cadence & breath pause modulation)
  const [naturalFlowEnabled, setNaturalFlowEnabled] = useState<boolean>(() => {
    return localStorage.getItem('reader_natural_flow') !== 'false';
  });
  const naturalFlowRef = useRef<boolean>(naturalFlowEnabled);
  naturalFlowRef.current = naturalFlowEnabled;

  const [speechReadTarget, setSpeechReadTarget] = useState<SpeechReadTarget>('original');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTtsPanelOpen, setIsTtsPanelOpen] = useState(false);
  const [speakingParagraphIdx, setSpeakingParagraphIdx] = useState<number | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [isWordHighlightEnabled, setIsWordHighlightEnabled] = useState<boolean>(() => {
    return localStorage.getItem('reader_word_highlight') !== 'false';
  });
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioErrorNotice, setAudioErrorNotice] = useState<string | null>(null);

  // Audio elements & Browser Voices
  const [availableBrowserVoices, setAvailableBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map()); // cache key -> blobUrl
  const wordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechResumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // 5. Selection & Word Lookup Modal
  const [selectedText, setSelectedText] = useState('');
  const [wordInfo, setWordInfo] = useState<WordEducationalInfo | null>(null);
  const [loadingWord, setLoadingWord] = useState(false);
  const [wordLookupError, setWordLookupError] = useState<string | null>(null);
  const [savedVocab, setSavedVocab] = useState(false);

  // 6. Bookmarks
  const [bookmarks, setBookmarks] = useState<BookmarkEntity[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Load Browser Voices on Mount
  useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableBrowserVoices(voices);
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Load Book Data
  useEffect(() => {
    async function loadBookData() {
      if (!bookId) return;
      try {
        const b = await db.getBook(Number(bookId));
        if (!b) {
          setBookNotFound(true);
          return;
        }

        setBook(b);
        setBookNotFound(false);
        setSourceLanguage(b.language || 'ta');
        // Default target language opposite to book language
        setTargetLanguage(b.language === 'ta' ? 'en' : 'ta');
        setCurrentPageIndex(b.lastReadPageIndex || 0);

        let allPages: string[] = [];
        let currentChapTitle = 'Chapter 1';

        if (b.chapters && b.chapters.length > 0) {
          b.chapters.forEach(chap => {
            allPages.push(...chap.pages);
          });
          currentChapTitle = b.chapters[0].title;
        } else if (b.fullContent) {
          allPages = b.fullContent.split('\n\n').filter(p => p.trim().length > 0);
        } else {
          allPages = [
            b.language === 'ta'
              ? "அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு.\n\nகற்றதனால் ஆய பயனென்கொல் வாலறிவன் நற்றாள் தொழாஅர் எனின்."
              : "Once when I was six years old I saw a magnificent picture in a book, called True Stories from Nature, about the primeval forest."
          ];
        }

        // Pre-clean all loaded pages to strip legacy watermarks, URLs, domain names & footer numbers
        const sanitizedPages = allPages.map(page => {
          const parsedP = parseRawParagraphs(page, { ignoreNoise: true });
          return parsedP.cleanParagraphs.join('\n\n');
        });

        // Auto-detect the true script language of the book content
        const sampleText = sanitizedPages.slice(0, 3).join(' ');
        const detectedBookLang = detectScriptLanguage(sampleText, b.language || 'ta');

        setPages(sanitizedPages);
        setChapterTitle(currentChapTitle);
        setSourceLanguage(detectedBookLang);
        setTargetLanguage(detectedBookLang === 'ta' ? 'en' : 'ta');

        const bms = await db.getBookmarks(b.id);
        setBookmarks(bms);
        setIsBookmarked(bms.some(bm => bm.pageIndex === (b.lastReadPageIndex || 0)));
      } catch (err: any) {
        console.error("Error loading book:", err);
        setBookNotFound(true);
      }
    }

    loadBookData();
  }, [bookId]);

  // Sync bookmark status when page changes
  useEffect(() => {
    if (book) {
      setIsBookmarked(bookmarks.some(bm => bm.pageIndex === currentPageIndex));
      db.saveBook({ ...book, lastReadPageIndex: currentPageIndex, totalPages: pages.length || 1 });
    }
  }, [currentPageIndex, bookmarks, pages.length]);

  // Auto-translate trigger
  useEffect(() => {
    if (autoTranslateEnabled && readingMode === 'standard') {
      setReadingMode('dual');
    }
  }, [autoTranslateEnabled]);

  // Parse current active page content cleanly with automatic noise filtering (Default on)
  const rawPageText = pages[currentPageIndex] || "";
  const parsed = parseRawParagraphs(rawPageText, { ignoreNoise: true });
  const cleanParagraphs = (aiCleanedPagesMap[currentPageIndex] || parsed.cleanParagraphs).map(p => {
    const pParsed = parseRawParagraphs(p, { ignoreNoise: true });
    return pParsed.cleanParagraphs.join(' ');
  }).filter(p => p.trim().length > 0);
  const embeddedTransliterations = parsed.embeddedTransliterations;
  const embeddedTranslations = parsed.embeddedTranslations;

  // Background Automatic AI Sanitizer: extract pure reading paragraphs without prompting user
  useEffect(() => {
    const raw = pages[currentPageIndex];
    if (!raw || aiCleanedPagesMap[currentPageIndex]) return;

    // Detect if page has potential header/URL noise to sanitize with AI
    const hasNoisePatterns = /(?:https?:\/\/|www\.|t\.me\/|t\.co\/|\.com|\.org|\.in|\.net|\.io|\.co|kaniyam|freetamilebooks|page\s*\d+|\-?\s*\d+\s*\-?|\b\d+\s*$|chapter\s+\d+|அத்தியாயம்\s+\d+|downloaded from|uploaded by|scan)/i.test(raw);

    if (hasNoisePatterns) {
      api.extractCleanParagraphs(raw, book?.title, sourceLanguage)
        .then(extracted => {
          if (extracted && extracted.length > 0) {
            setAiCleanedPagesMap(prev => ({
              ...prev,
              [currentPageIndex]: extracted
            }));
          }
        })
        .catch(err => {
          console.warn("Auto-clean background:", err);
        });
    }
  }, [currentPageIndex, pages, aiCleanedPagesMap, sourceLanguage, book?.title]);

  // Live Dual Language Translation Trigger
  const fetchLiveTranslation = useCallback(async (pageIdx: number, forceTarget?: string) => {
    const rawPage = pages[pageIdx];
    if (!rawPage) return;

    const parsedData = parseRawParagraphs(rawPage, { ignoreNoise: true });
    const paras = aiCleanedPagesMap[pageIdx] || parsedData.cleanParagraphs;
    const embTrans = parsedData.embeddedTranslations;
    const embTranslits = parsedData.embeddedTransliterations;
    if (paras.length === 0) return;

    const activeTarget = forceTarget || targetLanguage;
    const pageText = paras.join(' ');
    const detectedSrc = detectScriptLanguage(pageText, sourceLanguage || book?.language || 'ta');
    const activeSource = (sourceLanguage && sourceLanguage !== 'auto') ? sourceLanguage : detectedSrc;

    // If source and target are identical, no need to translate
    if (activeSource === activeTarget) {
      setLiveTranslations(prev => ({ ...prev, [pageIdx]: paras }));
      return;
    }

    setIsTranslatingPage(true);
    setTranslationError(null);
    try {
      // 1. Fetch paragraph translations
      const translatedList = await api.translateLive(paras, activeSource, activeTarget);
      
      // Merge with any embedded translations if available
      const finalTranslations = paras.map((p, idx) => {
        if (embTrans[idx] && activeTarget === 'en' && activeSource === 'ta') {
          return embTrans[idx];
        }
        return translatedList[idx] || embTrans[idx] || `[${activeTarget.toUpperCase()}] ${p}`;
      });

      setLiveTranslations(prev => ({
        ...prev,
        [pageIdx]: finalTranslations
      }));

      // 2. Fetch Romanized Transliteration if source or target is an Indian / Asian script
      const needsTransliteration = ['ta', 'hi', 'te', 'ml', 'kn', 'bn', 'mr', 'gu', 'pa', 'ja', 'zh', 'ar', 'ru'].includes(activeSource) || ['ta', 'hi'].includes(activeTarget);
      if (needsTransliteration) {
        const translitPromises = paras.map(async (p, idx) => {
          if (embTranslits[idx]) return embTranslits[idx];
          return await api.transliterate(p, getLanguageName(activeSource));
        });
        const translits = await Promise.all(translitPromises);
        setLiveTransliterations(prev => ({
          ...prev,
          [pageIdx]: translits
        }));
      }
    } catch (e: any) {
      console.error("Live translation error:", e);
      // Fallback gracefully so reader isn't broken
      const fallbackList = paras.map((p, idx) => embTrans[idx] || `[${activeTarget.toUpperCase()}] ${p}`);
      setLiveTranslations(prev => ({
        ...prev,
        [pageIdx]: prev[pageIdx] || fallbackList
      }));
      setTranslationError(e?.message || "Translation timed out. Tap retry or select languages.");
    } finally {
      setIsTranslatingPage(false);
    }
  }, [pages, targetLanguage, sourceLanguage, book?.language]);

  // Trigger translation on page turn or mode change
  useEffect(() => {
    if (readingMode !== 'standard' && pages[currentPageIndex] && !liveTranslations[currentPageIndex]) {
      fetchLiveTranslation(currentPageIndex);
    }
  }, [readingMode, currentPageIndex, pages, liveTranslations, fetchLiveTranslation]);

  // Audio Playback Helpers & Engine
  const stopAudio = useCallback(() => {
    if (wordIntervalRef.current) {
      clearInterval(wordIntervalRef.current);
      wordIntervalRef.current = null;
    }
    if (speechResumeIntervalRef.current) {
      clearInterval(speechResumeIntervalRef.current);
      speechResumeIntervalRef.current = null;
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    currentUtteranceRef.current = null;
    setIsPlaying(false);
    setSpeakingParagraphIdx(null);
    setActiveWordIndex(-1);
    setIsGeneratingAudio(false);
  }, []);

  // Fetch or retrieve synthesized audio blob for a text chunk using Gemini TTS
  const getGeminiAudioUrl = useCallback(async (text: string, voice: string, lang: string): Promise<string> => {
    const normText = normalizeTextForSpeech(text);
    const cacheKey = `${normText}__${voice}__${lang}`;
    if (audioCacheRef.current.has(cacheKey)) {
      return audioCacheRef.current.get(cacheKey)!;
    }

    const { audio } = await api.generateSpeech(normText, voice, lang);
    const binaryStr = atob(audio);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const wavBlob = pcmToWavBlob(bytes, 24000, 1, 16);
    const blobUrl = URL.createObjectURL(wavBlob);
    audioCacheRef.current.set(cacheKey, blobUrl);
    return blobUrl;
  }, []);

  // Speak paragraph via Web Speech API (with instant dispatch, Tamil regional accent prosody, and anti-stall watchdog)
  const speakParagraphWebSpeech = useCallback((text: string, langCode: string, onEnd: () => void, onError: (err: any) => void) => {
    const cleanText = normalizeTextForSpeech(text);
    if (!cleanText) {
      onEnd();
      return;
    }

    // Apply Natural Flow & Tamil Regional Prosody if speaking Tamil
    const isTamil = isTamilText(cleanText) || langCode === 'ta';
    const prosody = isTamil
      ? applyTamilProsodyAndNaturalFlow(cleanText, tamilAccentRef.current, naturalFlowRef.current)
      : { processedText: cleanText, computedRateMultiplier: 1.0, computedPitchOffset: 0, pauseCount: 0 };

    const speechText = prosody.processedText;
    const words = cleanText.split(/\s+/).filter(Boolean);

    // If Web Speech API is not supported in the current environment (e.g. some Android WebViews)
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      // Graceful visual progress simulation so reader doesn't stall
      const wordDuration = Math.max(120, 60000 / (150 * speechRate));
      let currentWord = 0;
      setActiveWordIndex(0);
      wordIntervalRef.current = setInterval(() => {
        currentWord++;
        if (currentWord >= words.length) {
          if (wordIntervalRef.current) {
            clearInterval(wordIntervalRef.current);
            wordIntervalRef.current = null;
          }
          setActiveWordIndex(-1);
          onEnd();
        } else {
          setActiveWordIndex(currentWord);
        }
      }, wordDuration);
      return;
    }

    if (wordIntervalRef.current) {
      clearInterval(wordIntervalRef.current);
      wordIntervalRef.current = null;
    }

    // Unpause existing queue and cancel stale utterances
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(speechText);
    currentUtteranceRef.current = utterance;
    
    // Dynamic Rate Adjustment with Natural Flow multiplier
    const baseRate = Number(speechRateRef.current) || 1.0;
    const finalRate = Math.max(0.6, Math.min(1.8, baseRate * (naturalFlowRef.current ? prosody.computedRateMultiplier : 1.0)));
    utterance.rate = finalRate;

    // Dynamic Voice Pitch Adjustment with Regional Accent calibration
    const basePitch = Number(voicePitchRef.current) || 1.0;
    const finalPitch = Math.max(0.6, Math.min(1.4, basePitch + (naturalFlowRef.current ? prosody.computedPitchOffset : 0)));
    utterance.pitch = finalPitch;

    const targetLocale = getLanguageLocale(langCode);
    utterance.lang = targetLocale;

    let boundaryFired = false;

    // Listen to native word boundary event if supported by browser
    utterance.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name === 'word') {
        boundaryFired = true;
        const charIdx = e.charIndex;
        const sub = cleanText.substring(0, charIdx);
        const wIdx = sub.trim().length === 0 ? 0 : sub.trim().split(/\s+/).length;
        setActiveWordIndex(Math.min(wIdx, words.length - 1));
      }
    };

    const voices = window.speechSynthesis.getVoices();
    let chosenVoice: SpeechSynthesisVoice | undefined;

    if (selectedBrowserVoiceURI) {
      chosenVoice = voices.find(v => v.voiceURI === selectedBrowserVoiceURI);
    }

    if (!chosenVoice) {
      // Find matching language voice, prioritizing dedicated native regional Tamil voices based on selected accent
      if (langCode === 'ta' || targetLocale.startsWith('ta')) {
        const tamilVoices = voices.filter(v => {
          const l = v.lang.toLowerCase().replace('_', '-');
          const n = v.name.toLowerCase();
          return l.startsWith('ta') || n.includes('tamil') || v.name.includes('தமிழ்');
        });

        if (tamilVoices.length === 0) {
          // No local Tamil voice exists on this device/browser (would otherwise cause English voice mispronunciation)
          // Delegate automatically to Gemini AI Voice for authentic native Tamil pronunciation
          getGeminiAudioUrl(cleanText, selectedGeminiVoice, 'ta')
            .then(audioUrl => {
              if (!isPlayingRef.current) return;
              if (!audioElementRef.current) audioElementRef.current = new Audio();
              const audio = audioElementRef.current;
              audio.src = audioUrl;
              audio.playbackRate = speechRateRef.current;
              audio.onplay = () => setActiveWordIndex(0);
              audio.onended = () => {
                setActiveWordIndex(-1);
                onEnd();
              };
              audio.onerror = (e) => onError(e);
              audio.play().catch(onError);
            })
            .catch(onError);
          return;
        }

        // Match based on regional accent
        if (tamilAccentRef.current === 'jaffna') {
          chosenVoice = tamilVoices.find(v => v.lang.toLowerCase().includes('lk') || v.name.toLowerCase().includes('sri lanka') || v.name.toLowerCase().includes('jaffna'))
            || tamilVoices.find(v => v.name.includes('தமிழ்') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural'))
            || tamilVoices[0];
        } else if (tamilAccentRef.current === 'singapore') {
          chosenVoice = tamilVoices.find(v => v.lang.toLowerCase().includes('sg') || v.lang.toLowerCase().includes('my') || v.name.toLowerCase().includes('singapore'))
            || tamilVoices.find(v => v.name.includes('தமிழ்') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural'))
            || tamilVoices[0];
        } else {
          // Standard, Madurai, Chennai, Kongu
          chosenVoice = tamilVoices.find(v => 
            (v.name.includes('தமிழ்') || v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('natural')) &&
            (v.lang.toLowerCase().includes('in') || v.lang.toLowerCase().startsWith('ta'))
          ) || tamilVoices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('ta-in'))
            || tamilVoices.find(v => v.lang.toLowerCase().replace('_', '-').startsWith('ta'))
            || tamilVoices[0];
        }
      } else {
        chosenVoice = voices.find(v => 
          v.lang.toLowerCase() === targetLocale.toLowerCase() ||
          v.lang.toLowerCase().replace('_', '-').startsWith(langCode.toLowerCase()) ||
          v.name.toLowerCase().includes(getLanguageName(langCode).toLowerCase())
        );
      }
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang || targetLocale;
    }

    utterance.onstart = () => {
      setActiveWordIndex(0);
      // Fallback timer if browser doesn't dispatch onboundary (e.g. mobile or Chrome Linux)
      setTimeout(() => {
        if (!boundaryFired && isPlayingRef.current && words.length > 0) {
          const estimatedWordDuration = Math.max(100, 60000 / (150 * finalRate));
          let currentW = 0;
          wordIntervalRef.current = setInterval(() => {
            currentW++;
            if (currentW >= words.length) {
              if (wordIntervalRef.current) clearInterval(wordIntervalRef.current);
            } else {
              setActiveWordIndex(currentW);
            }
          }, estimatedWordDuration);
        }
      }, 200);
    };

    utterance.onend = () => {
      if (wordIntervalRef.current) {
        clearInterval(wordIntervalRef.current);
        wordIntervalRef.current = null;
      }
      currentUtteranceRef.current = null;
      setActiveWordIndex(-1);
      onEnd();
    };

    utterance.onerror = (e) => {
      if (wordIntervalRef.current) {
        clearInterval(wordIntervalRef.current);
        wordIntervalRef.current = null;
      }
      currentUtteranceRef.current = null;
      setActiveWordIndex(-1);
      const errType = e?.error || 'unknown';
      if (errType === 'canceled' || errType === 'interrupted') {
        return;
      }
      console.warn('[Web Speech Warn]', errType, 'for locale', targetLocale);
      onError(errType);
    };

    // Instant speech trigger with anti-stall wake-up
    try {
      window.speechSynthesis.speak(utterance);
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (e) {
      console.warn("SpeechSynthesis speak exception:", e);
    }

    // Anti-stall watchdog for Chrome/Android SpeechSynthesis
    if (speechResumeIntervalRef.current) {
      clearInterval(speechResumeIntervalRef.current);
    }
    speechResumeIntervalRef.current = setInterval(() => {
      if (!isPlayingRef.current) {
        if (speechResumeIntervalRef.current) {
          clearInterval(speechResumeIntervalRef.current);
          speechResumeIntervalRef.current = null;
        }
        return;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 500);

  }, [speechRate, selectedBrowserVoiceURI, voicePitch, tamilAccent, naturalFlowEnabled]);

  // Main Sequential Speech Loop (Handles Gemini TTS & Browser Web Speech)
  const playFromParagraph = useCallback(async (startIdx: number) => {
    if (cleanParagraphs.length === 0) return;
    if (wordIntervalRef.current) {
      clearInterval(wordIntervalRef.current);
      wordIntervalRef.current = null;
    }
    setIsPlaying(true);
    setAudioErrorNotice(null);

    let currentIndex = startIdx;

    const speakCurrent = async () => {
      if (!isPlayingRef.current) return;

      if (wordIntervalRef.current) {
        clearInterval(wordIntervalRef.current);
        wordIntervalRef.current = null;
      }
      setActiveWordIndex(-1);

      if (currentIndex >= cleanParagraphs.length) {
        // Page completed -> advance to next page
        if (currentPageIndex < pages.length - 1) {
          setCurrentPageIndex(p => p + 1);
          setSpeakingParagraphIdx(0);
          currentIndex = 0;
          return;
        } else {
          stopAudio();
          return;
        }
      }

      setSpeakingParagraphIdx(currentIndex);
      const originalPara = cleanParagraphs[currentIndex];
      const transPara = liveTranslations[currentPageIndex]?.[currentIndex] || embeddedTranslations[currentIndex] || "";

      // Determine text to read and spoken language
      let textToRead = originalPara;
      let spokenLang = sourceLanguage;

      if (speechReadTarget === 'translated' && transPara) {
        textToRead = transPara;
        spokenLang = targetLanguage;
      }

      const cleanText = normalizeTextForSpeech(textToRead);
      if (!cleanText) {
        currentIndex++;
        speakCurrent();
        return;
      }

      const words = cleanText.split(/\s+/).filter(Boolean);

      if (ttsEngine === 'gemini') {
        // 1. Gemini AI Voice Engine
        try {
          setIsGeneratingAudio(true);
          const audioUrl = await getGeminiAudioUrl(cleanText, selectedGeminiVoice, spokenLang);
          setIsGeneratingAudio(false);

          if (!isPlayingRef.current) return;

          if (!audioElementRef.current) {
            audioElementRef.current = new Audio();
          }

          const audio = audioElementRef.current;
          audio.src = audioUrl;
          audio.playbackRate = speechRateRef.current;

          // Word-by-word tracking synchronized with audio playback duration
          audio.ontimeupdate = () => {
            if (audio.duration && !isNaN(audio.duration) && words.length > 0) {
              const progress = Math.min(0.999, Math.max(0, audio.currentTime / audio.duration));
              const wordIdx = Math.min(words.length - 1, Math.floor(progress * words.length));
              setActiveWordIndex(wordIdx);
            }
          };

          audio.onplay = () => {
            if (audioElementRef.current) {
              audioElementRef.current.playbackRate = speechRateRef.current;
            }
            setActiveWordIndex(0);
          };

          audio.onended = () => {
            setActiveWordIndex(-1);
            currentIndex++;
            speakCurrent();
          };

          audio.onerror = (e) => {
            console.error('Audio playback error, falling back to Web Speech:', e);
            // Fallback to Web Speech API or silent tracking
            speakParagraphWebSpeech(
              cleanText, 
              spokenLang, 
              () => { currentIndex++; speakCurrent(); },
              () => {
                // Silently advance to next paragraph without intrusive error banner
                setTimeout(() => { currentIndex++; speakCurrent(); }, 400);
              }
            );
          };

          await audio.play();
          audio.playbackRate = speechRateRef.current;

          // Background prefetch next paragraph for instant zero-latency playback transition
          if (currentIndex + 1 < cleanParagraphs.length) {
            const nextPara = cleanParagraphs[currentIndex + 1];
            const nextTrans = liveTranslations[currentPageIndex]?.[currentIndex + 1] || embeddedTranslations[currentIndex + 1] || "";
            const nextText = normalizeTextForSpeech(speechReadTarget === 'translated' && nextTrans ? nextTrans : nextPara);
            if (nextText) {
              getGeminiAudioUrl(nextText, selectedGeminiVoice, spokenLang).catch(() => {});
            }
          }
        } catch (err: any) {
          console.warn('Gemini TTS failed, falling back to browser voice:', err);
          setIsGeneratingAudio(false);
          // Fallback to browser voice seamlessly
          speakParagraphWebSpeech(
            cleanText,
            spokenLang,
            () => { currentIndex++; speakCurrent(); },
            () => {
              // Silently advance without interrupting user experience
              setTimeout(() => { currentIndex++; speakCurrent(); }, 400);
            }
          );
        }
      } else {
        // 2. Browser Web Speech Engine
        speakParagraphWebSpeech(
          cleanText,
          spokenLang,
          () => {
            currentIndex++;
            speakCurrent();
          },
          (_err) => {
            console.warn('[TTS Notice] Fallback for paragraph', currentIndex);
            setTimeout(() => { currentIndex++; speakCurrent(); }, 500);
          }
        );
      }
    };

    speakCurrent();
  }, [
    cleanParagraphs, currentPageIndex, pages.length, liveTranslations, embeddedTranslations,
    sourceLanguage, targetLanguage, speechReadTarget, ttsEngine, selectedGeminiVoice,
    getGeminiAudioUrl, speakParagraphWebSpeech, stopAudio
  ]);

  // Master Speed Change Handler with Instant Dynamic Application
  const handleSpeedChange = useCallback((newRate: number) => {
    setSpeechRate(newRate);
    speechRateRef.current = newRate;
    localStorage.setItem('reader_speech_rate', String(newRate));

    // 1. Immediately apply to active HTML5 audio element
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = newRate;
    }

    // 2. If Web Speech is playing, restart current paragraph with the updated rate
    if (isPlayingRef.current && ttsEngine === 'browser') {
      const activeIdx = speakingParagraphIdx !== null ? speakingParagraphIdx : 0;
      playFromParagraph(activeIdx);
    }
  }, [ttsEngine, speakingParagraphIdx, playFromParagraph]);

  // Voice Pitch Change Handler with Instant Real-Time Application
  const handlePitchChange = useCallback((newPitch: number) => {
    const clamped = Math.max(0.5, Math.min(1.5, Number(newPitch.toFixed(2))));
    setVoicePitch(clamped);
    voicePitchRef.current = clamped;
    localStorage.setItem('reader_voice_pitch', String(clamped));

    if (isPlayingRef.current && ttsEngine === 'browser') {
      const activeIdx = speakingParagraphIdx !== null ? speakingParagraphIdx : 0;
      playFromParagraph(activeIdx);
    }
  }, [ttsEngine, speakingParagraphIdx, playFromParagraph]);

  // Regional Tamil Accent Change Handler
  const handleTamilAccentChange = useCallback((newAccent: TamilAccent) => {
    setTamilAccent(newAccent);
    tamilAccentRef.current = newAccent;
    localStorage.setItem('reader_tamil_accent', newAccent);

    // Apply recommended regional pitch offset
    const accentInfo = TAMIL_ACCENTS.find(a => a.id === newAccent);
    if (accentInfo) {
      setVoicePitch(accentInfo.recommendedPitch);
      voicePitchRef.current = accentInfo.recommendedPitch;
      localStorage.setItem('reader_voice_pitch', String(accentInfo.recommendedPitch));
    }

    if (isPlayingRef.current && ttsEngine === 'browser') {
      const activeIdx = speakingParagraphIdx !== null ? speakingParagraphIdx : 0;
      playFromParagraph(activeIdx);
    }
  }, [ttsEngine, speakingParagraphIdx, playFromParagraph]);

  // Natural Flow Prosody Toggle Handler
  const handleNaturalFlowToggle = useCallback(() => {
    const next = !naturalFlowEnabled;
    setNaturalFlowEnabled(next);
    naturalFlowRef.current = next;
    localStorage.setItem('reader_natural_flow', String(next));

    if (isPlayingRef.current && ttsEngine === 'browser') {
      const activeIdx = speakingParagraphIdx !== null ? speakingParagraphIdx : 0;
      playFromParagraph(activeIdx);
    }
  }, [naturalFlowEnabled, ttsEngine, speakingParagraphIdx, playFromParagraph]);

  const scrollToParagraph = (idx: number) => {
    const el = document.getElementById(`para-${idx}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Paragraph-wise Previous Navigation
  const handlePrevParagraph = () => {
    if (cleanParagraphs.length === 0) return;
    const current = speakingParagraphIdx !== null ? speakingParagraphIdx : 0;
    if (current > 0) {
      const nextIdx = current - 1;
      setSpeakingParagraphIdx(nextIdx);
      scrollToParagraph(nextIdx);
      if (isPlaying) {
        playFromParagraph(nextIdx);
      }
    } else if (currentPageIndex > 0) {
      // Move to previous page and select last paragraph
      const prevPage = currentPageIndex - 1;
      setCurrentPageIndex(prevPage);
      setTimeout(() => {
        const raw = pages[prevPage] || "";
        const parsed = parseRawParagraphs(raw);
        const lastIdx = Math.max(0, parsed.cleanParagraphs.length - 1);
        setSpeakingParagraphIdx(lastIdx);
        scrollToParagraph(lastIdx);
        if (isPlaying) {
          playFromParagraph(lastIdx);
        }
      }, 80);
    }
  };

  // Paragraph-wise Forward Navigation
  const handleNextParagraph = () => {
    if (cleanParagraphs.length === 0) return;
    const current = speakingParagraphIdx !== null ? speakingParagraphIdx : 0;
    if (current < cleanParagraphs.length - 1) {
      const nextIdx = current + 1;
      setSpeakingParagraphIdx(nextIdx);
      scrollToParagraph(nextIdx);
      if (isPlaying) {
        playFromParagraph(nextIdx);
      }
    } else if (currentPageIndex < pages.length - 1) {
      // Move to next page and select first paragraph
      const nextPage = currentPageIndex + 1;
      setCurrentPageIndex(nextPage);
      setSpeakingParagraphIdx(0);
      setTimeout(() => {
        scrollToParagraph(0);
        if (isPlaying) {
          playFromParagraph(0);
        }
      }, 80);
    }
  };

  // Play / Pause Toggle
  const togglePlayPause = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      const startIdx = speakingParagraphIdx !== null ? speakingParagraphIdx : 0;
      playFromParagraph(startIdx);
    }
  };

  // Re-trigger audio if page changes while reading
  useEffect(() => {
    if (isPlaying) {
      playFromParagraph(0);
    }
  }, [currentPageIndex]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, [stopAudio]);

  // Helper to render paragraph with optional word-by-word active highlight
  const renderHighlightedText = (text: string, isSpeaking: boolean) => {
    if (!text) return null;
    if (!isSpeaking || !isWordHighlightEnabled || activeWordIndex < 0) {
      return <span>{text}</span>;
    }

    const words = text.split(/(\s+)/); // Keep whitespace separators
    let actualWordCounter = 0;

    return (
      <span>
        {words.map((chunk, i) => {
          if (/^\s+$/.test(chunk)) {
            return <span key={i}>{chunk}</span>;
          }
          const currentIdx = actualWordCounter;
          actualWordCounter++;
          const isActive = currentIdx === activeWordIndex;

          return (
            <span
              key={i}
              className={
                isActive
                  ? 'bg-amber-400/75 dark:bg-amber-500/60 text-black dark:text-white px-1 py-0.5 rounded font-bold shadow-xs transition-all duration-75 scale-105 inline-block'
                  : ''
              }
            >
              {chunk}
            </span>
          );
        })}
      </span>
    );
  };

  // Word selection and lookup
  async function lookupWord(textToLookup: string) {
    if (!textToLookup) return;
    setLoadingWord(true);
    setWordLookupError(null);
    setSavedVocab(false);

    try {
      const info = await api.getWordDetails(
        textToLookup, 
        rawPageText.substring(0, 150) || "", 
        sourceLanguage || 'ta', 
        targetLanguage || 'en'
      );
      setWordInfo(info);
    } catch (e: any) {
      console.warn("Word lookup API fallback:", e);
      const isTamil = isTamilText(textToLookup);
      const fallbackTranslit = isTamil ? TamilPhoneticNLP.transliterateToLatin(textToLookup) : textToLookup;
      setWordInfo({
        word: textToLookup,
        translation: isTamil ? `Tamil Term: ${textToLookup}` : `Word: ${textToLookup}`,
        transliteration: fallbackTranslit,
        partOfSpeech: "Literary Vocabulary",
        rootWord: textToLookup,
        grammarNote: "Active vocabulary extracted from reading passage.",
        definition: `Contextual vocabulary term in this reading excerpt.`,
        exampleSentence: rawPageText.substring(0, 120) || `Sentence context for ${textToLookup}`,
        pronunciationTip: isTamil ? "Speak with crisp vowel length and natural Tamil prosody." : "Speak with natural cadence."
      });
      setWordLookupError(null);
    } finally {
      setLoadingWord(false);
    }
  }

  async function handleTextSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0 && text.length < 80) {
      setSelectedText(text);
      lookupWord(text);
    }
  }

  async function handleSaveVocabulary() {
    if (!wordInfo || !book) return;
    await db.saveVocabulary({
      id: Date.now(),
      word: wordInfo.word,
      sourceLanguage: sourceLanguage || book.language,
      targetLanguage: targetLanguage || 'en',
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
        selectedText: (cleanParagraphs[0] || rawPageText).substring(0, 60) + "...",
        note: `Bookmark on Page ${currentPageIndex + 1}`,
        timestamp: Date.now()
      };
      await db.saveBookmark(newBm);
      const updated = await db.getBookmarks(book.id);
      setBookmarks(updated);
    }
  }

  // Custom High-Contrast Text Color Styling
  const getTextColorClasses = () => {
    switch (textColor) {
      case 'black': return 'text-black font-semibold';
      case 'charcoal': return 'text-zinc-950 dark:text-zinc-50 font-medium';
      case 'espresso': return 'text-[#29180E] dark:text-[#F7F0E6] font-medium';
      case 'navy': return 'text-[#0F172A] dark:text-[#E2E8F0] font-medium';
      case 'white': return 'text-white font-semibold';
      case 'cream': return 'text-[#FFFBEB] font-medium';
      case 'auto':
      default:
        return '';
    }
  };

  // Theme Styling
  const getThemeClasses = () => {
    let themeBg = 'bg-[#FDFDF9] text-[#111827]';
    switch (theme) {
      case 'sepia':
        themeBg = 'bg-[#F5EBE1] text-[#29180E]';
        break;
      case 'dark':
        themeBg = 'bg-[#121212] text-[#F9FAFB]';
        break;
      case 'mint':
        themeBg = 'bg-[#EBF3ED] text-[#064E3B]';
        break;
      case 'paper':
      default:
        themeBg = 'bg-[#FDFDF9] text-[#111827]';
        break;
    }
    const customText = getTextColorClasses();
    if (customText) {
      return `${themeBg.split(' ')[0]} ${customText}`;
    }
    return themeBg;
  };


  const getFontFamily = () => {
    switch (font) {
      case 'sans': return 'font-sans';
      case 'mono': return 'font-mono';
      case 'dyslexic': return 'font-sans tracking-wide space-y-4';
      case 'serif': default: return 'font-serif';
    }
  };

  const currentTranslations = liveTranslations[currentPageIndex] || [];
  const currentTransliterations = liveTransliterations[currentPageIndex] || [];

  if (bookNotFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Book Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          This document is no longer in your local library or may have been deleted.
        </p>
        <button 
          onClick={() => navigate('/library')} 
          className="px-6 py-2.5 bg-[var(--primary)] hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
        >
          Return to Library
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300 ${getThemeClasses()}`}>
      
      {/* 1. Header Bar */}
      <header className={`flex items-center justify-between px-4 py-3 border-b backdrop-blur z-20 ${
        theme === 'dark' ? 'border-gray-800 bg-black/40' : 'border-amber-950/10 bg-white/40'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => { stopAudio(); navigate('/library'); }} 
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

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Multi-Language & Translation Modal Button */}
          <button
            onClick={() => setIsLanguageModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-all shrink-0 whitespace-nowrap shadow-xs"
            title="Select Source and Target Languages for Reading & Translation"
          >
            <Languages className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-bold tracking-wide">
              {sourceLanguage.toUpperCase()} → {targetLanguage.toUpperCase()}
            </span>
          </button>

          {/* Reading Mode Switcher (Standard, Dual, Interlinear) */}
          <button
            onClick={() => {
              if (readingMode === 'standard') {
                setReadingMode('dual');
              } else if (readingMode === 'dual') {
                setReadingMode('interlinear');
              } else {
                setReadingMode('standard');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              readingMode !== 'standard' 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white' 
                : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
            }`}
            title="Toggle Live Parallel Translation & Phonetics"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {readingMode === 'standard' ? 'Parallel View' : readingMode === 'dual' ? 'Dual Mode' : 'Interlinear Phonetics'}
            </span>
            <span className="md:hidden">
              {readingMode === 'standard' ? 'Normal' : readingMode === 'dual' ? 'Dual' : 'Phonetic'}
            </span>
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
            onClick={() => setIsTutorOpen(true)} 
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-[var(--primary)]"
            title="Open AI Literary Tutor & Quiz"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Audio Error Alert Notice (if any) */}
      {audioErrorNotice && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{audioErrorNotice}</span>
          </div>
          <button onClick={() => setAudioErrorNotice(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Main Page Reading Canvas */}
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
              {cleanParagraphs.map((para, idx) => {
                const isSpeakingThis = speakingParagraphIdx === idx;
                return (
                  <div 
                    key={idx} 
                    id={`para-${idx}`}
                    onClick={() => playFromParagraph(idx)}
                    className={`group relative p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                      isSpeakingThis 
                        ? 'bg-amber-500/15 border-l-4 border-amber-600 dark:border-amber-400 font-medium shadow-xs' 
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <p className="flex items-start gap-2">
                      {isSpeakingThis ? (
                        <Volume2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 animate-pulse mt-1" />
                      ) : (
                        <span className="w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity flex items-center justify-center shrink-0 mt-1">
                          <Play className="w-3.5 h-3.5 fill-current text-gray-500" />
                        </span>
                      )}
                      <span className="flex-1">
                        {renderHighlightedText(para, isSpeakingThis && speechReadTarget === 'original')}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Live Dual-Language / Parallel Translation View */
            <div className="space-y-6">
              {isTranslatingPage && currentTranslations.length === 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2.5 animate-pulse">
                  <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>Translating Page {currentPageIndex + 1} to {getLanguageName(targetLanguage)} with Gemini AI...</span>
                </div>
              )}

              {translationError && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="truncate">{translationError}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fetchLiveTranslation(currentPageIndex)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTranslationError(null)}
                      className="p-1 hover:bg-amber-500/20 rounded-md text-amber-800 dark:text-amber-200 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {cleanParagraphs.map((para, idx) => {
                const trans = currentTranslations[idx] || embeddedTranslations[idx] || "";
                const translit = currentTransliterations[idx] || embeddedTransliterations[idx] || "";
                const isSpeakingThis = speakingParagraphIdx === idx;
                const paraLang = detectScriptLanguage(para, sourceLanguage);

                return (
                  <div 
                    key={idx} 
                    id={`para-${idx}`}
                    onClick={() => playFromParagraph(idx)}
                    className={`group space-y-2.5 pb-4 border-b border-black/5 dark:border-white/5 transition-all p-3 rounded-xl cursor-pointer ${
                      isSpeakingThis ? 'bg-amber-500/15 border-l-4 border-amber-600 shadow-xs' : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {/* Source Language Paragraph */}
                    <div className="font-semibold text-current flex items-start gap-2.5">
                      {isSpeakingThis ? (
                        <Volume2 className="w-5 h-5 text-amber-600 shrink-0 animate-pulse mt-0.5" />
                      ) : (
                        <span className="w-5 h-5 opacity-0 group-hover:opacity-60 transition-opacity flex items-center justify-center shrink-0 mt-0.5">
                          <Play className="w-3.5 h-3.5 fill-current text-gray-500" />
                        </span>
                      )}
                      <div className="flex-1">
                        <span className="text-[10px] uppercase tracking-wider font-mono opacity-70 block mb-0.5 font-bold">
                          {getLanguageName(paraLang)}
                        </span>
                        <p>{renderHighlightedText(para, isSpeakingThis && speechReadTarget === 'original')}</p>
                      </div>
                    </div>
                    
                    {/* Live Parallel Translation in Target Language */}
                    {trans && (
                      <div className="pl-6 border-l-2 border-amber-600/60 dark:border-amber-500/60 text-sm font-sans space-y-1.5 ml-2">
                        <span className="text-[10px] uppercase tracking-wider font-mono text-amber-700 dark:text-amber-400 font-bold block">
                          {getLanguageName(targetLanguage)} Translation
                        </span>
                        <p className="text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
                          {renderHighlightedText(trans, isSpeakingThis && speechReadTarget === 'translated')}
                        </p>
                        
                        {/* Romanized Phonetic Transliteration (Tanglish / Romaji / etc.) */}
                        {(readingMode === 'interlinear' || translit) && translit && (
                          <div className="mt-1">
                            <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md inline-block">
                              Phonetic: {translit}
                            </span>
                          </div>
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

      {/* 3. Bottom Scrubber & Multi-Engine Audio Player Bar */}
      <footer className={`flex flex-col border-t px-4 py-3 z-20 backdrop-blur ${
        theme === 'dark' ? 'border-gray-800 bg-black/70' : 'border-amber-950/10 bg-white/70'
      }`}>
        <div className="max-w-xl mx-auto w-full space-y-2">
          
          {/* Page Scrubber Slider */}
          <div className="flex items-center gap-3 text-xs font-medium opacity-80">
            <button 
              onClick={() => { stopAudio(); setCurrentPageIndex(p => Math.max(0, p - 1)); }}
              disabled={currentPageIndex === 0}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30"
              title="Previous Page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <input 
              type="range" 
              min={0} 
              max={Math.max(0, pages.length - 1)} 
              value={currentPageIndex}
              onChange={e => { stopAudio(); setCurrentPageIndex(Number(e.target.value)); }}
              className="flex-1 accent-[var(--primary)] h-1.5 rounded-lg cursor-pointer"
            />

            <button 
              onClick={() => { stopAudio(); setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1)); }}
              disabled={currentPageIndex >= pages.length - 1}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30"
              title="Next Page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Status Meta Info & Audio Playback Controls */}
          <div className="flex items-center justify-between text-xs opacity-90 pt-1">
            <div className="flex items-center gap-2">
              <span className="font-bold">Page {currentPageIndex + 1} of {pages.length || 1}</span>
              <span>•</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                {sourceLanguage.toUpperCase()}
              </span>
              {ttsEngine === 'gemini' && (
                <span className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Gemini {selectedGeminiVoice}
                </span>
              )}
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end">
              {/* Paragraph-wise Backward & Forward Navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevParagraph}
                  disabled={currentPageIndex === 0 && (speakingParagraphIdx === null || speakingParagraphIdx <= 0)}
                  className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 disabled:opacity-30 transition-colors"
                  title="Previous Paragraph (Backward)"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextParagraph}
                  disabled={currentPageIndex >= pages.length - 1 && (speakingParagraphIdx !== null && speakingParagraphIdx >= cleanParagraphs.length - 1)}
                  className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-700 dark:text-gray-200 disabled:opacity-30 transition-colors"
                  title="Next Paragraph (Forward)"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Speed Pills in Bottom Bar */}
              <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-full p-0.5 text-[11px] font-bold">
                {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => handleSpeedChange(rate)}
                    className={`px-2 py-0.5 rounded-full transition-all ${
                      speechRate === rate
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                    }`}
                    title={`Set playback speed to ${rate}x`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Voice & TTS Settings Toggle Button */}
              <button
                onClick={() => setIsTtsPanelOpen(!isTtsPanelOpen)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                  isTtsPanelOpen 
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 ring-1 ring-amber-400' 
                    : 'bg-black/5 dark:bg-white/10 hover:bg-black/10'
                }`}
                title="Voice, Engine, Speed & Target Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Voices</span>
              </button>

              {/* Main Play / Pause Button */}
              <button 
                onClick={togglePlayPause}
                disabled={isGeneratingAudio}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold shadow-xs hover:from-amber-700 hover:to-orange-700 active:scale-95 transition-all text-xs"
              >
                {isGeneratingAudio ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>
                  {isGeneratingAudio 
                    ? "Generating..." 
                    : isPlaying 
                      ? "Pause Voice" 
                      : speechReadTarget === 'translated' 
                        ? `Read in ${getLanguageName(targetLanguage).split(' ')[0]}`
                        : `Read in ${getLanguageName(sourceLanguage).split(' ')[0]}`}
                </span>
              </button>
            </div>
          </div>

          {/* Expanded Voice & TTS Control Drawer */}
          {isTtsPanelOpen && (
             <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 shadow-2xl animate-in slide-in-from-bottom-2 duration-200 space-y-4 text-zinc-900 dark:text-zinc-100">
                <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                   <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-400">
                     <AudioLines className="w-4 h-4 text-amber-600" />
                     <span>Tamil & Multilingual Speech Engine</span>
                   </div>
                   <button onClick={() => setIsTtsPanelOpen(false)} className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 p-1 rounded-lg">
                     <X className="w-4 h-4" />
                   </button>
                </div>
                
                {/* 1. TTS Engine Selector */}
                <div className="space-y-1.5">
                   <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Synthesis Engine</label>
                   <div className="grid grid-cols-2 gap-2">
                     <button
                       onClick={() => setTtsEngine('gemini')}
                       className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2.5 transition-all text-left ${
                         ttsEngine === 'gemini' 
                           ? 'bg-purple-600 text-white border-2 border-purple-600 shadow-md ring-2 ring-purple-400/40' 
                           : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                       }`}
                     >
                       <Sparkles className={`w-4 h-4 shrink-0 ${ttsEngine === 'gemini' ? 'text-white' : 'text-purple-600'}`} />
                       <div>
                         <div className="font-bold flex items-center gap-1.5 flex-wrap">
                           <span className={ttsEngine === 'gemini' ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}>Gemini AI Voice</span>
                           <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                             ttsEngine === 'gemini' ? 'bg-purple-900 text-white border border-purple-300' : 'bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300'
                           }`}>
                             Pure Tamil Fluency
                           </span>
                         </div>
                         <div className={`text-[10px] mt-0.5 leading-tight ${ttsEngine === 'gemini' ? 'text-purple-50 font-medium' : 'text-zinc-600 dark:text-zinc-300'}`}>
                           100% human-grade Tamil pronunciation & narration
                         </div>
                       </div>
                     </button>

                     <button
                       onClick={() => setTtsEngine('browser')}
                       className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2.5 transition-all text-left ${
                         ttsEngine === 'browser' 
                           ? 'bg-amber-500 dark:bg-amber-600 text-white border-2 border-amber-600 shadow-md ring-2 ring-amber-400/40' 
                           : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                       }`}
                     >
                       <Radio className={`w-4 h-4 shrink-0 ${ttsEngine === 'browser' ? 'text-white' : 'text-amber-600'}`} />
                       <div>
                         <div className="font-bold flex items-center gap-1.5 flex-wrap">
                           <span className={ttsEngine === 'browser' ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}>Device Offline Voice</span>
                         </div>
                         <div className={`text-[10px] mt-0.5 leading-tight ${ttsEngine === 'browser' ? 'text-amber-50 font-medium' : 'text-zinc-600 dark:text-zinc-300'}`}>
                           Local system speech (requires installed Tamil voice)
                         </div>
                       </div>
                     </button>
                   </div>
                </div>

                {/* 2. Reading Target (Original / Translation) */}
                <div className="space-y-1.5">
                   <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Audio Read Target</label>
                   <div className="grid grid-cols-2 gap-2">
                     {[
                       { id: 'original', label: `Original (${getLanguageName(sourceLanguage).split(' ')[0]})` },
                       { id: 'translated', label: `Translation (${getLanguageName(targetLanguage).split(' ')[0]})` }
                     ].map(t => (
                       <button
                         key={t.id}
                         onClick={() => setSpeechReadTarget(t.id as SpeechReadTarget)}
                         className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                           speechReadTarget === t.id 
                             ? 'bg-amber-600 text-white border-2 border-amber-600 shadow-xs' 
                             : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                         }`}
                       >
                         {t.label}
                       </button>
                     ))}
                   </div>
                </div>

                {/* 3. Voice Selection based on Engine */}
                {ttsEngine === 'gemini' ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Gemini AI Voice Persona</label>
                    <div className="grid grid-cols-3 gap-2">
                      {GEMINI_AI_VOICES.map(v => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedGeminiVoice(v.id)}
                          className={`p-2 rounded-xl border text-xs text-left transition-all ${
                            selectedGeminiVoice === v.id
                              ? 'bg-purple-600 text-white border-2 border-purple-600 font-bold shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          }`}
                        >
                          <div className="font-bold truncate">{v.name.split(' ')[0]}</div>
                          <div className={`text-[9px] truncate ${selectedGeminiVoice === v.id ? 'text-purple-100' : 'text-zinc-600 dark:text-zinc-300'}`}>{v.gender} • {v.description.substring(0, 18)}...</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Browser Device Voice</label>
                    <select 
                      value={selectedBrowserVoiceURI} 
                      onChange={(e) => setSelectedBrowserVoiceURI(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl p-2.5 text-xs font-medium"
                    >
                      <option value="">Auto Detect (Best native voice for {getLanguageName(speechReadTarget === 'translated' ? targetLanguage : sourceLanguage)})</option>
                      {[...availableBrowserVoices].sort((a, b) => {
                        const aIsTamil = a.lang.toLowerCase().startsWith('ta') || a.name.toLowerCase().includes('tamil') || a.name.includes('தமிழ்');
                        const bIsTamil = b.lang.toLowerCase().startsWith('ta') || b.name.toLowerCase().includes('tamil') || b.name.includes('தமிழ்');
                        if (aIsTamil && !bIsTamil) return -1;
                        if (!aIsTamil && bIsTamil) return 1;
                        return a.name.localeCompare(b.name);
                      }).map(v => {
                        const isTamil = v.lang.toLowerCase().startsWith('ta') || v.name.toLowerCase().includes('tamil') || v.name.includes('தமிழ்');
                        return (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            {isTamil ? `🌟 [தமிழ் Native Accent] ` : ''}{v.name} ({v.lang})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* 4. Playback Speed */}
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center">
                     <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Playback Speed</label>
                     <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{speechRate}x</span>
                   </div>
                   <div className="flex items-center gap-2">
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(rate => (
                        <button
                          key={rate}
                          onClick={() => handleSpeedChange(rate)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            speechRate === rate 
                            ? 'bg-amber-600 text-white border-2 border-amber-600 shadow-xs' 
                            : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                   </div>
                </div>

                {/* 5. Voice Pitch Slider (Refines Tamil output naturalness & resonance) */}
                <div className="space-y-1.5">
                   <div className="flex justify-between items-center text-xs">
                     <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1">
                       <span>Voice Pitch</span>
                       <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">({voicePitch < 0.95 ? 'Deeper Tone' : voicePitch > 1.05 ? 'High / Articulate' : 'Natural Balance'})</span>
                     </label>
                     <div className="flex items-center gap-2">
                       <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{voicePitch.toFixed(2)}x</span>
                       {voicePitch !== 1.0 && (
                         <button 
                           onClick={() => handlePitchChange(1.0)}
                           className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
                         >
                           Reset
                         </button>
                       )}
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-bold">Low (0.5)</span>
                     <input 
                       type="range"
                       min={0.5}
                       max={1.5}
                       step={0.05}
                       value={voicePitch}
                       onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                       className="flex-1 accent-amber-600 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                     />
                     <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-bold">High (1.5)</span>
                   </div>
                </div>

                {/* 6. Language Accent Configuration (Regional Tamil Pronunciations) */}
                <div className="space-y-1.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                   <div className="flex justify-between items-center">
                     <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1">
                       <span>Tamil Dialect Accent</span>
                       <span className="text-[9px] bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 px-1.5 py-0.5 rounded font-bold">NLP Engine</span>
                     </label>
                     <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                       {TAMIL_ACCENTS.find(a => a.id === tamilAccent)?.nativeName}
                     </span>
                   </div>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                     {TAMIL_ACCENTS.map(acc => (
                       <button
                         key={acc.id}
                         onClick={() => handleTamilAccentChange(acc.id)}
                         className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                           tamilAccent === acc.id
                             ? 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white border-2 border-amber-600 shadow-md ring-2 ring-amber-400/40'
                             : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                         }`}
                       >
                         <div>
                           <div className="flex items-center justify-between gap-1 mb-0.5">
                             <span className="font-bold text-xs truncate">{acc.name}</span>
                             {tamilAccent === acc.id && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                           </div>
                           <div className={`text-[10px] font-semibold truncate ${tamilAccent === acc.id ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'}`}>
                             {acc.nativeName}
                           </div>
                         </div>
                         <div className={`text-[9px] mt-1 line-clamp-1 font-medium ${tamilAccent === acc.id ? 'text-white/90' : 'text-zinc-600 dark:text-zinc-400'}`}>
                           {acc.badge}
                         </div>
                       </button>
                     ))}
                   </div>
                </div>

                {/* 7. Natural Flow Mode Toggle (Dynamic Prosody & Clausal Cadence) */}
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                      <Radio className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Natural Flow Prosody Mode</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 px-1.5 py-0.5 rounded font-bold">Conversational Cadence</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-300">Auto-adjusts speed and pauses based on Tamil prosody & compound words</p>
                  </div>
                  <button 
                    type="button"
                    onClick={handleNaturalFlowToggle}
                    className={`w-11 h-6 rounded-full relative transition-colors ${naturalFlowEnabled ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${naturalFlowEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>


                {/* 8. Word-by-Word Highlighting Focus Toggle */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Word-by-Word Highlighting</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Live karaoke-style highlighting synchronized with AI voice</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const next = !isWordHighlightEnabled;
                      setIsWordHighlightEnabled(next);
                      localStorage.setItem('reader_word_highlight', String(next));
                    }}
                    className={`w-10 h-5 rounded-full relative transition-colors ${isWordHighlightEnabled ? 'bg-amber-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isWordHighlightEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
             </div>
          )}
        </div>
      </footer>

      {/* 4. Language Selection Modal */}
      {isLanguageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 border border-[var(--border)] rounded-2xl shadow-2xl p-5 space-y-5 animate-in zoom-in-95 duration-200 text-gray-800 dark:text-gray-100">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-base text-[var(--primary)]">
                <Languages className="w-5 h-5" />
                <span>Reading & Translation Languages</span>
              </div>
              <button onClick={() => setIsLanguageModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Source Language */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Book Original Language</label>
                <div className="max-h-60 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-800 rounded-xl p-1.5">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => setSourceLanguage(lang.code)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                        sourceLanguage === lang.code 
                          ? 'bg-amber-500 text-white font-bold' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span>{lang.flag} {lang.name} ({lang.nativeName})</span>
                      {sourceLanguage === lang.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Translation Language */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Translation Language</label>
                <div className="max-h-60 overflow-y-auto space-y-1 border border-gray-200 dark:border-gray-800 rounded-xl p-1.5">
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setTargetLanguage(lang.code);
                        // Trigger immediate live translation for current page
                        fetchLiveTranslation(currentPageIndex, lang.code);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                        targetLanguage === lang.code 
                          ? 'bg-[var(--primary)] text-white font-bold' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span>{lang.flag} {lang.name} ({lang.nativeName})</span>
                      {targetLanguage === lang.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Translations and voice reading will automatically adapt to <span className="font-bold text-current">{getLanguageName(targetLanguage)}</span>.
              </div>
              <button
                onClick={() => {
                  setIsLanguageModalOpen(false);
                  fetchLiveTranslation(currentPageIndex);
                }}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl text-xs font-bold shadow-xs hover:opacity-90"
              >
                Apply Languages
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Display Settings Drawer (Themes, Fonts, Sizes, High-Contrast Text) */}
      {isSettingsOpen && (
        <div className="absolute inset-x-0 top-16 z-40 p-4 animate-in slide-in-from-top duration-200">
          <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-2xl p-5 space-y-5 text-zinc-900 dark:text-zinc-100">
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <Type className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Reading & Display Customizer</span>
              </h3>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Themes */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Background Theme</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'paper', name: 'Paper', bg: 'bg-[#FDFDF9]', border: 'border-zinc-300', text: 'text-zinc-950' },
                  { id: 'sepia', name: 'Sepia', bg: 'bg-[#F5EBE1]', border: 'border-amber-300', text: 'text-[#29180E]' },
                  { id: 'mint', name: 'Mint', bg: 'bg-[#EBF3ED]', border: 'border-emerald-300', text: 'text-[#064E3B]' },
                  { id: 'dark', name: 'Dark', bg: 'bg-[#121212]', border: 'border-zinc-700', text: 'text-zinc-50' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as ReaderTheme)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${t.bg} ${t.text} ${
                      theme === t.id ? 'ring-2 ring-amber-500 border-amber-500 shadow-md scale-105' : `${t.border} hover:opacity-90`
                    }`}
                  >
                    <span>{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* High-Contrast Font & Text Color Selector */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Text Color & Contrast
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                  {textColor === 'auto' ? 'Theme Default' : textColor.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'auto', name: 'Auto Contrast', preview: 'Aa', bg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100' },
                  { id: 'black', name: 'Pitch Black', preview: 'Aa', bg: 'bg-white text-black font-extrabold border-zinc-400' },
                  { id: 'charcoal', name: 'Charcoal', preview: 'Aa', bg: 'bg-zinc-200 text-zinc-900 font-bold' },
                  { id: 'espresso', name: 'Espresso', preview: 'Aa', bg: 'bg-[#F7F0E6] text-[#29180E] font-bold' },
                  { id: 'navy', name: 'Deep Navy', preview: 'Aa', bg: 'bg-slate-200 text-[#0F172A] font-bold' },
                  { id: 'white', name: 'Pure White', preview: 'Aa', bg: 'bg-zinc-950 text-white font-extrabold border-zinc-700' },
                  { id: 'cream', name: 'Warm Cream', preview: 'Aa', bg: 'bg-zinc-900 text-[#FFFBEB] font-bold' }
                ].map(tc => (
                  <button
                    key={tc.id}
                    onClick={() => {
                      setTextColor(tc.id as ReaderTextColor);
                      localStorage.setItem('reader_text_color', tc.id);
                    }}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-between px-2.5 transition-all ${tc.bg} ${
                      textColor === tc.id 
                        ? 'ring-2 ring-amber-500 border-amber-500 shadow-xs' 
                        : 'border-zinc-300 dark:border-zinc-700 hover:opacity-90'
                    }`}
                  >
                    <span className="truncate text-[11px] font-bold">{tc.name}</span>
                    <span className="text-xs font-bold ml-1">{tc.preview}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Style */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Font Family</label>
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
                    className={`p-2 rounded-xl border text-xs font-bold transition-all ${f.class} ${
                      font === f.id 
                        ? 'bg-amber-600 text-white border-2 border-amber-600 shadow-xs' 
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <span>Text Size</span>
                <span className="text-amber-700 dark:text-amber-300">{fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">A</span>
                <input 
                  type="range" 
                  min={14} 
                  max={32} 
                  value={fontSize} 
                  onChange={e => setFontSize(Number(e.target.value))}
                  className="flex-1 accent-amber-600 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                />
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">A</span>
              </div>
            </div>

            {/* Line Spacing */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <span>Line Spacing</span>
                <span className="text-amber-700 dark:text-amber-300">{lineHeight.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Tight</span>
                <input 
                  type="range" 
                  min={1.4} 
                  max={2.4} 
                  step={0.1}
                  value={lineHeight} 
                  onChange={e => setLineHeight(parseFloat(e.target.value))}
                  className="flex-1 accent-amber-600 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                />
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Spacious</span>
              </div>
            </div>

            {/* AI Document Sanitizer & Noise Ignorer */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI Paragraph Sanitizer</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400">Automatically ignores URLs, running headers & page numbers</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300 dark:border-emerald-700">
                  Always Active
                </span>
              </div>
            </div>

            {/* Word-by-Word Reading Focus Highlighting Toggle */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Word-by-Word Voice Highlight</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400">Live focus highlight as text is read aloud</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    const next = !isWordHighlightEnabled;
                    setIsWordHighlightEnabled(next);
                    localStorage.setItem('reader_word_highlight', String(next));
                  }}
                  className={`w-11 h-6 rounded-full relative transition-colors ${isWordHighlightEnabled ? 'bg-amber-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${isWordHighlightEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Auto Translate Toggle */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Auto Parallel Translate on Page Turn</span>
                <button 
                  onClick={() => setAutoTranslateEnabled(!autoTranslateEnabled)}
                  className={`w-11 h-6 rounded-full relative transition-colors ${autoTranslateEnabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${autoTranslateEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Tamil Voice, Language Accent & Natural Flow Customizer */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-400">
                  <AudioLines className="w-4 h-4 text-amber-600" />
                  <span>Tamil Voice & Regional Accent Engine</span>
                </div>
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold border border-amber-300 dark:border-amber-700">
                  {TAMIL_ACCENTS.find(a => a.id === tamilAccent)?.nativeName}
                </span>
              </div>

              {/* 1. Language Accent Selection */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <label className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Regional Accent & Dialect</label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {TAMIL_ACCENTS.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => handleTamilAccentChange(acc.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        tamilAccent === acc.id
                          ? 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white border-2 border-amber-600 shadow-md ring-2 ring-amber-400/40'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-bold text-xs truncate">{acc.name}</span>
                        {tamilAccent === acc.id && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </div>
                      <div className={`text-[10px] font-bold ${tamilAccent === acc.id ? 'text-amber-100' : 'text-amber-700 dark:text-amber-400'}`}>
                        {acc.nativeName}
                      </div>
                      <div className={`text-[9px] mt-1 line-clamp-2 leading-tight ${tamilAccent === acc.id ? 'text-white/90' : 'text-zinc-600 dark:text-zinc-300'}`}>
                        {acc.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Voice Pitch Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Voice Pitch Tone</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">{voicePitch.toFixed(2)}x</span>
                    {voicePitch !== 1.0 && (
                      <button 
                        onClick={() => handlePitchChange(1.0)}
                        className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-bold">Low (0.5)</span>
                  <input 
                    type="range" 
                    min={0.5} 
                    max={1.5} 
                    step={0.05} 
                    value={voicePitch} 
                    onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-600 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-700 dark:text-zinc-300 font-bold">High (1.5)</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold text-zinc-600 dark:text-zinc-400 px-0.5">
                  <span>Deep Resonant</span>
                  <span>Natural (1.0)</span>
                  <span>Articulate Bright</span>
                </div>
              </div>

              {/* 3. Natural Flow Prosody Toggle */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <Radio className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Natural Flow Prosody Mode</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 dark:text-zinc-400">Modulates speed and pauses based on Tamil prosody & compound words</p>
                </div>
                <button 
                  type="button"
                  onClick={handleNaturalFlowToggle}
                  className={`w-11 h-6 rounded-full relative transition-colors ${naturalFlowEnabled ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${naturalFlowEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* 6. Table of Contents & Bookmarks Drawer */}
      {isTocOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 h-full p-6 shadow-2xl flex flex-col space-y-6 animate-in slide-in-from-right">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-2 font-bold text-lg text-[var(--primary)]">
                <BookOpen className="w-5 h-5" />
                <span>Contents & Bookmarks</span>
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
                          stopAudio();
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
                          stopAudio();
                          setCurrentPageIndex(bm.pageIndex);
                          setIsTocOpen(false);
                        }}
                        className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer hover:border-[var(--primary)] transition-all group/bm"
                      >
                        <div className="flex justify-between items-center text-xs font-bold text-[var(--primary)]">
                          <span>Page {bm.pageIndex + 1}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">{new Date(bm.timestamp).toLocaleDateString()}</span>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await db.deleteBookmark(bm.id);
                                if (book) {
                                  const updated = await db.getBookmarks(book.id);
                                  setBookmarks(updated);
                                }
                              }}
                              className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                              title="Delete bookmark"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* 7. Word / Phrase Lookup Sheet (Gemini AI Dictionary) */}
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
              ) : wordLookupError ? (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-800 dark:text-red-300 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{wordLookupError}</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => lookupWord(selectedText)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors mt-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Analysis</span>
                  </button>
                </div>
              ) : wordInfo ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Translation ({getLanguageName(targetLanguage)})</span>
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

                  {/* Educational Grammar & Root Word breakdown */}
                  {wordInfo.rootWord && (
                    <div className="p-2 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
                        Root Word (பகுதி / மூலம்)
                      </span>
                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{wordInfo.rootWord}</p>
                    </div>
                  )}

                  {wordInfo.grammarNote && (
                    <div className="p-2 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                        Grammar Note & Inflection
                      </span>
                      <p className="text-[11px] text-gray-700 dark:text-gray-300">{wordInfo.grammarNote}</p>
                    </div>
                  )}

                  {wordInfo.exampleSentence && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Example Usage</span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 italic">"{wordInfo.exampleSentence}"</p>
                    </div>
                  )}

                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={() => {
                        if (ttsEngine === 'gemini') {
                          getGeminiAudioUrl(wordInfo.word, selectedGeminiVoice, sourceLanguage).then(url => {
                            const a = new Audio(url);
                            a.play();
                          });
                        } else {
                          const utterance = new SpeechSynthesisUtterance(normalizeTextForSpeech(wordInfo.word));
                          utterance.lang = getLanguageLocale(sourceLanguage);
                          window.speechSynthesis.speak(utterance);
                        }
                      }}
                      className="flex-1 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-semibold flex items-center justify-center gap-1 hover:bg-gray-200"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Pronounce</span>
                    </button>

                    <button 
                      onClick={handleSaveVocabulary}
                      disabled={savedVocab}
                      className="flex-1 py-2 rounded-xl bg-[var(--primary)] text-white font-semibold flex items-center justify-center gap-1 hover:bg-indigo-700 disabled:bg-emerald-600 transition-colors"
                    >
                      {savedVocab ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{savedVocab ? "Saved" : "Add to Vocabulary"}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center space-y-2">
                  <p className="text-xs text-gray-500">Could not fetch dictionary details.</p>
                  <button 
                    type="button"
                    onClick={() => lookupWord(selectedText)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--primary)] text-white rounded-lg text-xs font-semibold"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Try Again</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. AI Literary Tutor & Quiz Slide-over Drawer */}
      <AiTutorSheet
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        pageText={cleanParagraphs.join(' ') || rawPageText || ''}
        bookTitle={book?.title || 'Book Reader'}
        chapterTitle={chapterTitle}
        sourceLanguage={sourceLanguage}
        targetLanguage={targetLanguage}
        onSelectWordLookup={(w) => lookupWord(w)}
      />

    </div>
  );
}
