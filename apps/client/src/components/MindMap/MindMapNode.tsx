import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

interface MindMapNodeData {
  label: string
  isActive: boolean
  isRoot: boolean
}

interface MindMapNodeProps {
  data: MindMapNodeData
}

function MindMapNode({ data }: MindMapNodeProps) {
  return (
    <div
      data-testid="mind-map-node"
      className={`
        px-3 py-2 rounded-lg text-xs font-medium max-w-[160px] cursor-pointer
        border transition-all
        ${data.isActive
          ? 'border-brand bg-white shadow-md text-text-primary ring-2 ring-brand ring-offset-1'
          : 'border-border bg-white text-text-secondary hover:border-brand hover:text-text-primary'
        }
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-border !w-2 !h-2" />
      <p className="truncate">{data.label}</p>
      <Handle type="source" position={Position.Right} className="!bg-border !w-2 !h-2" />
    </div>
  )
}

export default memo(MindMapNode)
