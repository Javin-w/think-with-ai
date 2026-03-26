import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNewsStore } from '../../store/newsStore'

function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return '从未更新'
  const minutes = Math.floor((Date.now() - timestamp) / 60000)
  if (minutes < 1) return '刚刚更新'
  if (minutes < 60) return `${minutes}分钟前更新`
  const hours = Math.floor(minutes / 60)
  return `${hours}小时前更新`
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function NewsModule() {
  const { items, isLoading, lastUpdated, error, fetchNews, refreshNews } = useNewsStore()

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  // Group items by date
  const groupedByDate = items.reduce<Record<string, typeof items>>((acc, item) => {
    const date = formatDate(item.publishedAt)
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-surface-secondary">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">AI 新闻</h1>
            <p className="text-sm text-text-secondary mt-1">
              数据来源：AI洞察日报
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">
              {formatLastUpdated(lastUpdated)}
            </span>
            <button
              onClick={refreshNews}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-[#4CAF50] rounded-lg hover:bg-[#43A047] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '加载中...' : '刷新'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-text-secondary">正在获取最新 AI 资讯...</div>
          </div>
        ) : error && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-3xl">⚠️</div>
            <div className="text-sm text-text-secondary">{error}</div>
            <button
              onClick={refreshNews}
              className="mt-2 px-4 py-2 text-sm text-white bg-[#4CAF50] rounded-lg hover:bg-[#43A047] transition-colors"
            >
              重试
            </button>
          </div>
        ) : (
          /* Briefing style: grouped by date */
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <article key={date} className="bg-white rounded-xl border border-border p-6">
                <h2 className="text-lg font-bold text-text-primary mb-4 pb-3 border-b border-border">
                  📰 AI 资讯日报 {date}
                </h2>
                <div className="space-y-4">
                  {groupedByDate[date].map((item) => (
                    <div key={item.id} className="group">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-text-primary hover:text-[#4CAF50] transition-colors"
                      >
                        {item.title}
                      </a>
                      {item.summary && (
                        <div className="mt-1.5 text-sm text-text-secondary leading-relaxed prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {item.summary}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
