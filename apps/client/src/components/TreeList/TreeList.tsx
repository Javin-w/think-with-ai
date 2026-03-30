import type { Tree } from '@repo/types'

interface TreeListProps {
  trees: Tree[]
  onSelectTree: (treeId: string) => void
  onCreateTree: () => void
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TreeList({ trees, onSelectTree, onCreateTree }: TreeListProps) {
  return (
    <div className="min-h-screen bg-surface-secondary">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">NewmanAI</h1>
            <p className="text-sm text-text-secondary mt-1">AI 思考 · 探索式学习</p>
          </div>
          <button
            onClick={onCreateTree}
            className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
          >
            + 新建知识树
          </button>
        </div>

        {/* Empty state */}
        {trees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🌱</div>
            <h2 className="text-lg font-medium text-text-primary mb-2">开始你的第一次探索</h2>
            <p className="text-sm text-text-secondary mb-6 max-w-sm">
              提问，深入探索 AI 回答中的任意概念，构建你的知识树
            </p>
            <button
              onClick={onCreateTree}
              data-testid="create-tree-cta"
              className="px-6 py-3 bg-brand text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              开始探索
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {trees.map(tree => (
              <button
                key={tree.id}
                onClick={() => onSelectTree(tree.id)}
                className="w-full text-left px-4 py-4 bg-white rounded-lg border border-border hover:border-brand hover:shadow-sm transition-all group"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary group-hover:text-brand truncate flex-1 mr-4">
                    {tree.title || '未命名知识树'}
                  </p>
                  <p className="text-xs text-text-secondary shrink-0">
                    {formatDate(tree.updatedAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
