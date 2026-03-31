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
      // Create new thinking tree with this question
      useTreeStore.setState({ currentTreeId: null, currentNodeId: null, nodes: [] })
      navigateTo('thinking-tree')
      // The input will be used as the first message — store it temporarily
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
    <div className="h-full flex bg-surface">
      {/* Left: Input area */}
      <div className="flex-1 flex flex-col justify-center px-10">
        <h1 className="text-2xl font-semibold text-text-primary mb-6">
          {getGreeting()}，今天搞什么？
        </h1>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode('thinking')}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              mode === 'thinking'
                ? 'bg-brand/10 border-brand text-brand font-medium'
                : 'border-border text-text-secondary hover:border-brand/30'
            }`}
          >
            🧠 AI 思考
          </button>
          <button
            onClick={() => setMode('prototype')}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              mode === 'prototype'
                ? 'bg-brand/10 border-brand text-brand font-medium'
                : 'border-border text-text-secondary hover:border-brand/30'
            }`}
          >
            🎨 做原型
          </button>
        </div>

        {/* Input */}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'thinking' ? '输入一个问题，开始 AI 思考...' : '描述你的需求，AI 帮你生成原型...'}
            rows={4}
            className="w-full px-4 py-3 text-sm border border-border rounded-xl resize-none focus:outline-none focus:border-brand bg-white"
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="absolute right-3 bottom-3 px-4 py-1.5 text-xs font-medium text-white bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-30 transition-colors"
          >
            开始
          </button>
        </div>

        {/* Quick link to news */}
        <button
          onClick={() => navigateTo('news')}
          className="mt-4 text-xs text-text-secondary hover:text-brand transition-colors self-start"
        >
          📰 查看今日 AI 新闻 →
        </button>
      </div>

      {/* Right: Daily reading + Thinking questions */}
      <div className="w-[420px] shrink-0 border-l border-border bg-surface-secondary overflow-y-auto px-6 py-8">
        {/* 每日早读 */}
        {todaySummary ? (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
              📰 每日早读
            </h2>
            <button
              onClick={() => navigateTo('news')}
              className="w-full text-left bg-white border border-border rounded-xl p-4 hover:border-brand/30 hover:shadow-sm transition-all"
            >
              <div className="prose prose-sm max-w-none text-text-secondary text-xs leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {todaySummary}
                </ReactMarkdown>
              </div>
              <div className="mt-3 text-xs text-brand font-medium">
                查看完整日报 →
              </div>
            </button>
          </div>
        ) : (
          <div className="mb-8 text-center py-8 text-text-secondary">
            <div className="text-2xl mb-2">📰</div>
            <p className="text-xs">暂无今日早读</p>
            <p className="text-xs mt-1">前往 AI 新闻页面同步日报</p>
          </div>
        )}

        {/* 今日思考 */}
        {todayQuestions && todayQuestions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
              💡 今日思考
            </h2>
            <div className="bg-white border border-border rounded-xl p-4 space-y-3">
              {todayQuestions.map((q, i) => (
                <div key={i} className="flex gap-2.5 text-xs text-text-secondary">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-semibold flex items-center justify-center mt-0.5">
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
