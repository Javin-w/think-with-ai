import { useCallback, useEffect, useRef } from 'react'
import type { ChatMessage } from '@repo/types'
import { useAgentStore } from '../../store/agentStore'
import { useAgentStream } from '../../hooks/useAgentStream'
import ChatPreviewLayout from '../ChatPreview/ChatPreviewLayout'
import IframePreview, { type IframePreviewHandle } from './IframePreview'
import AgentChatPanel from './AgentChatPanel'

export default function PrototypeModule() {
  const {
    currentSessionId,
    messages,
    currentHtml,
    plan,
    steps,
    isRunning,
    createSession,
    addMessage,
    setCurrentHtml,
    setPlan,
    setSteps,
    setIsRunning,
    saveSession,
    resetCurrent,
  } = useAgentStore()

  const iframeRef = useRef<IframePreviewHandle>(null)

  const agentStream = useAgentStream({
    onFeedbackRequest: async () => {
      // Extract DOM info from the iframe preview
      if (iframeRef.current) {
        return iframeRef.current.extractDOMInfo()
      }
      return '{"error": "preview not available"}'
    },
  })
  const savePendingRef = useRef(false)

  // Sync agent stream state to store
  useEffect(() => {
    setIsRunning(agentStream.isRunning)
  }, [agentStream.isRunning, setIsRunning])

  useEffect(() => {
    if (agentStream.currentHtml) {
      setCurrentHtml(agentStream.currentHtml)
    }
  }, [agentStream.currentHtml, setCurrentHtml])

  useEffect(() => {
    if (agentStream.plan) {
      setPlan(agentStream.plan)
    }
  }, [agentStream.plan, setPlan])

  useEffect(() => {
    if (agentStream.steps.length > 0) {
      setSteps(agentStream.steps)
    }
  }, [agentStream.steps, setSteps])

  // Save session when agent finishes
  useEffect(() => {
    if (!agentStream.isRunning && savePendingRef.current) {
      savePendingRef.current = false
      // Add completion text as assistant message
      if (agentStream.completionText) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: agentStream.completionText,
          createdAt: Date.now(),
        })
      }
      saveSession()
    }
  }, [agentStream.isRunning, agentStream.completionText, addMessage, saveSession])

  const handleSend = useCallback(
    async (text: string) => {
      let sessionId = currentSessionId
      if (!sessionId) {
        const session = await createSession(text.slice(0, 60))
        sessionId = session.id
      }

      // Add user message to store
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        createdAt: Date.now(),
      }
      addMessage(userMsg)
      savePendingRef.current = true

      // Build existing messages for context
      const storeMessages = useAgentStore.getState().messages
      const existingMessages = storeMessages.slice(0, -1).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      // Build existing state for iterative modifications
      const storeState = useAgentStore.getState()
      const existingState = storeState.currentHtml
        ? {
            plan: storeState.plan,
            currentHtml: storeState.currentHtml,
            htmlSnapshots: [],
            requirementSummary: '',
          }
        : undefined

      await agentStream.runAgent({
        message: text,
        sessionId,
        existingState,
        existingMessages: existingMessages.length > 0 ? existingMessages : undefined,
      })
    },
    [currentSessionId, createSession, addMessage, agentStream]
  )

  const handleNewPrototype = useCallback(() => {
    resetCurrent()
  }, [resetCurrent])

  return (
    <div className="flex flex-col h-full">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface">
        <button
          onClick={handleNewPrototype}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-brand transition-colors"
        >
          + 新建原型
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        <ChatPreviewLayout
          chatPanel={
            <AgentChatPanel
              messages={messages}
              steps={steps}
              plan={plan}
              isRunning={isRunning}
              clarifyQuestions={agentStream.clarifyQuestions}
              error={agentStream.error}
              onSend={handleSend}
            />
          }
          previewPanel={
            <IframePreview
              ref={iframeRef}
              htmlContent={currentHtml}
              onQuickEdit={currentHtml ? handleSend : undefined}
            />
          }
        />
      </div>
    </div>
  )
}
