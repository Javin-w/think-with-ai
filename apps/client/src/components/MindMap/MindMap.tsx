import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { useTreeStore } from '../../store/treeStore'
import MindMapNode from './MindMapNode'
import type { TreeNode } from '@repo/types'

const nodeTypes: NodeTypes = {
  mindMapNode: MindMapNode,
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 50

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 80 })

  nodes.forEach(node => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target)
  })

  dagre.layout(g)

  const layoutedNodes = nodes.map(node => {
    const nodeWithPosition = g.node(node.id)
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

function treeNodesToFlowElements(treeNodes: TreeNode[], currentNodeId: string | null) {
  const nodes: Node[] = treeNodes.map(node => {
    // Label: selectedText for branch nodes, first user message for root, or fallback
    let label = node.selectedText ?? ''
    if (!label) {
      const firstUserMsg = node.messages.find(m => m.role === 'user')
      label = firstUserMsg ? firstUserMsg.content.slice(0, 50) : '新对话'
    }
    if (label.length > 50) label = label.slice(0, 50) + '…'

    return {
      id: node.id,
      type: 'mindMapNode',
      position: { x: 0, y: 0 },  // Will be set by Dagre
      data: {
        label,
        isActive: node.id === currentNodeId,
        isRoot: node.parentId === null,
      },
    }
  })

  const edges: Edge[] = treeNodes
    .filter(node => node.parentId !== null)
    .map(node => ({
      id: `${node.parentId}-${node.id}`,
      source: node.parentId!,
      target: node.id,
      type: 'smoothstep',
      style: { stroke: '#e2e8f0', strokeWidth: 1.5 },
    }))

  return getLayoutedElements(nodes, edges)
}

interface MindMapProps {
  treeId: string | null
}

export default function MindMap({ treeId }: MindMapProps) {
  const { nodes: treeNodes, currentNodeId, setCurrentNode } = useTreeStore()

  const currentTreeNodes = useMemo(
    () => treeNodes.filter(n => n.treeId === treeId),
    [treeNodes, treeId]
  )

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => treeNodesToFlowElements(currentTreeNodes, currentNodeId),
    [currentTreeNodes, currentNodeId]
  )

  // Use derived state directly — syncedNodes/syncedEdges always reflect store
  const [, , onNodesChange] = useNodesState(flowNodes)
  const [, , onEdgesChange] = useEdgesState(flowEdges)

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setCurrentNode(node.id)
  }, [setCurrentNode])

  if (!treeId || currentTreeNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary text-sm">
        开始对话后，思维导图将在这里显示
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
      >
        <Controls showInteractive={false} />
        <Background color="#e2e8f0" gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}
