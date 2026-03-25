import type { NewsItem } from '@repo/types'
import NewsCard from './NewsCard'

interface NewsFeedProps {
  items: NewsItem[]
}

export default function NewsFeed({ items }: NewsFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
        <span className="text-4xl mb-3">📰</span>
        <p className="text-sm">暂无新闻，点击刷新获取最新资讯</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <NewsCard key={item.id} item={item} />
      ))}
    </div>
  )
}
