import { useState, useEffect, useRef } from 'react'
import { useTreeStore } from '../../store/treeStore'
import type { Annotation } from '@repo/types'

interface AnnotationsPanelProps {
  nodeId: string | null
  pendingAnnotation: { selectedText: string; messageId: string } | null
  onPendingClear: () => void
  onAnnotationClick?: (annotationId: string) => void
  activeAnnotationId?: string | null
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

export default function AnnotationsPanel({
  nodeId,
  pendingAnnotation,
  onPendingClear,
  onAnnotationClick,
  activeAnnotationId,
  collapsed: collapsedProp,
  onCollapsedChange,
}: AnnotationsPanelProps) {
  const { nodes, addAnnotation, removeAnnotation } = useTreeStore()
  const [internalCollapsed, setInternalCollapsed] = useState(true)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Use controlled or uncontrolled collapse
  const collapsed = collapsedProp ?? internalCollapsed
  const setCollapsed = onCollapsedChange ?? setInternalCollapsed

  const node = nodeId ? nodes.find(n => n.id === nodeId) ?? null : null
  const annotations = node?.annotations ?? []

  // Auto-expand and focus when pendingAnnotation arrives
  useEffect(() => {
    if (pendingAnnotation) {
      setCollapsed(false)
      setInputValue('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [pendingAnnotation])

  const handleSave = async () => {
    if (!inputValue.trim() || !nodeId || !pendingAnnotation) return
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      nodeId,
      messageId: pendingAnnotation.messageId,
      selectedText: pendingAnnotation.selectedText,
      content: inputValue.trim(),
      createdAt: Date.now(),
    }
    await addAnnotation(nodeId, annotation)
    setInputValue('')
    onPendingClear()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      onPendingClear()
    }
  }

  // Collapsed state
  if (collapsed) {
    if (annotations.length === 0) return null

    return (
      <div className="w-8 h-full flex flex-col items-center pt-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors"
          title="展开批注"
        >
          {annotations.length}
        </button>
      </div>
    )
  }

  return (
    <div className="w-72 h-full border-l border-border bg-surface-secondary flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">
          批注 {annotations.length > 0 && <span className="text-text-secondary font-normal">({annotations.length})</span>}
        </h3>
        <button
          onClick={() => setCollapsed(true)}
          className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded transition-colors text-xs"
          title="收起"
        >
          ▶
        </button>
      </div>

      {/* Pending annotation input */}
      {pendingAnnotation && (
        <div className="px-3 py-3 border-b border-amber-200 bg-amber-50/50">
          <div className="text-[10px] text-amber-600 font-medium mb-1">选中的文本</div>
          <p className="text-xs text-text-secondary line-clamp-2 mb-2 leading-relaxed">
            "{pendingAnnotation.selectedText}"
          </p>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="写下你的批注..."
            rows={2}
            className="w-full resize-none rounded border border-amber-200 bg-white px-2 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-[10px] text-text-secondary">Enter 保存 · Esc 取消</span>
            <button
              onClick={handleSave}
              disabled={!inputValue.trim()}
              className="px-2 py-0.5 bg-amber-500 text-white text-[10px] rounded font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      )}

      {/* Annotations list */}
      <div className="flex-1 overflow-y-auto">
        {annotations.length === 0 && !pendingAnnotation && (
          <div className="px-3 py-8 text-xs text-text-secondary text-center">
            选中对话文本即可添加批注
          </div>
        )}

        {annotations.map(ann => {
          const isActive = ann.id === activeAnnotationId
          return (
            <div
              key={ann.id}
              data-panel-annotation-id={ann.id}
              onClick={() => onAnnotationClick?.(ann.id)}
              className={`px-3 py-3 border-b border-border/50 cursor-pointer transition-colors group ${
                isActive ? 'bg-yellow-50 ring-1 ring-yellow-300' : 'hover:bg-slate-50'
              }`}
            >
              {/* Quoted text */}
              <p className="text-[11px] text-text-secondary border-l-2 border-amber-300 pl-2 line-clamp-2 leading-relaxed">
                "{ann.selectedText}"
              </p>
              {/* User's note */}
              <p className="text-xs text-text-primary mt-1.5 leading-relaxed">{ann.content}</p>
              {/* Footer */}
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px] text-text-secondary/60">{timeAgo(ann.createdAt)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    nodeId && removeAnnotation(nodeId, ann.id)
                  }}
                  className="text-[10px] text-text-secondary/0 group-hover:text-text-secondary hover:!text-red-500 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
