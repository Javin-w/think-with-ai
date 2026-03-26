export interface RssSource {
  id: string
  name: string
  url: string
  language: 'zh' | 'en'
}

export const RSS_SOURCES: RssSource[] = [
  { id: 'ai-insight', name: 'AI洞察日报', url: 'https://justlovemaki.github.io/CloudFlare-AI-Insight-Daily/rss.xml', language: 'zh' },
  { id: '36kr', name: '36氪', url: 'https://36kr.com/feed', language: 'zh' },
  { id: 'jiqizhixin', name: '机器之心', url: 'https://www.jiqizhixin.com/rss', language: 'zh' },
  { id: 'hn', name: 'Hacker News', url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT&count=15', language: 'en' },
]
