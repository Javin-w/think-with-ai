import { Hono } from 'hono'
import crypto from 'node:crypto'
import type { NewsItem } from '@repo/types'
import { RSS_SOURCES } from '../news/sources'
import { fetchRssArticles } from '../news/fetcher'
import { getCachedNews, isCacheStale, updateCache, getLastFetchTime, isCached } from '../news/cache'

const news = new Hono()

function articleId(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex')
}

async function refreshAllNews(): Promise<void> {
  const allRawArticles = await Promise.all(
    RSS_SOURCES.map((source) => fetchRssArticles(source)),
  )
  const rawArticles = allRawArticles.flat()

  const newArticles = rawArticles.filter((a) => !isCached(articleId(a.link)))
  if (newArticles.length === 0) return

  const newsItems: NewsItem[] = newArticles.map((article) => ({
    id: articleId(article.link),
    sourceId: article.sourceId,
    title: article.title,
    url: article.link,
    publishedAt: new Date(article.pubDate).getTime() || Date.now(),
    summary: article.description,
  }))

  updateCache(newsItems)
}

// GET / — return cached news; wait on first load, background refresh after
news.get('/', async (c) => {
  const cached = getCachedNews()

  if (cached.length === 0 && isCacheStale()) {
    try {
      await refreshAllNews()
    } catch (err) {
      console.error('[news] Initial refresh failed:', err)
    }
  } else if (isCacheStale()) {
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
