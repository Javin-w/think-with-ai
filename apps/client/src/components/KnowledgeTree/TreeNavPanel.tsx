import { useMemo, useState, useCallback } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useTreeStore } from '../../store/treeStore'
import { buildTreeStructure, getAncestorChain, serializeTreeForExport } from '../../store/treeUtils'
import TreeNavNode from './TreeNavNode'

interface TreeNavPanelProps {
  treeId: string | null
  onBack: () => void
  onExportLark?: (markdown: string, title: string) => void
}

export default function TreeNavPanel({ treeId, onBack, onExportLark }: TreeNavPanelProps) {
  const { nodes, currentNodeId, setCurrentNode, trees } = useTreeStore()
  const [collapsed, setCollapsed] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const currentTreeNodes = useMemo(
    () => nodes.filter(n => n.treeId === treeId),
    [nodes, treeId]
  )

  const treeStructure = useMemo(
    () => buildTreeStructure(currentTreeNodes),
    [currentTreeNodes]
  )

  const expandedPathIds = useMemo(() => {
    if (!currentNodeId) return new Set<string>()
    const chain = getAncestorChain(currentTreeNodes, currentNodeId)
    return new Set(chain.map(n => n.id))
  }, [currentTreeNodes, currentNodeId])

  const tree = trees.find(t => t.id === treeId)

  const handleExport = useCallback(async () => {
    if (!treeId || currentTreeNodes.length === 0 || exporting) return

    setExporting(true)
    setExportStatus('AI 正在总结归纳...')

    try {
      const treeData = serializeTreeForExport(currentTreeNodes)
      if (!treeData) {
        setExportStatus('暂无对话内容')
        return
      }

      const response = await fetch('/api/export/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treeData,
          title: tree?.title || '知识树',
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const { markdown } = await response.json()
      setExportStatus('正在创建飞书文档...')

      if (onExportLark) {
        onExportLark(markdown, tree?.title || '知识树')
      } else {
        await navigator.clipboard.writeText(markdown)
        setExportStatus('已复制 Markdown 到剪贴板')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '导出失败'
      setExportStatus(`导出失败: ${msg}`)
    } finally {
      setExporting(false)
      setTimeout(() => setExportStatus(null), 3000)
    }
  }, [treeId, currentTreeNodes, tree, exporting, onExportLark])

  // Collapsed
  if (collapsed) {
    return (
      <div className="w-8 h-full flex flex-col items-center pt-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-5 h-5 flex items-center justify-center text-text-secondary/40 hover:text-text-secondary rounded transition-colors"
          title="展开导航"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="w-56 h-full border-r border-border/50 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between">
        <span className="text-xs text-text-secondary/60 uppercase tracking-wider font-medium">
          {tree?.title || '知识树'}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="w-5 h-5 flex items-center justify-center text-text-secondary/30 hover:text-text-secondary rounded transition-colors"
          title="收起导航"
        >
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {treeStructure.length === 0 ? (
          <div className="px-3 py-6 text-xs text-text-secondary/40 text-center">
            开始对话后显示
          </div>
        ) : (
          treeStructure.map(item => (
            <TreeNavNode
              key={item.node.id}
              item={item}
              currentNodeId={currentNodeId}
              onSelect={setCurrentNode}
              depth={0}
              defaultExpanded={expandedPathIds.has(item.node.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 space-y-0.5">
        {exportStatus && (
          <div className="text-[10px] text-text-secondary/60 px-1 py-1 truncate">
            {exportStatus}
          </div>
        )}

        {currentTreeNodes.length > 0 && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full px-2 py-1 text-[11px] text-text-secondary/50 hover:text-text-secondary rounded transition-colors text-left disabled:opacity-50"
          >
            {exporting ? '导出中...' : '导出文档'}
          </button>
        )}

        <button
          onClick={onBack}
          className="w-full px-2 py-1 text-[11px] text-text-secondary/50 hover:text-text-secondary rounded transition-colors text-left"
        >
          ← 返回
        </button>
      </div>
    </div>
  )
}
