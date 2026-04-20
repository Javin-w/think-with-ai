import { useMemo } from 'react'
import { X } from 'lucide-react'
import { useTreeStore } from '../../store/treeStore'
import TreeMapView from './TreeMapView'

interface TreeMapFloatProps {
  treeId: string | null
  onClose: () => void
}

export default function TreeMapFloat({ treeId, onClose }: TreeMapFloatProps) {
  const { nodes } = useTreeStore()

  const hasNodes = useMemo(
    () => nodes.some(n => n.treeId === treeId),
    [nodes, treeId]
  )

  if (!treeId || !hasNodes) return null

  return (
    <div className="absolute left-3 top-3 z-40 w-[420px] h-72 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-border/40 flex flex-col overflow-hidden opacity-70 hover:opacity-100 transition-opacity duration-200">
      <div className="px-3 py-1.5 flex items-center justify-between border-b border-border/30">
        <span className="text-[11px] text-text-secondary/50 font-medium">图谱</span>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center text-text-secondary/30 hover:text-text-secondary/60 rounded transition-colors"
          title="收起图谱"
        >
          <X size={12} strokeWidth={1.5} />
        </button>
      </div>
      <div className="flex-1">
        <TreeMapView treeId={treeId} compact />
      </div>
    </div>
  )
}
