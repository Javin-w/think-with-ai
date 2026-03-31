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
    <div className="h-full flex">
      {/* Left: Input + Recent */}
      <div className="flex-1 flex flex-col px-10 py-8 overflow-y-auto">
        <h1 className="text-xl font-semibold text-text-primary mb-6">
          {getGreeting()}，今天搞什么？
        </h1>

        {/* Input area */}
        <div className="bg-white border border-border rounded-2xl p-4 mb-6">
          {/* Mode tabs */}
          <div className="flex gap-1.5 mb-3">
            <button
              onClick={() => setMode('thinking')}
              className={`px-3.5 py-1 text-xs rounded-full border transition-colors ${
                mode === 'thinking'
                  ? 'bg-brand/10 border-brand text-brand font-medium'
                  : 'border-border text-text-secondary hover:border-brand/30'
              }`}
            >
              🧠 AI 思考
            </button>
            <button
              onClick={() => setMode('prototype')}
              className={`px-3.5 py-1 text-xs rounded-full border transition-colors ${
                mode === 'prototype'
                  ? 'bg-brand/10 border-brand text-brand font-medium'
                  : 'border-border text-text-secondary hover:border-brand/30'
              }`}
            >
              🎨 做原型
            </button>
          </div>

          {/* Textarea */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'thinking' ? '输入一个问题，开始 AI 思考...' : '描述你的需求，AI 帮你生成原型...'}
            rows={3}
            className="w-full text-sm text-text-primary placeholder:text-text-secondary/50 resize-none outline-none leading-relaxed"
          />

          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="px-5 py-1.5 text-xs font-medium text-white bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-30 transition-colors"
            >
              开始 →
            </button>
          </div>
        </div>

        {/* Quick link to news */}
        <button
          onClick={() => navigateTo('news')}
          className="mb-6 text-xs text-text-secondary hover:text-brand transition-colors self-start flex items-center gap-1"
        >
          📰 查看今日 AI 新闻 →
        </button>
      </div>

      {/* Right: Daily reading + Thinking */}
      <div className="w-[380px] shrink-0 border-l border-border bg-surface-secondary overflow-y-auto p-6">
        {/* 每日早读 */}
        <div className="bg-white border border-border rounded-xl p-4 mb-4">
          <h3 className="text-xs font-semibold text-text-primary mb-2.5 flex items-center gap-1.5">
            📰 每日早读
          </h3>
          {todaySummary ? (
            <>
              <div className="text-xs text-text-secondary leading-relaxed prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {todaySummary}
                </ReactMarkdown>
              </div>
              <button
                onClick={() => navigateTo('news')}
                className="mt-3 text-xs text-brand font-medium hover:underline"
              >
                查看完整日报 →
              </button>
            </>
          ) : (
            <p className="text-xs text-text-secondary/60">暂无今日早读，前往 AI 新闻同步</p>
          )}
        </div>

        {/* 今日思考 */}
        {todayQuestions && todayQuestions.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-2.5 flex items-center gap-1.5">
              💡 今日思考
            </h3>
            <div className="space-y-2.5">
              {todayQuestions.map((q, i) => (
                <div key={i} className="flex gap-2.5">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-brand/10 text-brand text-[10px] font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
