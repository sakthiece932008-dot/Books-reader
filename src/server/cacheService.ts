// In-memory LRU-like cache for AI Tutor and Word lookups
interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxItems: number;

  constructor(maxItems = 500) {
    this.maxItems = maxItems;
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  set<T>(key: string, data: T, ttlMs = 1000 * 60 * 60 * 24): void {
    if (this.cache.size >= this.maxItems) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const aiCache = new MemoryCache();

export function makeCacheKey(...parts: (string | number | undefined)[]): string {
  return parts
    .map(p => (p === undefined || p === null ? '' : String(p).trim().toLowerCase()))
    .join('::');
}
