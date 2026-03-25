import type { NewsItem } from '@repo/types'

const newsCache = new Map<string, NewsItem>()
let lastFetchTime = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

export function getCachedNews(): NewsItem[] {
  return Array.from(newsCache.values())
    .sort((a, b) => b.publishedAt - a.publishedAt)
}

export function isCacheStale(): boolean {
  return Date.now() - lastFetchTime > CACHE_TTL
}

export function updateCache(items: NewsItem[]): void {
  for (const item of items) {
    newsCache.set(item.id, item)
  }
  lastFetchTime = Date.now()
}

export function getLastFetchTime(): number {
  return lastFetchTime
}

export function isCached(id: string): boolean {
  return newsCache.has(id)
}
