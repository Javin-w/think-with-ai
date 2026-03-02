import type { TreeNode, ChatMessage } from '@repo/types'

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
