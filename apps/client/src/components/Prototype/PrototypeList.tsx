import { useEffect } from 'react'
import { useAgentStore } from '../../store/agentStore'
import { useAppStore } from '../../store/appStore'

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚更新'
  if (minutes < 60) return `${minutes} 分钟前更新`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前更新`
  const days = Math.floor(hours / 24)
  return `${days} 天前更新`
}

export default function PrototypeList() {
  const { sessions, loadSessions, selectSession, resetCurrent } = useAgentStore()
  const { navigateTo } = useAppStore()

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const handleSelect = async (id: string) => {
    await selectSession(id)
    navigateTo('prototype')
  }

  const handleCreate = () => {
    resetCurrent()
    navigateTo('prototype')
  }

  const featured = sessions[0]
  const rest = sessions.slice(1)

  return (
    <div className="min-h-screen bg-surface-secondary">
      <section className="px-12 py-12 max-w-6xl mx-auto">
        {/* Editorial Header */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-purple-100 text-purple-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
              AI 原型
            </span>
            {featured && (
              <>
                <span className="text-text-secondary/30 text-[10px]">·</span>
                <span className="text-text-secondary text-[10px] font-medium">{timeAgo(featured.updatedAt)}</span>
              </>
            )}
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-5xl font-semibold text-text-primary tracking-tight leading-none mb-4">AI 原型</h1>
              <p className="text-lg text-text-secondary font-light max-w-xl leading-relaxed">
                描述你的创意，AI 帮你生成可运行的原型代码
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-full font-semibold text-sm hover:bg-purple-700 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-600/20"
            >
              新建原型
            </button>
          </div>
        </div>

        {/* Empty state */}
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-purple-50 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-purple-500">code</span>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">创建你的第一个原型</h2>
            <p className="text-sm text-text-secondary mb-8 max-w-sm leading-relaxed">
              用自然语言描述你的想法，AI 将帮你生成可运行的 HTML 原型
            </p>
            <button
              onClick={handleCreate}
              className="px-8 py-3 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-700 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-600/20"
            >
              开始创建
            </button>
          </div>
        ) : (
          <>
            {/* Bento Grid */}
            <div className="grid grid-cols-12 gap-6 mb-12">
              {/* Featured Card */}
              <div
                onClick={() => handleSelect(featured.id)}
                className="col-span-8 bg-white p-10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-10">
                    <span className="material-symbols-outlined text-4xl text-purple-500" style={{ fontVariationSettings: "'FILL' 1" }}>code_blocks</span>
                    <span className="material-symbols-outlined text-text-secondary/30 hover:text-text-secondary transition-colors">more_horiz</span>
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 leading-tight group-hover:text-purple-600 transition-colors">
                    {featured.title || '未命名原型'}
                  </h3>
                  <p className="text-text-secondary text-base leading-relaxed">
                    最近编辑的原型，点击继续迭代
                  </p>
                </div>
                <div className="flex items-center justify-between pt-8 mt-8 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                      <span className="material-symbols-outlined text-lg">chat</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">对话轮次</p>
                      <p className="text-sm font-semibold text-text-primary">{featured.messages.length} 条消息</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">创建于</p>
                    <p className="text-sm font-medium text-text-secondary">{formatDate(featured.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="col-span-4 bg-surface-secondary rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 mb-4">原型总数</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-semibold tracking-tighter text-text-primary">{sessions.length}</span>
                    <span className="text-purple-500 font-medium text-sm">个</span>
                  </div>
                </div>
                {/* Decorative bars */}
                <div className="h-20 w-full flex items-end gap-1.5">
                  {Array.from({ length: 7 }, (_, i) => {
                    const heights = [50, 35, 70, 45, 65, 55, 100]
                    const isLast = i === 6
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-full ${isLast ? 'bg-purple-500' : 'bg-purple-200'}`}
                        style={{ height: `${heights[i]}%` }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recent list */}
            {rest.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-6">最近原型</h3>
                <div className="space-y-3">
                  {rest.map(session => (
                    <button
                      key={session.id}
                      onClick={() => handleSelect(session.id)}
                      className="w-full text-left bg-white p-5 rounded-xl flex items-center justify-between hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-11 h-11 rounded-full bg-surface-secondary flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-text-secondary/50">code</span>
                        </div>
                        <div>
                          <h5 className="text-base font-medium text-text-primary group-hover:text-purple-600 transition-colors">
                            {session.title || '未命名原型'}
                          </h5>
                          <p className="text-xs text-text-secondary mt-0.5">{formatDate(session.updatedAt)}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-text-secondary/20 group-hover:text-text-secondary/50 transition-colors">chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
