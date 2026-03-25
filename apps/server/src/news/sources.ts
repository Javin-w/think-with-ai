export interface RssSource {
  id: string
  name: string
  url: string
  language: 'zh' | 'en'
}

export const RSS_SOURCES: RssSource[] = [
  { id: 'jiqizhixin', name: '机器之心', url: 'https://www.jiqizhixin.com/rss', language: 'zh' },
  { id: '36kr', name: '36氪', url: 'https://36kr.com/feed', language: 'zh' },
  { id: 'techcrunch-ai', name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', language: 'en' },
]
