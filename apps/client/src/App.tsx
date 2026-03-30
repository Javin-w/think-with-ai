import { useEffect, useRef, useState } from 'react'
import TreeList from './components/TreeList/TreeList'
import Homepage from './components/Homepage/Homepage'
import Sidebar from './components/Sidebar/Sidebar'
import TreeNavPanel from './components/KnowledgeTree/TreeNavPanel'
import BranchConversationPanel from './components/KnowledgeTree/BranchConversationPanel'
import AnnotationsPanel from './components/KnowledgeTree/AnnotationsPanel'
import { useTreeStore } from './store/treeStore'
import { useAppStore } from './store/appStore'
import { useNodeStream } from './hooks/useNodeStream'
import PrototypeModule from './components/Prototype/PrototypeModule'
import NewsModule from './components/News/NewsModule'
import NewsAdmin from './components/News/NewsAdmin'

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

  // Pending annotation state (lifted here to coordinate popup → panel)
  const [pendingAnnotation, setPendingAnnotation] = useState<{ selectedText: string; messageId: string } | null>(null)
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [annotationsPanelCollapsed, setAnnotationsPanelCollapsed] = useState(true)

  useEffect(() => {
    if (currentView === 'thinking-list') {
      loadTrees()
    }
  }, [currentView, loadTrees])

  // Clear pending annotation when node changes
  useEffect(() => {
    setPendingAnnotation(null)
    setActiveAnnotationId(null)
  }, [currentNodeId])

  // Clear active annotation after flash animation
  useEffect(() => {
    if (activeAnnotationId) {
      const timer = setTimeout(() => setActiveAnnotationId(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [activeAnnotationId])

  // Click annotation in conversation → expand panel + scroll to it
  const handleHighlightClick = (annotationId: string) => {
    setAnnotationsPanelCollapsed(false)
    setActiveAnnotationId(annotationId)
    // Scroll to annotation in panel
    setTimeout(() => {
      document.querySelector(`[data-panel-annotation-id="${annotationId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  // Click annotation in panel → scroll to highlight in conversation
  const handleAnnotationClick = (annotationId: string) => {
    setActiveAnnotationId(annotationId)
    const el = document.querySelector(`mark[data-annotation-id="${annotationId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleSelectTree = async (treeId: string) => {
    await loadTree(treeId)
    const state = useTreeStore.getState()
    const rootNode = state.nodes.find(n => n.treeId === treeId && n.parentId === null)
    if (rootNode) {
      setCurrentNode(rootNode.id)
    }
    navigateTo('thinking-tree')
  }

  const handleCreateTree = () => {
    navigateTo('thinking-tree')
    useTreeStore.setState({ currentTreeId: null, currentNodeId: null, nodes: [] })
    inputAutoFocusRef.current = true
  }

  const handleBackToList = () => {
    navigateTo('thinking-list')
  }

  const handleSend = async (message: string) => {
    if (!currentNodeId) {
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

  const handleAnnotate = (selectedText: string, messageId: string) => {
    setPendingAnnotation({ selectedText, messageId })
  }

  const handleExportLark = async (markdown: string, title: string) => {
    try {
      const res = await fetch('/api/export/lark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, title }),
      })
      if (!res.ok) throw new Error('飞书文档创建失败')
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch {
      // Fallback: already copied to clipboard by TreeNavPanel
    }
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Homepage />

      case 'news':
        return <NewsModule />

      case 'news-admin':
        return <NewsAdmin />

      case 'prototype':
        return <PrototypeModule />

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
          <div className="flex h-screen">
            <TreeNavPanel treeId={currentTreeId} onBack={handleBackToList} onExportLark={handleExportLark} />
            <BranchConversationPanel
              nodeId={currentNodeId}
              onSend={handleSend}
              onBranch={handleBranch}
              onAnnotate={handleAnnotate}
              onHighlightClick={handleHighlightClick}
              activeAnnotationId={activeAnnotationId}
              isStreaming={isStreaming}
            />
            <AnnotationsPanel
              nodeId={currentNodeId}
              pendingAnnotation={pendingAnnotation}
              onPendingClear={() => setPendingAnnotation(null)}
              onAnnotationClick={handleAnnotationClick}
              activeAnnotationId={activeAnnotationId}
              collapsed={annotationsPanelCollapsed}
              onCollapsedChange={setAnnotationsPanelCollapsed}
            />
          </div>
        )

      default:
        return <Homepage />
    }
  }

  // thinking-tree uses full width without sidebar
  const isFullWidth = currentView === 'thinking-tree'

  return isFullWidth ? (
    <div className="h-screen">{renderView()}</div>
  ) : (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-hidden">{renderView()}</main>
    </div>
  )
}

export default App
