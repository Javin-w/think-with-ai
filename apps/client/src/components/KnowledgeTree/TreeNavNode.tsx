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
  const label = getNodeLabel(item.node)

  useEffect(() => {
    if (defaultExpanded) setExpanded(true)
  }, [defaultExpanded])

  return (
    <div>
      <div
        className={`
          flex items-center gap-1.5 py-1 cursor-pointer text-[13px] transition-colors
          ${isActive
            ? 'text-text-primary font-medium'
            : 'text-text-secondary hover:text-text-primary'
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px`, paddingRight: '12px' }}
        onClick={() => onSelect(item.node.id)}
      >
        {/* Expand/collapse — subtle chevron */}
        <button
          className={`w-4 h-4 flex items-center justify-center shrink-0 transition-transform ${
            hasChildren ? 'text-text-secondary/40' : 'invisible'
          } ${expanded ? 'rotate-90' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) setExpanded(!expanded)
          }}
        >
          <ChevronRight size={12} />
        </button>

        {/* Active dot */}
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
        )}

        {/* Label */}
        <span className="truncate flex-1">{label}</span>
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
