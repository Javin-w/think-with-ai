import { useEffect, useState } from 'react'
import { Brain, Palette, Sparkles, SendHorizontal, ArrowRight, BookOpen, Code, Lock, Newspaper } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useNewsStore } from '../../store/newsStore'
import { useTreeStore } from '../../store/treeStore'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return '上午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function getDateLabel(): string {
  const d = new Date()
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${days[d.getDay()]}`
}

function parseSummaryItems(text: string): string[] {
  const clean = text.replace(/```/g, '').trim()
  return clean
    .split(/[，\n]+/)
    .map((s) => s.trim().replace(/^[、。,.\s]+|[、。,.\s]+$/g, ''))
    .filter((s) => s.length > 4)
    .slice(0, 6)
}

export default function Homepage() {
  const { navigateTo } = useAppStore()
  const { todaySummary, todayKeywords, fetchToday } = useNewsStore()
  const [input, setInput] = useState('')

  useEffect(() => {
    fetchToday()
  }, [fetchToday])

  const handleSubmit = (text?: string) => {
    const msg = (text || input).trim()
    if (!msg) return
    useTreeStore.setState({ currentTreeId: null, currentNodeId: null, nodes: [] })
    navigateTo('thinking-tree')
    sessionStorage.setItem('pendingMessage', msg)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleKeywordClick = (keyword: string) => {
    handleSubmit(`什么是 ${keyword}？请详细解释`)
  }

  const parsedKeywords = (todayKeywords || []).map((k) => {
    const [name, desc] = k.split('|')
    return { name: name?.trim() || k, desc: desc?.trim() || '' }
  })

  const summaryItems = todaySummary ? parseSummaryItems(todaySummary) : []

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-10 py-8 grid grid-cols-12 gap-10">
        {/* Left: Main content area (8 cols) */}
        <section className="col-span-8 space-y-10">
          {/* Date badge + Greeting */}
          <div className="space-y-3">
            <span className="inline-block bg-brand/10 text-brand text-[11px] font-semibold tracking-wide px-3 py-1 rounded-full">
              {getDateLabel()}
            </span>
            <h1 className="text-[2.8rem] leading-[1.15] font-light text-text-primary tracking-tight">
              {getGreeting()}, <span className="font-semibold">探索者.</span>
            </h1>
            <p className="text-text-primary/40 text-base max-w-xl font-light">
              今天你想探索什么知识？AI 已经为你准备好了最新的研究简报。
            </p>
          </div>

          {/* Central Prompt Input */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand/15 to-brand/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative bg-white rounded-2xl p-4 flex items-center gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <div className="w-10 h-10 bg-surface-secondary rounded-xl flex items-center justify-center text-brand shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-text-primary text-base font-light placeholder:text-text-primary/20 outline-none"
                placeholder="输入任何主题，开始深度 AI 学习之旅..."
              />
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim()}
                className="w-10 h-10 bg-brand text-white rounded-xl flex items-center justify-center hover:bg-brand-hover disabled:opacity-20 transition-all shadow-lg shadow-brand/20"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feature Bento Grid */}
          <div className="grid grid-cols-3 gap-5">
            {/* AI 学习 */}
            <button
              onClick={() => { navigateTo('thinking-list') }}
              className="text-left bg-white p-7 rounded-2xl group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 border border-transparent hover:border-border/50"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-brand mb-5 transition-transform group-hover:scale-110">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">AI 学习</h3>
              <p className="text-text-primary/40 text-sm leading-relaxed mb-5">探索任意概念，构建知识树，支持分支深入学习</p>
              <div className="flex items-center gap-1.5 text-brand font-semibold text-[10px] uppercase tracking-widest">
                开始探索 <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            {/* AI 原型 */}
            <button
              onClick={() => { navigateTo('prototype') }}
              className="text-left bg-white p-7 rounded-2xl group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 border border-transparent hover:border-border/50"
            >
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 mb-5 transition-transform group-hover:scale-110">
                <Code className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">AI 原型</h3>
              <p className="text-text-primary/40 text-sm leading-relaxed mb-5">描述你的创意，瞬间生成可运行的 HTML 代码</p>
              <div className="flex items-center gap-1.5 text-purple-500 font-semibold text-[10px] uppercase tracking-widest">
                开始构建 <ArrowRight className="w-3 h-3" />
              </div>
            </button>

            {/* AI 思考 - Coming Soon */}
            <div className="text-left bg-white/50 p-7 rounded-2xl border border-border/30 opacity-50 cursor-default">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-400 mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary/60 mb-2 flex items-center gap-2">
                AI 思考 <Lock className="w-3.5 h-3.5" />
              </h3>
              <p className="text-text-primary/25 text-sm leading-relaxed mb-5">深度推理与头脑风暴，敬请期待</p>
              <div className="flex items-center gap-1.5 text-text-primary/20 font-semibold text-[10px] uppercase tracking-widest">
                即将上线
              </div>
            </div>
          </div>
        </section>

        {/* Right sidebar (4 cols) */}
        <aside className="col-span-4 space-y-10">
          {/* 每日早读 */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Newspaper className="w-4 h-4" /> 每日早读
              </h3>
              <button onClick={() => navigateTo('news')} className="text-[10px] font-bold text-brand hover:underline uppercase tracking-widest">
                查看全部
              </button>
            </div>
            {summaryItems.length > 0 ? (
              <div className="space-y-3">
                {summaryItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => navigateTo('news')}
                    className="w-full text-left p-3.5 bg-surface-secondary/60 rounded-xl group cursor-pointer hover:bg-surface-secondary transition-colors"
                  >
                    <h4 className="text-[13px] font-medium text-text-primary leading-snug group-hover:text-brand transition-colors">
                      {item}
                    </h4>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-surface-secondary/60 rounded-xl p-4">
                <p className="text-xs text-text-primary/30 mb-2">暂无今日早读</p>
                <button onClick={() => navigateTo('news')} className="text-xs text-brand hover:underline">前往同步 →</button>
              </div>
            )}
          </div>

          {/* 今日学习 */}
          {parsedKeywords.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary mb-5 flex items-center gap-1.5">
                <Brain className="w-4 h-4" /> 今日学习
              </h3>
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
                <ul className="space-y-2.5">
                  {parsedKeywords.map((kw, i) => (
                    <li key={i}>
                      <button
                        onClick={() => handleKeywordClick(kw.name)}
                        className="w-full flex items-center gap-3 text-sm text-text-primary/50 group cursor-pointer text-left"
                      >
                        <span className="material-symbols-outlined text-[16px] text-brand/40 group-hover:text-brand transition-colors shrink-0">→</span>
                        <span className="flex-1 group-hover:text-text-primary transition-colors">
                          <span className="font-medium text-text-primary/70 group-hover:text-brand transition-colors">{kw.name}</span>
                          {kw.desc && <span className="text-text-primary/30 ml-1.5 text-xs">· {kw.desc}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigateTo('thinking-list')}
                  className="w-full py-2.5 bg-surface-secondary hover:bg-surface-secondary/80 transition-colors text-xs font-semibold uppercase tracking-widest rounded-xl text-text-primary/40"
                >
                  继续学习
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
