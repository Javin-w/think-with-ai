import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNewsStore } from '../../store/newsStore'
import { useAppStore } from '../../store/appStore'

export default function NewsModule() {
  const { briefings, currentBriefing, isLoading, fetchBriefings, fetchBriefing } = useNewsStore()
  const { navigateTo } = useAppStore()

  useEffect(() => {
    fetchBriefings()
  }, [fetchBriefings])

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left: date list */}
      <div className="w-56 shrink-0 border-r border-border bg-surface overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">AI 简报</h2>
          <button
            onClick={() => navigateTo('news-admin')}
            className="text-xs text-[#4CAF50] hover:underline"
          >
            管理
          </button>
        </div>
        {briefings.length === 0 && !isLoading ? (
          <div className="p-4 text-xs text-text-secondary">暂无简报</div>
        ) : (
          <div className="py-1">
            {briefings.map((b) => (
              <button
                key={b.id}
                onClick={() => fetchBriefing(b.id)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  currentBriefing?.id === b.id
                    ? 'bg-[#4CAF50]/10 text-[#4CAF50] font-medium'
                    : 'text-text-secondary hover:bg-surface-secondary'
                }`}
              >
                <div className="font-medium text-text-primary text-xs">{b.date}</div>
                <div className="text-xs mt-0.5 line-clamp-1">{b.title}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: markdown content */}
      <div className="flex-1 overflow-y-auto bg-surface-secondary">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-[#4CAF50] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentBriefing ? (
          <div className="max-w-3xl mx-auto px-8 py-8">
            <h1 className="text-2xl font-bold text-text-primary mb-1">{currentBriefing.title}</h1>
            <div className="text-xs text-text-secondary mb-6">{currentBriefing.date}</div>
            <article className="prose prose-sm max-w-none text-text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentBriefing.content}
              </ReactMarkdown>
            </article>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <div className="text-4xl mb-3">📰</div>
            <p className="text-sm">暂无简报，点击右上角"管理"上传</p>
          </div>
        )}
      </div>
    </div>
  )
}
