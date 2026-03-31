import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Brain, Palette, Newspaper, Lightbulb, SendHorizontal, ArrowRight } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useNewsStore } from '../../store/newsStore'
import { useTreeStore } from '../../store/treeStore'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

// Truncate summary to ~200 chars for homepage preview
function truncateSummary(text: string, maxLen = 200): string {
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastPeriod = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('，'), cut.lastIndexOf('\n'))
  return (lastPeriod > maxLen * 0.5 ? cut.slice(0, lastPeriod + 1) : cut) + '...'
}

export default function Homepage() {
  const { navigateTo } = useAppStore()
  const { todaySummary, todayQuestions, fetchToday } = useNewsStore()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<'thinking' | 'prototype'>('thinking')

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  const handleSubmit = (text?: string) => {
    const msg = (text || input).trim()
    if (!msg) return
    if (mode === 'thinking') {
      useTreeStore.setState({ currentTreeId: null, currentNodeId: null, nodes: [] })
      navigateTo('thinking-tree')
      sessionStorage.setItem('pendingMessage', msg)
    } else {
      navigateTo('prototype')
      sessionStorage.setItem('pendingMessage', msg)
    }
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleQuestionClick = (question: string) => {
    setMode('thinking')
    setInput(question)
    handleSubmit(question)
  }

  const placeholders: Record<string, string> = {
    thinking: '例如："什么是 Transformer？" 或 "帮我理解强化学习的原理"',
    prototype: '例如："一个简洁的任务管理应用" 或 "水果电商落地页"',
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-blue-50/40 to-surface">
      <div className="max-w-5xl mx-auto px-8 py-10 flex gap-10">
        {/* Main column */}
        <div className="flex-1 min-w-0">
          {/* Hero: Greeting */}
          <h1 className="text-2xl font-bold text-text-primary mb-1">
            {getGreeting()}
          </h1>
          <p className="text-sm text-text-secondary mb-6">有什么可以帮你的？</p>

          {/* Unified input card */}
          <div className="bg-white border border-border rounded-xl shadow-sm mb-8">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholders[mode]}
              rows={3}
              className="w-full px-4 pt-4 pb-2 text-sm text-text-primary placeholder:text-text-secondary/40 resize-none outline-none leading-relaxed rounded-t-xl"
            />
            {/* Toolbar inside card */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMode('thinking')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    mode === 'thinking'
                      ? 'bg-brand/10 border-brand/20 text-brand font-medium shadow-sm'
                      : 'border-transparent text-text-secondary hover:bg-surface-secondary'
                  }`}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>AI 思考</span>
                  {mode === 'thinking' && <span className="text-[10px] opacity-60 ml-0.5">探索概念，构建知识树</span>}
                </button>
                <button
                  onClick={() => setMode('prototype')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    mode === 'prototype'
                      ? 'bg-brand/10 border-brand/20 text-brand font-medium shadow-sm'
                      : 'border-transparent text-text-secondary hover:bg-surface-secondary'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>做原型</span>
                  {mode === 'prototype' && <span className="text-[10px] opacity-60 ml-0.5">生成可运行 HTML</span>}
                </button>
              </div>
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                className="w-8 h-8 flex items-center justify-center text-white bg-brand rounded-lg hover:bg-brand-hover disabled:opacity-20 transition-all"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 每日早读 */}
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
            <Newspaper className="w-4 h-4 text-text-secondary" />
            每日早读
          </h2>

          {todaySummary ? (
            <button
              onClick={() => navigateTo('news')}
              className="w-full text-left bg-white border border-border rounded-xl p-5 hover:border-brand/20 hover:shadow-sm transition-all group"
            >
              <div className="text-xs text-text-secondary leading-relaxed line-clamp-5">
                {truncateSummary(todaySummary, 250)}
              </div>
              <div className="mt-3 text-xs text-brand font-medium flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                阅读完整日报 <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          ) : (
            <div className="bg-white border border-border rounded-xl p-5">
              <p className="text-xs text-text-secondary mb-2">暂无今日早读</p>
              <button
                onClick={() => navigateTo('news')}
                className="text-xs text-brand hover:underline"
              >
                前往 AI 新闻同步 →
              </button>
            </div>
          )}
        </div>

        {/* Right sidebar: 今日思考 */}
        <div className="w-[260px] shrink-0 pt-16">
          {todayQuestions && todayQuestions.length > 0 ? (
            <div className="sticky top-10">
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> 今日思考
              </h2>
              <div className="space-y-3">
                {todayQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuestionClick(q)}
                    className="w-full text-left flex gap-2.5 p-3 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-border transition-all group"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-brand/8 text-brand text-[10px] font-semibold flex items-center justify-center mt-0.5 group-hover:bg-brand/15 transition-colors">
                      {i + 1}
                    </span>
                    <p className="text-xs text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">{q}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="sticky top-10">
              <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> 今日思考
              </h2>
              <p className="text-xs text-text-secondary/60">同步今日新闻后生成思考问题</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
