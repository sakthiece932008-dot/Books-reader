import { WordEducationalInfo } from '../types';

export const api = {
  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, sourceLang, targetLang })
    });
    const data = await res.json();
    return data.translation;
  },
  async translateLive(paragraphs: string[], sourceLang: string, targetLang: string): Promise<string[]> {
    const res = await fetch('/api/translate-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paragraphs, sourceLang, targetLang })
    });
    const data = await res.json();
    return data.translations || [];
  },
  async transliterate(text: string, language: string): Promise<string> {
    const res = await fetch('/api/transliterate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language })
    });
    const data = await res.json();
    return data.transliteration;
  },
  async getWordDetails(word: string, contextSentence: string, sourceLang: string, targetLang: string): Promise<WordEducationalInfo> {
    const res = await fetch('/api/word-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, contextSentence, sourceLang, targetLang })
    });
    return await res.json();
  },
  async getTutorAnswer(passage: string, userQuestion: string): Promise<string> {
    const res = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passage, userQuestion })
    });
    const data = await res.json();
    return data.answer;
  },
  async searchAgent(query: string, mode: 'all' | 'books' | 'news' = 'all'): Promise<{
    answer: string;
    sources: { title: string; uri: string }[];
    query: string;
    timestamp: string;
  }> {
    const res = await fetch('/api/search-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mode })
    });
    return await res.json();
  }
};
