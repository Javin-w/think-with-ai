import { useEffect } from 'react'
import { useNewsStore } from '../../store/newsStore'
import NewsFeed from './NewsFeed'

function formatLastUpdated(timestamp: number | null): string {
  if (!timestamp) return '从未更新'
  const minutes = Math.floor((Date.now() - timestamp) / 60000)
  if (minutes < 1) return '刚刚更新'
  if (minutes < 60) return `${minutes}分钟前更新`
  const hours = Math.floor(minutes / 60)
  return `${hours}小时前更新`
}

export default function NewsModule() {
  const { items, isLoading, lastUpdated, error, fetchNews, refreshNews } = useNewsStore()

  useEffect(() => {
    fetchNews()
  }, [fetchNews])

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-surface-secondary">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">AI 新闻</h1>
            <p className="text-sm text-text-secondary mt-1">
              聚合 AI 领域最新资讯，AI 自动摘要
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

        {/* Loading state */}
        {isLoading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-text-secondary">正在获取最新新闻，首次加载可能需要几秒...</div>
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
          <NewsFeed items={items} />
        )}
      </div>
    </div>
  )
}
