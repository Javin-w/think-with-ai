import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

interface TreeMapNodeData {
  label: string
  isActive: boolean
  isOnPath: boolean
  isRoot: boolean
  messageCount: number
  childCount: number
}

function TreeMapNode({ data }: { data: TreeMapNodeData }) {
  const isHighlighted = data.isActive || data.isOnPath

  return (
    <div
      className={`
        px-3 py-2 rounded-lg text-xs max-w-[150px] cursor-pointer
        border transition-all duration-200
        ${data.isActive
          ? 'border-brand bg-white shadow-md text-text-primary ring-2 ring-brand/30'
          : data.isOnPath
            ? 'border-brand/40 bg-blue-50/50 text-text-primary'
            : 'border-border bg-white text-text-secondary hover:border-brand/30 hover:text-text-primary'
        }
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />
      <p className={`truncate leading-tight ${data.isActive ? 'font-medium' : ''}`}>
        {data.label}
      </p>
      {(data.messageCount > 0 || data.childCount > 0) && (
        <div className="flex items-center gap-1.5 mt-1">
          {data.messageCount > 0 && (
            <span className={`text-[9px] ${isHighlighted ? 'text-brand/60' : 'text-text-secondary/40'}`}>
              {Math.floor(data.messageCount / 2)} 轮
            </span>
          )}
          {data.childCount > 0 && (
            <span className={`text-[9px] ${isHighlighted ? 'text-brand/60' : 'text-text-secondary/40'}`}>
              {data.childCount} 分支
            </span>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  )
}

export default memo(TreeMapNode)
