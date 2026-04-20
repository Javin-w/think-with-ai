import { useEffect, useState } from 'react'
import { SendHorizontal, ArrowRight, Palette } from 'lucide-react'
import { useAppStore } from '../../store/appStore'
import { useNewsStore } from '../../store/newsStore'
import type { CategoryHeadline } from '../../store/newsStore'
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

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string; gradient: string }> = {
  product:    { label: '产品与功能更新',       icon: '◆', color: 'text-blue-600',    gradient: 'from-blue-500 to-blue-700' },
  research:   { label: '前沿研究',             icon: '◇', color: 'text-purple-600',  gradient: 'from-purple-500 to-purple-700' },
  industry:   { label: '行业展望与社会影响',   icon: '▲', color: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-700' },
  opensource: { label: '开源TOP项目',           icon: '●', color: 'text-orange-600',  gradient: 'from-orange-500 to-orange-700' },
  social:     { label: '行业展望与社会影响',   icon: '■', color: 'text-pink-600',    gradient: 'from-pink-500 to-pink-700' },
  technology: { label: '前沿研究',             icon: '◈', color: 'text-blue-600',    gradient: 'from-blue-400 to-indigo-600' },
  design:     { label: '产品与功能更新',       icon: '○', color: 'text-purple-600',  gradient: 'from-violet-400 to-purple-600' },
}

export default function Homepage() {
  const { navigateTo } = useAppStore()
  const { todayCategoryHeadlines, fetchToday } = useNewsStore()
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
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }


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
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>psychology</span>
              </div>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-text-primary text-base font-light placeholder:text-text-primary/20 outline-none"
                placeholder="输入任何主题，开始构建你的知识树..."
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

          {/* Example questions */}
          <div className="flex flex-wrap gap-2.5 -mt-5 pl-1">
            {['聊聊 Transformer', 'AI Agent 是怎么工作的', 'MoE 架构详解', 'RLHF 与对齐技术'].map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(q)}
                className="px-3.5 py-1.5 text-[11px] text-text-primary/45 bg-surface-secondary/50 hover:bg-brand/8 hover:text-brand rounded-full transition-all duration-200"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Feature Bento Grid */}
          <div className="grid grid-cols-2 gap-5">
            {/* 知识树 */}
            <button
              onClick={() => { navigateTo('thinking-list') }}
              className="text-left bg-white p-7 rounded-2xl group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 border border-transparent hover:border-border/50"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-brand mb-5 transition-transform group-hover:scale-110">
                <span className="material-symbols-outlined" style={{ fontSize: '28px', fontVariationSettings: "'FILL' 1" }}>account_tree</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">知识树</h3>
              <p className="text-text-primary/40 text-sm leading-relaxed mb-5">选中 AI 回答中的任意概念，一键展开为新分支，把一个问题变成一棵知识树</p>
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
                <Palette className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">AI 原型</h3>
              <p className="text-text-primary/40 text-sm leading-relaxed mb-5">描述你的创意，瞬间生成可运行的 HTML 代码</p>
              <div className="flex items-center gap-1.5 text-purple-500 font-semibold text-[10px] uppercase tracking-widest">
                开始构建 <ArrowRight className="w-3 h-3" />
              </div>
            </button>

          </div>
        </section>

        {/* Right sidebar (4 cols) */}
        <aside className="col-span-4 space-y-10">
          {/* 每日早读 */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-text-primary">每日早读</h3>
              <button onClick={() => navigateTo('news')} className="text-[11px] font-bold text-brand hover:underline uppercase tracking-widest">
                VIEW ALL
              </button>
            </div>
            {(todayCategoryHeadlines && todayCategoryHeadlines.length > 0) ? (
              <div className="space-y-3">
                {todayCategoryHeadlines.slice(0, 4).map((item: CategoryHeadline, i: number) => {
                  const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.technology
                  const items = item.items || [item.title]
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        navigateTo('news')
                        setTimeout(() => {
                          const headings = document.querySelectorAll('.news-atheneum h2, .news-atheneum h3')
                          for (const el of headings) {
                            if (el.textContent?.includes(item.title.slice(0, 8))) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                              return
                            }
                          }
                          const categoryEl = Array.from(headings).find(el =>
                            el.textContent?.includes(config.label) || el.textContent?.includes(item.category)
                          )
                          categoryEl?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 500)
                      }}
                      className="w-full text-left p-4 bg-surface-secondary/50 rounded-2xl group cursor-pointer hover:bg-white transition-colors"
                    >
                      <p className={`text-[11px] font-semibold tracking-wide ${config.color} mb-2 flex items-center gap-1`}>
                        <span>{config.icon}</span> {config.label}
                      </p>
                      <ul className="space-y-1">
                        {items.slice(0, 3).map((t, j) => (
                          <li key={j} className="text-xs text-text-primary/70 leading-relaxed line-clamp-1 group-hover:text-text-primary/90 transition-colors">
                            {t}
                          </li>
                        ))}
                      </ul>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="bg-surface-secondary/50 rounded-2xl p-5 text-center">
                <p className="text-xs text-text-primary/30 mb-2">暂无今日早读</p>
                <button onClick={() => navigateTo('news')} className="text-xs text-brand hover:underline">前往同步 →</button>
              </div>
            )}
          </div>

        </aside>
      </div>
    </div>
  )
}
