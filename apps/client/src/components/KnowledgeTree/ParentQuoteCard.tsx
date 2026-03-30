import { useTreeStore } from '../../store/treeStore'

interface ParentQuoteCardProps {
  nodeId: string
}

export default function ParentQuoteCard({ nodeId }: ParentQuoteCardProps) {
  const { nodes, setCurrentNode } = useTreeStore()
  const node = nodes.find(n => n.id === nodeId)

  if (!node || !node.selectedText || node.parentId === null) return null

  return (
    <button
      onClick={() => setCurrentNode(node.parentId!)}
      className="w-full text-left border-l-2 border-slate-300 pl-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:border-brand transition-colors group"
    >
      <span className="text-[10px] uppercase tracking-wide text-text-secondary/60 group-hover:text-brand/60">
        展开自
      </span>
      <p className="mt-0.5 line-clamp-2 leading-relaxed">{node.selectedText}</p>
    </button>
  )
}
