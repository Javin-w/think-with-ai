import { useEffect } from 'react'
import Layout from './components/Layout'
import ConversationPanel from './components/Chat/ConversationPanel'
import { useTreeStore } from './store/treeStore'
import { useNodeStream } from './hooks/useNodeStream'

function App() {
  const { currentNodeId, loadTrees, createTree } = useTreeStore()
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

  return (
    <Layout
      leftPanel={
        <div className="flex items-center justify-center h-full text-text-secondary text-sm">
          Mind Map (Task 9)
        </div>
      }
      rightPanel={
        <ConversationPanel
          nodeId={currentNodeId}
          onSend={handleSend}
          isStreaming={isStreaming}
        />
      }
    />
  )
}

export default App
