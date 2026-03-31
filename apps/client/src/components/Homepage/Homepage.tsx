import { useEffect, useState } from 'react'
import { Brain, Palette, Sparkles, Newspaper, SendHorizontal, ArrowRight, BookOpen, Code, Lock } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useNewsStore } from '../../store/newsStore'
import { useTreeStore } from '../../store/treeStore'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function parseSummaryItems(text: string): string[] {
  const clean = text.replace(/```/g, '').trim()
  return clean
    .split(/[，\n]+/)
    .map((s) => s.trim().replace(/^[、。,.\s]+|[、。,.\s]+$/g, ''))
    .filter((s) => s.length > 4)
    .slice(0, 8)
}

export default function Homepage() {
  const { navigateTo } = useAppStore()
  const { todaySummary, todayKeywords, fetchToday } = useNewsStore()
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

  const handleKeywordClick = (keyword: string) => {
    setMode('thinking')
    handleSubmit(`什么是 ${keyword}？请详细解释`)
  }

  const placeholders: Record<string, string> = {
    thinking: '例如："什么是 Transformer？" 或 "帮我理解强化学习的原理"',
    prototype: '例如："一个简洁的任务管理应用" 或 "水果电商落地页"',
  }

  // Parse keywords: format is "名词|解释"
  const parsedKeywords = (todayKeywords || []).map((k) => {
    const [name, desc] = k.split('|')
    return { name: name?.trim() || k, desc: desc?.trim() || '' }
  })

  return (
    <div className="h-full overflow-y-auto">
      {/* Top bar: 每日早读 in right corner */}
      <div className="flex justify-end px-6 pt-4 pb-0">
        <button
          onClick={() => navigateTo('news')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-primary/50 hover:text-brand rounded-lg hover:bg-white/80 transition-all"
        >
          <Newspaper className="w-3.5 h-3.5" />
          每日早读
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-8 pt-4 pb-10">
        {/* Greeting */}
        <h1 className="text-2xl font-bold text-text-primary mb-1">{getGreeting()}</h1>
        <p className="text-sm text-text-primary/40 mb-6">有什么可以帮你的？</p>

        {/* Input card */}
        <div className="bg-white border border-border rounded-xl shadow-sm mb-6">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholders[mode]}
            rows={3}
            className="w-full px-4 pt-4 pb-2 text-sm text-text-primary placeholder:text-text-primary/25 resize-none outline-none leading-relaxed rounded-t-xl"
          />
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMode('thinking')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  mode === 'thinking'
                    ? 'bg-brand/8 border-brand/15 text-brand font-medium'
                    : 'border-transparent text-text-primary/40 hover:text-text-primary/60 hover:bg-black/[0.03]'
                }`}
              >
                <Brain className="w-3.5 h-3.5" /> AI 学习
              </button>
              <button
                onClick={() => setMode('prototype')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  mode === 'prototype'
                    ? 'bg-brand/8 border-brand/15 text-brand font-medium'
                    : 'border-transparent text-text-primary/40 hover:text-text-primary/60 hover:bg-black/[0.03]'
                }`}
              >
                <Palette className="w-3.5 h-3.5" /> 做原型
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

        {/* Feature cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {/* AI 学习 */}
          <button
            onClick={() => { setMode('thinking'); document.querySelector('textarea')?.focus() }}
            className="text-left p-4 bg-white border border-border rounded-xl hover:border-brand/20 hover:shadow-sm transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-[13px] font-medium text-text-primary mb-1">AI 学习</h3>
            <p className="text-[11px] text-text-primary/40 leading-relaxed">探索任意概念，AI 帮你构建知识树，支持分支深入学习</p>
          </button>

          {/* AI 原型 */}
          <button
            onClick={() => { setMode('prototype'); document.querySelector('textarea')?.focus() }}
            className="text-left p-4 bg-white border border-border rounded-xl hover:border-brand/20 hover:shadow-sm transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
              <Code className="w-4 h-4" />
            </div>
            <h3 className="text-[13px] font-medium text-text-primary mb-1">AI 原型</h3>
            <p className="text-[11px] text-text-primary/40 leading-relaxed">用自然语言描述需求，生成可在浏览器运行的 HTML 页面</p>
          </button>

          {/* AI 思考 - 敬请期待 */}
          <div className="text-left p-4 bg-white/60 border border-border/60 rounded-xl opacity-60 cursor-default">
            <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-[13px] font-medium text-text-primary/60 mb-1 flex items-center gap-1">
              AI 思考 <Lock className="w-3 h-3" />
            </h3>
            <p className="text-[11px] text-text-primary/30 leading-relaxed">深度分析与推理，敬请期待</p>
          </div>
        </div>

        {/* 每日早读 feed */}
        {todaySummary && (
          <div className="mb-8">
            <h2 className="text-[13px] font-medium text-text-primary/50 mb-3">今日要闻</h2>
            <button
              onClick={() => navigateTo('news')}
              className="w-full text-left bg-white border border-border rounded-xl p-4 hover:border-brand/20 hover:shadow-sm transition-all group"
            >
              <ul className="space-y-1.5">
                {parseSummaryItems(todaySummary).map((item, i) => (
                  <li key={i} className="flex gap-2 text-xs text-text-primary/50 leading-relaxed">
                    <span className="shrink-0 w-1 h-1 rounded-full bg-text-primary/20 mt-1.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-brand font-medium flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                阅读完整日报 <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        )}

        {/* 今日关键词 → AI 学习引导 */}
        {parsedKeywords.length > 0 && (
          <div>
            <h2 className="text-[13px] font-medium text-text-primary/50 mb-3">今日关键词</h2>
            <div className="flex flex-wrap gap-2">
              {parsedKeywords.map((kw, i) => (
                <button
                  key={i}
                  onClick={() => handleKeywordClick(kw.name)}
                  className="group flex items-center gap-1.5 px-3 py-2 bg-white border border-border rounded-lg hover:border-brand/20 hover:shadow-sm transition-all text-left"
                >
                  <span className="text-xs font-medium text-text-primary group-hover:text-brand transition-colors">{kw.name}</span>
                  {kw.desc && <span className="text-[11px] text-text-primary/30">· {kw.desc}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
