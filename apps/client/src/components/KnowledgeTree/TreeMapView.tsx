import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
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
import { getAncestorChain } from '../../store/treeUtils'
import TreeMapNode from './TreeMapNode'
import type { TreeNode } from '@repo/types'

const nodeTypes: NodeTypes = {
  treeMapNode: TreeMapNode,
}

const NODE_WIDTH = 160
const NODE_HEIGHT = 44

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 70 })

  nodes.forEach(node => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target)
  })
  dagre.layout(g)

  const layoutedNodes = nodes.map(node => {
    const pos = g.node(node.id)
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

function getNodeLabel(node: TreeNode, maxLen = 40): string {
  if (node.title) return node.title.slice(0, maxLen)
  if (node.selectedText) return node.selectedText.slice(0, maxLen)
  const firstMsg = node.messages.find(m => m.role === 'user')
  if (firstMsg) return firstMsg.content.slice(0, maxLen)
  return '新对话'
}

function treeNodesToFlow(treeNodes: TreeNode[], currentNodeId: string | null, ancestorIds: Set<string>) {
  const nodes: Node[] = treeNodes.map(node => {
    const childCount = treeNodes.filter(n => n.parentId === node.id).length
    return {
      id: node.id,
      type: 'treeMapNode',
      position: { x: 0, y: 0 },
      data: {
        label: getNodeLabel(node),
        isActive: node.id === currentNodeId,
        isOnPath: ancestorIds.has(node.id),
        isRoot: node.parentId === null,
        messageCount: node.messages.length,
        childCount,
      },
    }
  })

  const edges: Edge[] = treeNodes
    .filter(node => node.parentId !== null)
    .map(node => ({
      id: `e-${node.parentId}-${node.id}`,
      source: node.parentId!,
      target: node.id,
      type: 'smoothstep',
      style: {
        stroke: ancestorIds.has(node.id) ? '#3370FF' : '#e2e8f0',
        strokeWidth: ancestorIds.has(node.id) ? 2 : 1.5,
      },
    }))

  return getLayoutedElements(nodes, edges)
}

interface TreeMapViewProps {
  treeId: string | null
}

export default function TreeMapView({ treeId }: TreeMapViewProps) {
  const { nodes: treeNodes, currentNodeId, setCurrentNode } = useTreeStore()

  const currentTreeNodes = useMemo(
    () => treeNodes.filter(n => n.treeId === treeId),
    [treeNodes, treeId]
  )

  const ancestorIds = useMemo(() => {
    if (!currentNodeId) return new Set<string>()
    return new Set(getAncestorChain(currentTreeNodes, currentNodeId).map(n => n.id))
  }, [currentTreeNodes, currentNodeId])

  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => treeNodesToFlow(currentTreeNodes, currentNodeId, ancestorIds),
    [currentTreeNodes, currentNodeId, ancestorIds]
  )

  const [, , onNodesChange] = useNodesState(flowNodes)
  const [, , onEdgesChange] = useEdgesState(flowEdges)

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setCurrentNode(node.id)
  }, [setCurrentNode])

  if (!treeId || currentTreeNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-secondary/40 text-xs">
        开始对话后显示图谱
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
        fitViewOptions={{ padding: 0.4 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.3}
        maxZoom={2}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}
