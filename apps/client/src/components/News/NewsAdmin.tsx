import { useEffect, useState } from 'react'
import { useNewsStore } from '../../store/newsStore'
import { useAppStore } from '../../store/appStore'

export default function NewsAdmin() {
  const { briefings, isFetching, error, fetchBriefings, createBriefing, deleteBriefing, fetchDaily } = useNewsStore()
  const { navigateTo } = useAppStore()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [content, setContent] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [scrapeDate, setScrapeDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    fetchBriefings()
  }, [fetchBriefings])

  const handlePublish = async () => {
    if (!title.trim() || !content.trim() || !date) return
    setPublishing(true)
    await createBriefing({ title: title.trim(), content: content.trim(), date })
    setTitle('')
    setContent('')
    setDate(new Date().toISOString().slice(0, 10))
    setPublishing(false)
  }

  return (
    <div className="min-h-full bg-surface-secondary">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary">简报管理</h1>
          <button
            onClick={() => navigateTo('news')}
            className="text-sm text-[#4CAF50] hover:underline"
          >
            ← 返回新闻
          </button>
        </div>

        {/* Scrape section */}
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <h2 className="text-base font-semibold text-text-primary mb-3">抓取 AI 日报</h2>
          <p className="text-xs text-text-secondary mb-3">从 ai.hubtoday.app 抓取指定日期的 AI 资讯日报</p>
          {error && (
            <div className="text-xs text-red-500 mb-3 p-2 bg-red-50 rounded">{error}</div>
          )}
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={scrapeDate}
              onChange={(e) => setScrapeDate(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-[#4CAF50]"
            />
            <button
              onClick={() => fetchDaily(scrapeDate)}
              disabled={isFetching}
              className="px-6 py-2 text-sm font-medium text-white bg-[#4CAF50] rounded-lg hover:bg-[#43A047] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isFetching ? '抓取中...' : '抓取日报'}
            </button>
          </div>
        </div>

        {/* Create form */}
        <div className="bg-white rounded-xl border border-border p-6 mb-8">
          <h2 className="text-base font-semibold text-text-primary mb-4">手动发布简报</h2>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="简报标题"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-[#4CAF50]"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-[#4CAF50]"
            />
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="粘贴 Markdown 内容..."
            rows={16}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:border-[#4CAF50] resize-y font-mono"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handlePublish}
              disabled={publishing || !title.trim() || !content.trim()}
              className="px-6 py-2 text-sm font-medium text-white bg-[#4CAF50] rounded-lg hover:bg-[#43A047] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {publishing ? '发布中...' : '发布'}
            </button>
          </div>
        </div>

        {/* Existing briefings */}
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3">已发布 ({briefings.length})</h2>
          {briefings.length === 0 ? (
            <div className="text-sm text-text-secondary py-8 text-center">暂无简报</div>
          ) : (
            <div className="space-y-2">
              {briefings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between bg-white rounded-lg border border-border px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-medium text-text-primary">{b.title}</span>
                    <span className="text-xs text-text-secondary ml-3">{b.date}</span>
                  </div>
                  <button
                    onClick={() => deleteBriefing(b.id)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
