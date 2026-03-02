import { useEffect } from 'react'
import Layout from './components/Layout'
import ConversationPanel from './components/Chat/ConversationPanel'
import MindMap from './components/MindMap/MindMap'
import { useTreeStore } from './store/treeStore'
import { useNodeStream } from './hooks/useNodeStream'

function App() {
  const { currentNodeId, currentTreeId, loadTrees, createTree, createNode } = useTreeStore()
  const { sendMessage, isStreaming } = useNodeStream()

  // Load trees on mount
  useEffect(() => {
    loadTrees()
  }, [loadTrees])

  // For now: auto-create a tree if none exists (Task 10 will add proper tree list UI)
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

    // Create child node
    const childNode = await createNode(currentNodeId, selectedText)

    // Auto-send first message
    const firstMessage = `请详细解释：${selectedText}`
    await sendMessage(childNode.id, firstMessage)
  }

  return (
    <Layout
      leftPanel={
        <MindMap treeId={currentTreeId} />
      }
      rightPanel={
        <ConversationPanel
          nodeId={currentNodeId}
          onSend={handleSend}
          onBranch={handleBranch}
          isStreaming={isStreaming}
        />
      }
    />
  )
}

export default App
