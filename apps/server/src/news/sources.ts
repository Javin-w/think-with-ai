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
  { id: 'hn', name: 'Hacker News', url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT&count=15', language: 'en' },
  // Twitter/X via RSSHub public instance
  { id: 'twitter-openai', name: 'OpenAI (X)', url: 'https://rsshub.app/twitter/user/OpenAI', language: 'en' },
  { id: 'twitter-sama', name: 'Sam Altman (X)', url: 'https://rsshub.app/twitter/user/sama', language: 'en' },
  { id: 'twitter-karpathy', name: 'Karpathy (X)', url: 'https://rsshub.app/twitter/user/kaborfficial', language: 'en' },
  { id: 'twitter-ylecun', name: 'Yann LeCun (X)', url: 'https://rsshub.app/twitter/user/ylecun', language: 'en' },
  { id: 'twitter-anthropic', name: 'Anthropic (X)', url: 'https://rsshub.app/twitter/user/AnthropicAI', language: 'en' },
]
