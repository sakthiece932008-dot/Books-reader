export interface BookChapter {
  title: string;
  pages: string[];
}

export interface BookEntity {
  id: number;
  title: string;
  author: string;
  filePath: string;
  fileType: string; // PDF, EPUB, TXT, SAMPLE
  language: string; // ta, en, fr, es, hi, etc.
  lastReadPageIndex: number;
  totalPages: number;
  coverResName?: string;
  coverUri?: string;
  coverBg?: string;
  description: string;
  addedTimestamp: number;
  category?: string;
  chapters?: BookChapter[];
  fullContent?: string;
}

export interface VocabularyEntity {
  id: number;
  word: string;
  sourceLanguage: string;
  targetLanguage: string;
  translation: string;
  transliteration: string;
  definition: string;
  exampleSentence: string;
  mastered: boolean;
  addedTimestamp: number;
}

export interface BookmarkEntity {
  id: number;
  bookId: number;
  pageIndex: number;
  selectedText: string;
  note: string;
  timestamp: number;
}

export interface WordEducationalInfo {
  word: string;
  translation: string;
  transliteration: string;
  partOfSpeech: string;
  definition: string;
  exampleSentence: string;
  pronunciationTip: string;
}

export type ReaderTheme = 'paper' | 'sepia' | 'dark' | 'mint';
export type ReaderFont = 'serif' | 'sans' | 'mono' | 'dyslexic';
export type ReadingMode = 'standard' | 'dual' | 'interlinear';
