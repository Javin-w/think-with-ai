import { XMLParser } from 'fast-xml-parser'
import type { RssSource } from './sources'

export interface RawArticle {
  title: string
  link: string
  pubDate: string
  description: string
  sourceId: string
  language: 'zh' | 'en'
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

export async function fetchRssArticles(source: RssSource): Promise<RawArticle[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(source.url, {
      headers: { 'User-Agent': 'ThinkWithAI-NewsBot/1.0' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      console.error(`[news] Failed to fetch ${source.name}: HTTP ${response.status}`)
      return []
    }

    const xml = await response.text()
    const parsed = parser.parse(xml)

    // Handle RSS 2.0 format
    const rssItems = parsed?.rss?.channel?.item
    if (rssItems) {
      const items = Array.isArray(rssItems) ? rssItems : [rssItems]
      return items.map((item: any) => ({
        title: item.title ?? '',
        link: item.link ?? '',
        pubDate: item.pubDate ?? '',
        description: stripHtml(item.description ?? ''),
        sourceId: source.id,
        language: source.language,
      }))
    }

    // Handle Atom format
    const atomEntries = parsed?.feed?.entry
    if (atomEntries) {
      const entries = Array.isArray(atomEntries) ? atomEntries : [atomEntries]
      return entries.map((entry: any) => ({
        title: entry.title ?? '',
        link: typeof entry.link === 'string' ? entry.link : (entry.link?.['@_href'] ?? ''),
        pubDate: entry.published ?? entry.updated ?? '',
        description: stripHtml(entry.summary ?? entry.content ?? ''),
        sourceId: source.id,
        language: source.language,
      }))
    }

    console.error(`[news] Unknown feed format for ${source.name}`)
    return []
  } catch (error) {
    console.error(`[news] Error fetching ${source.name}:`, error instanceof Error ? error.message : error)
    return []
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}
