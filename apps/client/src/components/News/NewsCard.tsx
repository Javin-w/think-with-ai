import type { NewsItem } from '@repo/types'

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

const SOURCE_LABELS: Record<string, string> = {
  jiqizhixin: '机器之心',
  '36kr': '36氪',
  'techcrunch-ai': 'TechCrunch AI',
}

interface NewsCardProps {
  item: NewsItem
}

export default function NewsCard({ item }: NewsCardProps) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-lg border border-border p-4 hover:shadow-md hover:border-[#4CAF50]/30 transition-all"
    >
      <h3 className="text-sm font-semibold text-text-primary mb-2 line-clamp-2">
        {item.title}
      </h3>
      <p className="text-xs text-text-secondary mb-3 line-clamp-3">
        {item.summary}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#4CAF50] font-medium">
          {SOURCE_LABELS[item.sourceId] ?? item.sourceId}
        </span>
        <span className="text-xs text-text-secondary">
          {relativeTime(item.publishedAt)}
        </span>
      </div>
    </a>
  )
}
