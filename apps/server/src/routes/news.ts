import { Hono } from 'hono'
import crypto from 'node:crypto'
import type { NewsItem } from '@repo/types'
import { RSS_SOURCES } from '../news/sources'
import { fetchRssArticles, type RawArticle } from '../news/fetcher'
import { getCachedNews, isCacheStale, updateCache, getLastFetchTime, isCached } from '../news/cache'
import { summarizeArticle } from '../news/summarizer'

const news = new Hono()

function articleId(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex')
}

async function refreshAllNews(): Promise<void> {
  // 1. Fetch all RSS sources in parallel
  const allRawArticles = await Promise.all(
    RSS_SOURCES.map((source) => fetchRssArticles(source)),
  )
  const rawArticles = allRawArticles.flat()

  // 2. Filter out already cached articles
  const newArticles = rawArticles.filter((a) => !isCached(articleId(a.link)))
  if (newArticles.length === 0) return

  // 3. Summarize new articles in batches of 3
  const newsItems: NewsItem[] = []
  for (let i = 0; i < newArticles.length; i += 3) {
    const batch = newArticles.slice(i, i + 3)
    const summaries = await Promise.all(
      batch.map((a) => summarizeArticle(a.title, a.description, a.language)),
    )
    for (let j = 0; j < batch.length; j++) {
      const article = batch[j]
      newsItems.push({
        id: articleId(article.link),
        sourceId: article.sourceId,
        title: article.title,
        url: article.link,
        publishedAt: new Date(article.pubDate).getTime() || Date.now(),
        summary: summaries[j],
      })
    }
  }

  // 4. Update cache
  updateCache(newsItems)
}

// GET / — return cached news; trigger background refresh if stale
news.get('/', (c) => {
  if (isCacheStale()) {
    // Fire-and-forget background refresh
    refreshAllNews().catch((err) =>
      console.error('[news] Background refresh failed:', err),
    )
  }

  return c.json({
    items: getCachedNews(),
    lastUpdated: getLastFetchTime(),
    sources: RSS_SOURCES.map((s) => s.name),
  })
})

// POST /refresh — force refresh and return updated news
news.post('/refresh', async (c) => {
  await refreshAllNews()
  return c.json({
    items: getCachedNews(),
    lastUpdated: getLastFetchTime(),
    sources: RSS_SOURCES.map((s) => s.name),
  })
})

export default news
