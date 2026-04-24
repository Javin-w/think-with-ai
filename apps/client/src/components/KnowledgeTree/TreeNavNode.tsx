import { useState, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import type { TreeNavItem } from '../../store/treeUtils'
import { getNodeLabel } from '../../store/treeUtils'

interface TreeNavNodeProps {
  item: TreeNavItem
  currentNodeId: string | null
  onSelect: (nodeId: string) => void
  depth: number
  defaultExpanded?: boolean
}

export default function TreeNavNode({ item, currentNodeId, onSelect, depth, defaultExpanded }: TreeNavNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false)
  const hasChildren = item.children.length > 0
  const isActive = item.node.id === currentNodeId
  const isRoot = depth === 0
  const label = getNodeLabel(item.node, isRoot ? 24 : 28)

  useEffect(() => {
    if (defaultExpanded) setExpanded(true)
  }, [defaultExpanded])

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 cursor-pointer transition-colors rounded-md mx-2
          ${isRoot ? 'py-1.5 text-[12px]' : 'py-[5px] text-[11px]'}
          ${isActive
            ? 'text-brand bg-brand/10'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
          }
        `}
        style={{ paddingLeft: `${depth * 14 + 8}px`, paddingRight: '8px' }}
        onClick={() => onSelect(item.node.id)}
      >
        {/* Chevron */}
        <button
          className={`w-3.5 h-3.5 flex items-center justify-center shrink-0 transition-transform ${
            hasChildren ? 'text-text-secondary/30' : 'invisible'
          } ${expanded ? 'rotate-90' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) setExpanded(!expanded)
          }}
        >
          <ChevronRight size={10} strokeWidth={1.5} />
        </button>

        {/* Label */}
        <span className={`truncate flex-1 ${isActive ? 'font-medium' : ''}`}>{label}</span>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {item.children.map(child => (
            <TreeNavNode
              key={child.node.id}
              item={child}
              currentNodeId={currentNodeId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
