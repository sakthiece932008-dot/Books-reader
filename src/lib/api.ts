import { WordEducationalInfo, GrammarBreakdown, ComprehensionQuiz } from '../types';

const API_BASE_URL = (() => {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol || '';
  const origin = window.location.origin || '';
  // If running inside Capacitor APK on mobile device with file/capacitor protocol
  if (
    origin.includes('capacitor://') ||
    protocol === 'capacitor:' ||
    protocol === 'file:'
  ) {
    return 'https://ais-pre-ogvity25sbbpzix6i7lf2u-560048511170.asia-east1.run.app';
  }
  // Standard web application running in browser (uses same-origin relative URLs)
  return '';
})();

async function safeFetch(
  path: string, 
  options: RequestInit, 
  timeoutMs: number = 35000, 
  retries: number = 2
): Promise<any> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('You are currently offline. Please check your internet connection.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data: any = null;

      if (rawText && rawText.trim().length > 0) {
        try {
          data = JSON.parse(rawText);
        } catch {
          // If server returned non-JSON content (e.g., HTML error or SPA page)
          if (!res.ok) {
            throw new Error(`Server request failed with status ${res.status}`);
          }
          throw new Error('The service returned an unexpected response format.');
        }
      } else {
        data = {};
      }

      if (!res.ok) {
        const message = data?.error || data?.message || `Server request failed with status ${res.status}`;
        throw new Error(message);
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);
      const isLastAttempt = attempt === retries;

      if (!isLastAttempt) {
        // Exponential backoff delay (300ms, 900ms...)
        const delay = Math.pow(3, attempt) * 300;
        await new Promise(res => setTimeout(res, delay));
        continue;
      }

      if (error.name === 'AbortError') {
        throw new Error('Service response took longer than usual. Please retry.');
      }
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('Failed to load')) {
        throw new Error('Unable to connect to server. Please check your connection or retry.');
      }
      throw error;
    }
  }
}

export const api = {
  async checkHealth(): Promise<{ status: string; online: boolean; hasGeminiKey: boolean }> {
    return await safeFetch('/api/health', { method: 'GET' }, 5000);
  },

  // Real Email OTP Authentication APIs
  async sendEmailOtp(email: string, name?: string): Promise<{
    success: boolean;
    message: string;
    code?: string;
    expiresInSeconds: number;
    previewUrl?: string;
    isLiveDelivered: boolean;
    hasCustomSmtp?: boolean;
  }> {
    return await safeFetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    });
  },

  async verifyEmailOtp(email: string, code: string, name?: string): Promise<{
    success: boolean;
    user: {
      email: string;
      name: string;
      verified: boolean;
      authProvider: 'email';
      token: string;
      verifiedAt: string;
    };
  }> {
    return await safeFetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, name })
    });
  },

  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const data = await safeFetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang, targetLang })
    });
    return data.translation;
  },

  async translateLive(paragraphs: string[], sourceLang: string, targetLang: string): Promise<string[]> {
    const data = await safeFetch('/api/translate-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paragraphs, sourceLang, targetLang })
    });
    return data.translations || [];
  },

  async transliterate(text: string, language: string): Promise<string> {
    const data = await safeFetch('/api/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    });
    return data.transliteration;
  },

  async getWordDetails(word: string, contextSentence: string, sourceLang: string, targetLang: string): Promise<WordEducationalInfo> {
    return await safeFetch('/api/word-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, contextSentence, sourceLang, targetLang })
    });
  },

  async getGrammarBreakdown(sentence: string, pageContext: string, sourceLang: string, targetLang: string): Promise<GrammarBreakdown> {
    return await safeFetch('/api/tutor/grammar-breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence, pageContext, sourceLang, targetLang })
    });
  },

  async getComprehensionQuiz(pageText: string, bookTitle?: string, chapterOrPage?: string, targetLang?: string): Promise<ComprehensionQuiz> {
    return await safeFetch('/api/tutor/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageText, bookTitle, chapterOrPage, targetLang })
    });
  },

  async getTutorAnswer(passage: string, userQuestion: string, sourceLang: string = 'ta', targetLang: string = 'en'): Promise<string> {
    const data = await safeFetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passage, userQuestion, sourceLang, targetLang })
    });
    return data.answer;
  },

  // Stream AI Tutor responses in real-time via Server-Sent Events (SSE)
  streamTutorAnswer(
    passage: string,
    userQuestion: string,
    sourceLang: string = 'ta',
    targetLang: string = 'en',
    onChunk: (text: string) => void,
    onDone: () => void,
    onError: (err: any) => void
  ): () => void {
    const query = new URLSearchParams({
      q: userQuestion,
      passage: passage.slice(0, 1500),
      sourceLang,
      targetLang
    });

    const url = `${API_BASE_URL}/api/tutor/stream?${query.toString()}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.chunk) {
          onChunk(payload.chunk);
        }
        if (payload.done) {
          eventSource.close();
          onDone();
        }
      } catch (e) {
        console.error("SSE parse error:", e);
      }
    };

    eventSource.onerror = (err) => {
      console.warn("SSE stream error, falling back to sync:", err);
      eventSource.close();
      // Trigger fallback sync call
      api.getTutorAnswer(passage, userQuestion, sourceLang, targetLang)
        .then(ans => {
          onChunk(ans);
          onDone();
        })
        .catch(syncErr => onError(syncErr));
    };

    // Return abort function
    return () => {
      eventSource.close();
    };
  },

  async generateSpeech(text: string, voiceName: string = 'Kore', language: string = 'ta'): Promise<{ audio: string; mimeType: string }> {
    return await safeFetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceName, language })
    });
  },

  async searchAgent(query: string, mode: 'all' | 'books' | 'news' = 'all'): Promise<{
    answer: string;
    readableText?: string;
    bookMetadata?: { title: string; author: string };
    directBooks?: Array<{ title: string; author: string; downloadUrl?: string; source: string }>;
    sources: { title: string; uri: string }[];
    query: string;
    timestamp: string;
  }> {
    return await safeFetch('/api/search-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mode })
    });
  },

  async fetchBookUrl(url: string, title?: string): Promise<{ title: string; content: string; length: number }> {
    return await safeFetch('/api/fetch-book-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title })
    });
  },

  async extractCleanParagraphs(text: string, bookTitle?: string, language?: string): Promise<string[]> {
    const data = await safeFetch('/api/extract-clean-paragraphs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, bookTitle, language })
    });
    return data.paragraphs || [];
  },

  async cleanBookPages(pages: string[]): Promise<string[]> {
    const data = await safeFetch('/api/clean-book-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages })
    });
    return data.pages || [];
  }
};

