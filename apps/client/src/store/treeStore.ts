import { create } from 'zustand'
import type { Tree, TreeNode, ChatMessage, Annotation } from '@repo/types'
import { db } from '../db/index'

interface TreeStore {
  // State
  trees: Tree[]
  nodes: TreeNode[]
  currentTreeId: string | null
  currentNodeId: string | null

  // Actions
  loadTrees: () => Promise<void>
  loadTree: (treeId: string) => Promise<void>
  createTree: (firstQuestion: string) => Promise<{ tree: Tree; rootNode: TreeNode }>
  createNode: (parentId: string, selectedText: string | null) => Promise<TreeNode>
  addMessage: (nodeId: string, message: ChatMessage) => Promise<void>
  updateLastMessage: (nodeId: string, content: string) => Promise<void>
  updateTreeTitle: (treeId: string, title: string) => Promise<void>
  setCurrentTree: (treeId: string | null) => void
  setCurrentNode: (nodeId: string | null) => void
  getChildNodes: (nodeId: string) => TreeNode[]
  addAnnotation: (nodeId: string, annotation: Annotation) => Promise<void>
  removeAnnotation: (nodeId: string, annotationId: string) => Promise<void>
}

export const useTreeStore = create<TreeStore>((set, get) => ({
  trees: [],
  nodes: [],
  currentTreeId: null,
  currentNodeId: null,

  loadTrees: async () => {
    const trees = await db.trees.orderBy('updatedAt').reverse().toArray()
    set({ trees })
  },

  loadTree: async (treeId: string) => {
    const nodes = await db.nodes.where('treeId').equals(treeId).toArray()
    set({ nodes, currentTreeId: treeId })
  },

  createTree: async (firstQuestion: string) => {
    const now = Date.now()
    const tree: Tree = {
      id: crypto.randomUUID(),
      title: firstQuestion.slice(0, 60),
      createdAt: now,
      updatedAt: now,
    }
    const rootNode: TreeNode = {
      id: crypto.randomUUID(),
      treeId: tree.id,
      parentId: null,
      selectedText: null,
      messages: [],
      createdAt: now,
    }
    await db.trees.add(tree)
    await db.nodes.add(rootNode)
    set(state => ({
      trees: [tree, ...state.trees],
      nodes: [rootNode],
      currentTreeId: tree.id,
      currentNodeId: rootNode.id,
    }))
    return { tree, rootNode }
  },

  createNode: async (parentId: string, selectedText: string | null) => {
    const { currentTreeId } = get()
    if (!currentTreeId) throw new Error('No current tree')
    const node: TreeNode = {
      id: crypto.randomUUID(),
      treeId: currentTreeId,
      parentId,
      selectedText,
      messages: [],
      createdAt: Date.now(),
    }
    await db.nodes.add(node)
    set(state => ({
      nodes: [...state.nodes, node],
      currentNodeId: node.id,
    }))
    return node
  },

  addMessage: async (nodeId: string, message: ChatMessage) => {
    const { nodes } = get()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const updatedMessages = [...node.messages, message]
    await db.nodes.update(nodeId, { messages: updatedMessages })
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, messages: updatedMessages } : n
      ),
    }))
  },

  updateLastMessage: async (nodeId: string, content: string) => {
    const { nodes } = get()
    const node = nodes.find(n => n.id === nodeId)
    if (!node || node.messages.length === 0) return
    const updatedMessages = node.messages.map((m, i) =>
      i === node.messages.length - 1 ? { ...m, content } : m
    )
    await db.nodes.update(nodeId, { messages: updatedMessages })
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, messages: updatedMessages } : n
      ),
    }))
  },

  updateTreeTitle: async (treeId: string, title: string) => {
    const now = Date.now()
    await db.trees.update(treeId, { title, updatedAt: now })
    set(state => ({
      trees: state.trees.map(t =>
        t.id === treeId ? { ...t, title, updatedAt: now } : t
      ),
    }))
  },

  setCurrentTree: (treeId) => set({ currentTreeId: treeId }),
  setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),

  getChildNodes: (nodeId: string) => {
    return get().nodes.filter(n => n.parentId === nodeId)
  },

  addAnnotation: async (nodeId, annotation) => {
    const { nodes } = get()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const annotations = [...(node.annotations || []), annotation]
    await db.nodes.update(nodeId, { annotations })
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, annotations } : n
      ),
    }))
  },

  removeAnnotation: async (nodeId, annotationId) => {
    const { nodes } = get()
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const annotations = (node.annotations || []).filter(a => a.id !== annotationId)
    await db.nodes.update(nodeId, { annotations })
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, annotations } : n
      ),
    }))
  },
}))
