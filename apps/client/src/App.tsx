import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Homepage from './components/Homepage/Homepage'
import SideRail from './components/Shell/SideRail'
import { useTreeStore } from './store/treeStore'
import { useAppStore } from './store/appStore'
import { useNodeStream } from './hooks/useNodeStream'
import { useOnboarding } from './hooks/useOnboarding'

// Heavy route components are loaded on-demand so the homepage bundle stays small.
// Modules pulling xyflow / react-markdown / highlight.js / katex only ship when
// the user navigates into thinking-tree / prototype / news.
const TreeList = lazy(() => import('./components/TreeList/TreeList'))
const TreeNavPanel = lazy(() => import('./components/KnowledgeTree/TreeNavPanel'))
const BranchConversationPanel = lazy(() => import('./components/KnowledgeTree/BranchConversationPanel'))
const AnnotationsPanel = lazy(() => import('./components/KnowledgeTree/AnnotationsPanel'))
const TreeMapFloat = lazy(() => import('./components/KnowledgeTree/TreeMapFloat'))
const PrototypeModule = lazy(() => import('./components/Prototype/PrototypeModule'))
const PrototypeList = lazy(() => import('./components/Prototype/PrototypeList'))
const NewsModule = lazy(() => import('./components/News/NewsModule'))

function RouteFallback() {
  return (
    <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
      <span className="opacity-60">加载中…</span>
    </div>
  )
}

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
  const { sendMessage, streamingNodeId } = useNodeStream()
  // Derived: is *the currently selected* node mid-stream? Avoids leaking the
  // "thinking..." indicator and input-disabled state across branches when the
  // user switches nodes while another is still streaming.
  const isCurrentNodeStreaming = streamingNodeId !== null && streamingNodeId === currentNodeId
  const inputAutoFocusRef = useRef(false)
  const {
    showBranchTip,
    triggerBranchTip,
    dismissBranchTip,
    showBranchCelebration,
    triggerFirstBranchCelebration,
  } = useOnboarding()

  // Pending annotation state (lifted here to coordinate popup → panel)
  const [pendingAnnotation, setPendingAnnotation] = useState<{ selectedText: string; messageId: string } | null>(null)
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [annotationsPanelCollapsed, setAnnotationsPanelCollapsed] = useState(true)
  const [mapFloatOpen, setMapFloatOpen] = useState(() => localStorage.getItem('treeMapFloatOpen') === 'true')
  const toggleMapFloat = useCallback(() => {
    setMapFloatOpen(prev => {
      const next = !prev
      localStorage.setItem('treeMapFloatOpen', String(next))
      return next
    })
  }, [])

  useEffect(() => {
    if (currentView === 'thinking-list') {
      loadTrees()
    }
  }, [currentView, loadTrees])

  // Trigger branch tip after first AI reply on root node — only when the
  // stream that just ended belonged to the currently selected node.
  const prevStreamingNodeIdRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevStreamingNodeIdRef.current
    if (prev && !streamingNodeId && prev === currentNodeId) {
      const state = useTreeStore.getState()
      const node = state.nodes.find(n => n.id === currentNodeId)
      if (node && node.parentId === null && node.messages.length === 2) {
        triggerBranchTip()
      }
    }
    prevStreamingNodeIdRef.current = streamingNodeId
  }, [streamingNodeId, currentNodeId, triggerBranchTip])

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

  // Consume pendingMessage from Homepage
  useEffect(() => {
    if (currentView === 'thinking-tree') {
      const pending = sessionStorage.getItem('pendingMessage')
      if (pending) {
        sessionStorage.removeItem('pendingMessage')
        handleSend(pending)
      }
    }
  }, [currentView])

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

  const handleSend = async (message: string, images?: string[], newBranch?: boolean) => {
    if (!currentNodeId) {
      const { rootNode } = await createTree(message)
      await sendMessage(rootNode.id, message, images)
      return
    }
    // newBranch toggle (manual branch): spawn a child node with selectedText=null
    // and send the user's message into it. Ancestor context is auto-included
    // by getContextMessages, so the child inherits the parent thread naturally.
    if (newBranch) {
      dismissBranchTip()
      const child = await createNode(currentNodeId, null)
      triggerFirstBranchCelebration()
      await sendMessage(child.id, message, images)
      return
    }
    await sendMessage(currentNodeId, message, images)
  }

  const handleBranch = async (selectedText: string) => {
    if (!currentNodeId || isCurrentNodeStreaming) return
    dismissBranchTip()
    const newNode = await createNode(currentNodeId, selectedText)
    triggerFirstBranchCelebration()
    const autoPrompt = `请解释「${selectedText}」。`
    await sendMessage(newNode.id, autoPrompt)
  }

  const handleAnnotate = (selectedText: string, messageId: string) => {
    setPendingAnnotation({ selectedText, messageId })
  }

  const renderView = () => {
    switch (currentView) {
      case 'home':
        // Homepage renders its own full-width SideRail internally
        return <Homepage />

      case 'news':
        return (
          <div className="flex h-screen bg-surface-secondary">
            <SideRail />
            <main className="flex-1 overflow-hidden">
              <Suspense fallback={<RouteFallback />}><NewsModule /></Suspense>
            </main>
          </div>
        )

      case 'prototype-list':
        return (
          <div className="flex h-screen bg-surface-secondary">
            <SideRail />
            <main className="flex-1 overflow-hidden">
              <Suspense fallback={<RouteFallback />}><PrototypeList /></Suspense>
            </main>
          </div>
        )

      case 'prototype':
        return (
          <div className="flex h-screen bg-surface-secondary">
            <SideRail compact />
            <main className="flex-1 overflow-hidden">
              <Suspense fallback={<RouteFallback />}><PrototypeModule /></Suspense>
            </main>
          </div>
        )

      case 'thinking-list':
        return (
          <div className="flex h-screen bg-surface-secondary">
            <SideRail />
            <main className="flex-1 overflow-hidden">
              <Suspense fallback={<RouteFallback />}>
                <TreeList
                  trees={trees}
                  onSelectTree={handleSelectTree}
                  onCreateTree={handleCreateTree}
                />
              </Suspense>
            </main>
          </div>
        )

      case 'thinking-tree':
        return (
          <div className="flex h-screen relative bg-surface-secondary">
            <SideRail compact />
            <Suspense fallback={<RouteFallback />}>
              <TreeNavPanel treeId={currentTreeId} mapOpen={mapFloatOpen} onToggleMap={toggleMapFloat} />
              <BranchConversationPanel
                nodeId={currentNodeId}
                onSend={handleSend}
                onBranch={handleBranch}
                onAnnotate={handleAnnotate}
                onHighlightClick={handleHighlightClick}
                activeAnnotationId={activeAnnotationId}
                isStreaming={isCurrentNodeStreaming}
              />
              {mapFloatOpen && <TreeMapFloat treeId={currentTreeId} onClose={toggleMapFloat} />}
              <AnnotationsPanel
                nodeId={currentNodeId}
                pendingAnnotation={pendingAnnotation}
                onPendingClear={() => setPendingAnnotation(null)}
                onAnnotationClick={handleAnnotationClick}
                activeAnnotationId={activeAnnotationId}
                collapsed={annotationsPanelCollapsed}
                onCollapsedChange={setAnnotationsPanelCollapsed}
              />
            </Suspense>

            {/* Onboarding: branch tip tooltip */}
            {showBranchTip && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
                <div className="bg-surface text-text-primary text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3 whitespace-nowrap border border-border">
                  <span>试试选中上方回答中感兴趣的文字，展开新的知识分支</span>
                  <button onClick={dismissBranchTip} className="text-text-secondary hover:text-text-primary shrink-0 text-xs">✕</button>
                </div>
              </div>
            )}

            {/* Onboarding: first branch celebration */}
            {showBranchCelebration && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
                <div className="bg-brand text-surface-secondary text-sm px-5 py-2.5 rounded-xl shadow-lg">
                  你创建了第一个知识分支！继续探索，构建你的对话树
                </div>
              </div>
            )}
          </div>
        )

      default:
        return <Homepage />
    }
  }

  return <div className="h-screen bg-surface-secondary">{renderView()}</div>
}

export default App
