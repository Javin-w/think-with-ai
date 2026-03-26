export interface RssSource {
  id: string
  name: string
  url: string
  language: 'zh' | 'en'
}

export const RSS_SOURCES: RssSource[] = [
  { id: 'ai-insight', name: 'AI洞察日报', url: 'https://justlovemaki.github.io/CloudFlare-AI-Insight-Daily/rss.xml', language: 'zh' },
]
