import localforage from 'localforage';
import { BookEntity, VocabularyEntity, BookmarkEntity } from '../types';

localforage.config({
  name: 'PolyGlotReader',
  version: 1.0,
  storeName: 'data'
});

const BOOKS_KEY = 'books';
const VOCAB_KEY = 'vocabulary';
const BOOKMARKS_KEY = 'bookmarks';

export const db = {
  async getBooks(): Promise<BookEntity[]> {
    const books = await localforage.getItem<BookEntity[]>(BOOKS_KEY);
    return books || [];
  },
  async getBook(id: number): Promise<BookEntity | undefined> {
    const books = await this.getBooks();
    return books.find(b => b.id === id);
  },
  async saveBook(book: BookEntity): Promise<void> {
    const books = await this.getBooks();
    const existingIndex = books.findIndex(b => b.id === book.id);
    if (existingIndex >= 0) {
      books[existingIndex] = book;
    } else {
      if (!book.id) book.id = Date.now();
      books.push(book);
    }
    await localforage.setItem(BOOKS_KEY, books);
  },
  async deleteBook(id: number): Promise<void> {
    const books = await this.getBooks();
    await localforage.setItem(BOOKS_KEY, books.filter(b => b.id !== id));
  },
  async getVocabulary(): Promise<VocabularyEntity[]> {
    const vocab = await localforage.getItem<VocabularyEntity[]>(VOCAB_KEY);
    return vocab || [];
  },
  async saveVocabulary(vocab: VocabularyEntity): Promise<void> {
    const all = await this.getVocabulary();
    const existingIndex = all.findIndex(v => v.id === vocab.id);
    if (existingIndex >= 0) {
      all[existingIndex] = vocab;
    } else {
      if (!vocab.id) vocab.id = Date.now();
      all.push(vocab);
    }
    await localforage.setItem(VOCAB_KEY, all);
  },
  async deleteVocabulary(id: number): Promise<void> {
    const all = await this.getVocabulary();
    await localforage.setItem(VOCAB_KEY, all.filter(v => v.id !== id));
  },
  async getBookmarks(bookId?: number): Promise<BookmarkEntity[]> {
    const bookmarks = await localforage.getItem<BookmarkEntity[]>(BOOKMARKS_KEY) || [];
    if (bookId !== undefined) {
      return bookmarks.filter(bm => bm.bookId === bookId);
    }
    return bookmarks;
  },
  async saveBookmark(bookmark: BookmarkEntity): Promise<void> {
    const bookmarks = await this.getBookmarks();
    if (!bookmark.id) bookmark.id = Date.now();
    bookmarks.push(bookmark);
    await localforage.setItem(BOOKMARKS_KEY, bookmarks);
  },
  async deleteBookmark(id: number): Promise<void> {
    const bookmarks = await this.getBookmarks();
    await localforage.setItem(BOOKMARKS_KEY, bookmarks.filter(bm => bm.id !== id));
  }
};
