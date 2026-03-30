import type { TreeNode, ChatMessage } from '@repo/types'

/** Nested tree node structure for TreeNavPanel */
export interface TreeNavItem {
  node: TreeNode
  children: TreeNavItem[]
}

/** Build nested tree structure from flat node array */
export function buildTreeStructure(nodes: TreeNode[]): TreeNavItem[] {
  const nodeMap = new Map<string, TreeNavItem>()
  const roots: TreeNavItem[] = []

  // Create items
  for (const node of nodes) {
    nodeMap.set(node.id, { node, children: [] })
  }

  // Build hierarchy
  for (const node of nodes) {
    const item = nodeMap.get(node.id)!
    if (node.parentId === null) {
      roots.push(item)
    } else {
      const parent = nodeMap.get(node.parentId)
      if (parent) {
        parent.children.push(item)
      }
    }
  }

  // Sort children by createdAt
  const sortChildren = (items: TreeNavItem[]) => {
    items.sort((a, b) => a.node.createdAt - b.node.createdAt)
    items.forEach(item => sortChildren(item.children))
  }
  sortChildren(roots)

  return roots
}

/** Get node display label */
export function getNodeLabel(node: TreeNode, maxLen = 30): string {
  if (node.title) return node.title.slice(0, maxLen)
  if (node.selectedText) return node.selectedText.slice(0, maxLen)
  const firstUserMsg = node.messages.find(m => m.role === 'user')
  if (firstUserMsg) return firstUserMsg.content.slice(0, maxLen)
  return '新对话'
}

/** Get direct children of a node */
export function getChildren(nodes: TreeNode[], nodeId: string): TreeNode[] {
  return nodes.filter(n => n.parentId === nodeId)
}

/** Get the chain from root to the given node (inclusive) */
export function getAncestorChain(nodes: TreeNode[], nodeId: string): TreeNode[] {
  const chain: TreeNode[] = []
  let current = nodes.find(n => n.id === nodeId)
  while (current) {
    chain.unshift(current)
    if (current.parentId === null) break
    current = nodes.find(n => n.id === current!.parentId)
  }
  return chain
}

/** Serialize tree to nested structure for export API */
export function serializeTreeForExport(nodes: TreeNode[]): any {
  const tree = buildTreeStructure(nodes)
  if (tree.length === 0) return null

  function serializeItem(item: TreeNavItem): any {
    return {
      selectedText: item.node.selectedText,
      messages: item.node.messages.map(m => ({ role: m.role, content: m.content })),
      annotations: item.node.annotations?.map(a => ({ selectedText: a.selectedText, content: a.content })) || [],
      children: item.children.map(serializeItem),
    }
  }

  return serializeItem(tree[0])
}

/** Build the context messages to send to AI:
 *  parent node's full messages + current node's messages
 *  (excludes the current node's last user message since that's sent as `message`) */
export function getContextMessages(nodes: TreeNode[], nodeId: string): ChatMessage[] {
  const chain = getAncestorChain(nodes, nodeId)
  // All messages from ancestor nodes (not including current node)
  const parentMessages = chain.slice(0, -1).flatMap(n => n.messages)
  // Current node's messages (all of them — the hook will send the latest user msg separately)
  const currentNode = chain[chain.length - 1]
  const currentMessages = currentNode ? currentNode.messages : []
  return [...parentMessages, ...currentMessages]
}
