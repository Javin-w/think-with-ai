import type { Tree } from '@repo/types'
import { useTreeStore } from '../../store/treeStore'

interface TreeListProps {
  trees: Tree[]
  onSelectTree: (treeId: string) => void
  onCreateTree: () => void
}

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

export default function TreeList({ trees, onSelectTree, onCreateTree }: TreeListProps) {
  const deleteTree = useTreeStore(s => s.deleteTree)
  const featured = trees[0]
  const rest = trees.slice(1)

  const handleDelete = (tree: Tree) => async (e: React.MouseEvent) => {
    e.stopPropagation()
    const name = tree.title || '未命名对话树'
    if (!window.confirm(`确定删除「${name}」吗？该树下所有节点和对话都会一并删除，无法恢复。`)) return
    await deleteTree(tree.id)
  }

  return (
    <div className="h-full overflow-y-auto bg-surface-secondary">
      <section className="px-12 py-12 max-w-6xl mx-auto">
        {/* Editorial Header */}
        <div className="mb-16">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-wider rounded-full">
              对话树
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
              <h1 className="text-5xl font-semibold text-text-primary tracking-tight leading-none mb-4">对话树</h1>
              <p className="text-lg text-text-secondary font-light max-w-xl leading-relaxed">
                选中 AI 回答中的任意概念，展开为新分支，构建你的知识图谱
              </p>
            </div>
            <button
              onClick={onCreateTree}
              className="px-6 py-2.5 bg-brand text-surface-secondary rounded-full font-semibold text-sm hover:bg-brand-hover active:scale-95 transition-all duration-200 shadow-lg shadow-brand/20"
            >
              新建对话树
            </button>
          </div>
        </div>

        {/* Empty state */}
        {trees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-brand/5 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-brand">account_tree</span>
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">开始你的第一次探索</h2>
            <p className="text-sm text-text-secondary mb-8 max-w-sm leading-relaxed">
              提出一个问题，深入探索 AI 回答中的任意概念，构建属于你的对话树
            </p>
            <button
              onClick={onCreateTree}
              data-testid="create-tree-cta"
              className="px-8 py-3 bg-brand text-surface-secondary text-sm font-semibold rounded-full hover:bg-brand-hover active:scale-95 transition-all duration-200 shadow-lg shadow-brand/20"
            >
              开始探索
            </button>
          </div>
        ) : (
          <>
            {/* Bento Grid */}
            <div className="grid grid-cols-12 gap-6 mb-12">
              {/* Featured Card */}
              <div
                onClick={() => onSelectTree(featured.id)}
                className="col-span-8 bg-surface p-10 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-10">
                    <span className="material-symbols-outlined text-4xl text-brand" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
                    <button
                      onClick={handleDelete(featured)}
                      title="删除此对话树"
                      className="material-symbols-outlined text-text-secondary/30 hover:text-rust transition-colors bg-transparent border-none cursor-pointer"
                    >
                      delete
                    </button>
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 leading-tight group-hover:text-brand transition-colors">
                    {featured.title || '未命名对话树'}
                  </h3>
                  <p className="text-text-secondary text-base leading-relaxed">
                    最近编辑的对话树，点击继续探索
                  </p>
                </div>
                <div className="flex items-center justify-between pt-8 mt-8 border-t border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                      <span className="material-symbols-outlined text-lg">trending_up</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">状态</p>
                      <p className="text-sm font-semibold text-text-primary">进行中</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60">创建于</p>
                    <p className="text-sm font-medium text-text-secondary">{formatDate(featured.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Stats Card */}
              <div className="col-span-4 bg-surface rounded-2xl p-8 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/60 mb-4">对话树总数</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-semibold tracking-tighter text-text-primary">{trees.length}</span>
                    <span className="text-brand font-medium text-sm">棵</span>
                  </div>
                </div>
                {/* Decorative bars */}
                <div className="h-20 w-full flex items-end gap-1.5">
                  {Array.from({ length: 7 }, (_, i) => {
                    const heights = [40, 60, 30, 80, 55, 75, 100]
                    const isLast = i === 6
                    return (
                      <div
                        key={i}
                        className={`flex-1 rounded-t-full ${isLast ? 'bg-brand' : 'bg-brand/20'}`}
                        style={{ height: `${heights[i]}%` }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Recent Explorations */}
            {rest.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-text-primary mb-6">最近探索</h3>
                <div className="space-y-3">
                  {rest.map(tree => (
                    <div
                      key={tree.id}
                      onClick={() => onSelectTree(tree.id)}
                      role="button"
                      tabIndex={0}
                      className="w-full text-left bg-surface p-5 rounded-xl flex items-center justify-between hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-300 group cursor-pointer"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-11 h-11 rounded-full bg-surface-secondary border border-border flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-text-secondary/50">psychology</span>
                        </div>
                        <div>
                          <h5 className="text-base font-medium text-text-primary group-hover:text-brand transition-colors">
                            {tree.title || '未命名对话树'}
                          </h5>
                          <p className="text-xs text-text-secondary mt-0.5">{formatDate(tree.updatedAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleDelete(tree)}
                          title="删除此对话树"
                          className="material-symbols-outlined text-text-secondary/0 group-hover:text-text-secondary/60 hover:!text-rust transition-colors bg-transparent border-none cursor-pointer"
                        >
                          delete
                        </button>
                        <span className="material-symbols-outlined text-text-secondary/20 group-hover:text-text-secondary/50 transition-colors">chevron_right</span>
                      </div>
                    </div>
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
