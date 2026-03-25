import { useCallback, useEffect, useRef } from 'react'
import type { ChatMessage } from '@repo/types'
import { useDocStore } from '../../store/chatSessionStore'
import { useChatStream } from '../../hooks/useChatStream'
import ChatPreviewLayout from '../ChatPreview/ChatPreviewLayout'
import SimpleChatPanel from '../ChatPreview/SimpleChatPanel'
import MarkdownPreview from './MarkdownPreview'

export default function DocModule() {
  const {
    currentSessionId,
    messages,
    output,
    isStreaming,
    createSession,
    addMessage,
    updateLastMessage,
    setOutput,
    setIsStreaming,
    saveSession,
  } = useDocStore()

  const { sendMessage, isStreaming: streamIsActive, streamingContent } = useChatStream({ mode: 'document' })
  const savePendingRef = useRef(false)

  // Sync streaming state to store
  useEffect(() => {
    setIsStreaming(streamIsActive)
  }, [streamIsActive, setIsStreaming])

  // Update output during streaming
  useEffect(() => {
    if (streamingContent) {
      setOutput(streamingContent)
    }
  }, [streamingContent, setOutput])

  // Save session when streaming finishes
  useEffect(() => {
    if (!streamIsActive && savePendingRef.current) {
      savePendingRef.current = false
      saveSession()
    }
  }, [streamIsActive, saveSession])

  const handleSend = useCallback(async (text: string) => {
    let sessionId = currentSessionId
    if (!sessionId) {
      const session = await createSession(text.slice(0, 60))
      sessionId = session.id
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }
    addMessage(userMsg)

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    }
    addMessage(assistantMsg)

    savePendingRef.current = true

    try {
      const currentMessages = useDocStore.getState().messages
      // Send all messages except the empty assistant placeholder
      const contextMessages = currentMessages.slice(0, -1)
      const fullResponse = await sendMessage(contextMessages, text)
      updateLastMessage(fullResponse)
      setOutput(fullResponse)
    } catch {
      updateLastMessage('生成失败，请重试。')
    }
  }, [currentSessionId, createSession, addMessage, updateLastMessage, setOutput, sendMessage])

  const handleNewDoc = useCallback(() => {
    useDocStore.setState({
      currentSessionId: null,
      messages: [],
      output: '',
    })
  }, [])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Top toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface">
        <button
          onClick={handleNewDoc}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-brand transition-colors"
        >
          + 新建文档
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        <ChatPreviewLayout
          chatPanel={
            <SimpleChatPanel
              messages={messages}
              onSend={handleSend}
              isStreaming={isStreaming}
              placeholder="描述你想要的文档内容..."
              emptyStateIcon="📝"
              emptyStateText="描述你想要的文档，AI 将为你生成"
            />
          }
          previewPanel={<MarkdownPreview content={output} />}
        />
      </div>
    </div>
  )
}
