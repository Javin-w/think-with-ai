import { useMemo } from 'react'
import { useTreeStore } from '../../store/treeStore'
import { getAncestorChain, getNodeLabel } from '../../store/treeUtils'

interface BreadcrumbProps {
  nodeId: string
}

export default function Breadcrumb({ nodeId }: BreadcrumbProps) {
  const { nodes, setCurrentNode, trees, currentTreeId } = useTreeStore()

  const chain = useMemo(
    () => getAncestorChain(nodes, nodeId),
    [nodes, nodeId]
  )

  const tree = trees.find(t => t.id === currentTreeId)

  if (chain.length <= 1) return null

  return (
    <nav className="flex items-center gap-1 text-xs text-text-secondary flex-wrap">
      {chain.map((node, i) => (
        <span key={node.id} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-40">&gt;</span>}
          <button
            onClick={() => setCurrentNode(node.id)}
            className={`hover:text-brand transition-colors truncate max-w-[120px] ${
              node.id === nodeId ? 'text-text-primary font-medium' : ''
            }`}
          >
            {i === 0 ? (tree?.title || getNodeLabel(node, 20)) : getNodeLabel(node, 20)}
          </button>
        </span>
      ))}
    </nav>
  )
}
