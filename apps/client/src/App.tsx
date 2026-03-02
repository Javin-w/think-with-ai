import { useEffect, useRef } from 'react'
import Layout from './components/Layout'
import ConversationPanel from './components/Chat/ConversationPanel'
import MindMap from './components/MindMap/MindMap'
import TreeList from './components/TreeList/TreeList'
import { useTreeStore } from './store/treeStore'
import { useNodeStream } from './hooks/useNodeStream'

function App() {
  const {
    trees,
    currentNodeId,
    currentTreeId,
    view,
    loadTrees,
    loadTree,
    createTree,
    createNode,
    setView,
    setCurrentNode,
  } = useTreeStore()
  const { sendMessage, isStreaming } = useNodeStream()
  const inputAutoFocusRef = useRef(false)

  // Load trees on mount
  useEffect(() => {
    loadTrees()
  }, [loadTrees])

  const handleSelectTree = async (treeId: string) => {
    await loadTree(treeId)
    // Set current node to root node of the tree
    const state = useTreeStore.getState()
    const rootNode = state.nodes.find(n => n.treeId === treeId && n.parentId === null)
    if (rootNode) {
      setCurrentNode(rootNode.id)
    }
    setView('tree')
  }

  const handleCreateTree = () => {
    // Switch to tree view with no current tree — first message will create the tree
    setView('tree')
    // Reset current tree/node so first message creates a new tree
    useTreeStore.setState({ currentTreeId: null, currentNodeId: null, nodes: [] })
    inputAutoFocusRef.current = true
  }

  const handleBackToList = () => {
    setView('list')
    // Reload trees to get updated titles
    loadTrees()
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
    const childNode = await createNode(currentNodeId, selectedText)
    const firstMessage = `请详细解释：${selectedText}`
    await sendMessage(childNode.id, firstMessage)
  }

  if (view === 'list') {
    return (
      <TreeList
        trees={trees}
        onSelectTree={handleSelectTree}
        onCreateTree={handleCreateTree}
      />
    )
  }

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
}

export default App
