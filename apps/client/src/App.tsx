import { useEffect, useRef } from 'react'
import Layout from './components/Layout'
import ConversationPanel from './components/Chat/ConversationPanel'
import MindMap from './components/MindMap/MindMap'
import TreeList from './components/TreeList/TreeList'
import TopNav from './components/TopNav/TopNav'
import Homepage from './components/Homepage/Homepage'
import { useTreeStore } from './store/treeStore'
import { useAppStore } from './store/appStore'
import { useNodeStream } from './hooks/useNodeStream'

function App() {
  const {
    trees,
    currentNodeId,
    currentTreeId,
    loadTrees,
    loadTree,
    createTree,
    createNode,
    setCurrentNode,
  } = useTreeStore()
  const { currentView, navigateTo } = useAppStore()
  const { sendMessage, isStreaming } = useNodeStream()
  const inputAutoFocusRef = useRef(false)

  // Load trees when entering thinking-list view
  useEffect(() => {
    if (currentView === 'thinking-list') {
      loadTrees()
    }
  }, [currentView, loadTrees])

  const handleSelectTree = async (treeId: string) => {
    await loadTree(treeId)
    // Set current node to root node of the tree
    const state = useTreeStore.getState()
    const rootNode = state.nodes.find(n => n.treeId === treeId && n.parentId === null)
    if (rootNode) {
      setCurrentNode(rootNode.id)
    }
    navigateTo('thinking-tree')
  }

  const handleCreateTree = () => {
    // Switch to tree view with no current tree — first message will create the tree
    navigateTo('thinking-tree')
    // Reset current tree/node so first message creates a new tree
    useTreeStore.setState({ currentTreeId: null, currentNodeId: null, nodes: [] })
    inputAutoFocusRef.current = true
  }

  const handleBackToList = () => {
    navigateTo('thinking-list')
  }

  const handleSend = async (message: string) => {
    if (!currentNodeId) {
      // Create a new tree with this first message
      const { rootNode } = await createTree(message)
      await sendMessage(rootNode.id, message)
    } else {
      await sendMessage(currentNodeId, message)
    }
  }

  const handleBranch = async (selectedText: string) => {
    if (!currentNodeId || isStreaming) return
    await createNode(currentNodeId, selectedText)
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Homepage />

      case 'news':
        return <div className="p-10 text-center text-text-secondary">News coming soon</div>

      case 'doc':
        return <div className="p-10 text-center text-text-secondary">Doc coming soon</div>

      case 'prototype':
        return <div className="p-10 text-center text-text-secondary">Prototype coming soon</div>

      case 'thinking-list':
        return (
          <TreeList
            trees={trees}
            onSelectTree={handleSelectTree}
            onCreateTree={handleCreateTree}
          />
        )

      case 'thinking-tree':
        return (
          <div className="relative">
            {/* Back button */}
            <button
              onClick={handleBackToList}
              className="absolute top-3 left-3 z-10 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary bg-white border border-border rounded-lg hover:border-brand transition-colors"
            >
              ← 返回列表
            </button>
            <Layout
              leftPanel={<MindMap treeId={currentTreeId} />}
              rightPanel={
                <ConversationPanel
                  nodeId={currentNodeId}
                  onSend={handleSend}
                  onBranch={handleBranch}
                  isStreaming={isStreaming}
                />
              }
            />
          </div>
        )

      default:
        return <Homepage />
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav />
      {renderView()}
    </div>
  )
}

export default App
