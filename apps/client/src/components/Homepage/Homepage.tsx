import { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore, type AppView } from '../../store/appStore'
import { useNewsStore } from '../../store/newsStore'

const QUICK_ACTIONS: Array<{ icon: string; label: string; view: AppView }> = [
  { icon: '📰', label: 'AI 新闻', view: 'news' },
  { icon: '🎨', label: '做原型', view: 'prototype' },
  { icon: '🧠', label: 'AI 思考', view: 'thinking-list' },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export default function Homepage() {
  const { navigateTo } = useAppStore()
  const { todaySummary, todayQuestions, fetchToday } = useNewsStore()

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Greeting */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-text-primary mb-2">
            {getGreeting()}，有什么可以帮你的？
          </h1>
          <p className="text-text-secondary text-sm mb-8">
            选择一个功能开始
          </p>

          {/* Quick action pills */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.view}
                onClick={() => navigateTo(action.view)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-border rounded-full text-sm text-text-primary hover:border-brand hover:text-brand hover:shadow-sm transition-all"
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 每日早读 */}
        {todaySummary && (
          <div className="mb-8">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span>📰</span> 每日早读
            </h2>
            <button
              onClick={() => navigateTo('news')}
              className="w-full text-left bg-white border border-border rounded-xl p-5 hover:border-brand/30 hover:shadow-sm transition-all"
            >
              <div className="prose prose-sm max-w-none text-text-secondary">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {todaySummary}
                </ReactMarkdown>
              </div>
              <div className="mt-3 text-xs text-brand font-medium">
                查看完整日报 →
              </div>
            </button>
          </div>
        )}

        {/* 今日思考 */}
        {todayQuestions && todayQuestions.length > 0 && (
          <div className="mb-8">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <span>💡</span> 今日思考
            </h2>
            <div className="bg-white border border-border rounded-xl p-5 space-y-3">
              {todayQuestions.map((q, i) => (
                <div key={i} className="flex gap-3 text-sm text-text-secondary">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
