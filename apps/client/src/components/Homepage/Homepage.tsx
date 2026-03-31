import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAppStore } from '../../store/appStore'
import { useNewsStore } from '../../store/newsStore'
import { useTreeStore } from '../../store/treeStore'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

export default function Homepage() {
  const { navigateTo } = useAppStore()
  const { todaySummary, todayQuestions, fetchToday } = useNewsStore()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'thinking' | 'prototype'>('thinking')

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  const handleSubmit = () => {
    if (!input.trim()) return
    if (mode === 'thinking') {
      useTreeStore.setState({ currentTreeId: null, currentNodeId: null, nodes: [] })
      navigateTo('thinking-tree')
      sessionStorage.setItem('pendingMessage', input.trim())
    } else {
      navigateTo('prototype')
      sessionStorage.setItem('pendingMessage', input.trim())
    }
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* Main column */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-text-primary mb-5">
            {getGreeting()}，今天搞什么？
          </h1>

          {/* Input box */}
          <div className="bg-white border border-border rounded-xl p-4 mb-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === 'thinking' ? '输入一个问题，开始 AI 思考...' : '描述你的需求，AI 帮你生成原型...'}
              rows={2}
              className="w-full text-sm text-text-primary placeholder:text-text-secondary/50 resize-none outline-none leading-relaxed"
            />
          </div>

          {/* Toolbar under input */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMode('thinking')}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                  mode === 'thinking'
                    ? 'bg-brand/10 border-brand/30 text-brand font-medium'
                    : 'border-border text-text-secondary hover:border-brand/30'
                }`}
              >
                🧠 AI 思考
              </button>
              <button
                onClick={() => setMode('prototype')}
                className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                  mode === 'prototype'
                    ? 'bg-brand/10 border-brand/30 text-brand font-medium'
                    : 'border-border text-text-secondary hover:border-brand/30'
                }`}
              >
                🎨 做原型
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="w-7 h-7 flex items-center justify-center text-white bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-30 transition-colors text-xs"
            >
              ▶
            </button>
          </div>

          {/* Feed: 每日早读 */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text-primary mb-3">每日早读</h2>
          </div>

          {todaySummary ? (
            <button
              onClick={() => navigateTo('news')}
              className="w-full text-left bg-white border border-border rounded-xl p-5 hover:border-brand/30 transition-colors mb-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">📰</span>
                <span className="text-xs font-medium text-text-primary">AI 资讯日报</span>
                <span className="text-xs text-text-secondary">· 今天</span>
              </div>
              <div className="prose prose-sm max-w-none text-text-secondary text-xs leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {todaySummary}
                </ReactMarkdown>
              </div>
              <div className="mt-3 text-xs text-brand font-medium">
                阅读完整日报 →
              </div>
            </button>
          ) : (
            <div className="bg-white border border-border rounded-xl p-5 text-center">
              <p className="text-xs text-text-secondary">暂无今日早读</p>
              <button
                onClick={() => navigateTo('news')}
                className="mt-2 text-xs text-brand hover:underline"
              >
                前往 AI 新闻同步 →
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar: 今日思考 */}
        <div className="w-[280px] shrink-0">
          {todayQuestions && todayQuestions.length > 0 && (
            <div className="sticky top-8">
              <h2 className="text-sm font-semibold text-text-primary mb-3">💡 今日思考</h2>
              <div className="space-y-4">
                {todayQuestions.map((q, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand/40 mt-1.5" />
                    <p className="text-xs text-text-secondary leading-relaxed">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
