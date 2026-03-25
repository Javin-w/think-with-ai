import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ChatMessage } from '@repo/types'
import { usePrototypeStore } from '../../store/chatSessionStore'
import { useChatStream } from '../../hooks/useChatStream'
import ChatPreviewLayout from '../ChatPreview/ChatPreviewLayout'
import SimpleChatPanel from '../ChatPreview/SimpleChatPanel'
import IframePreview from './IframePreview'

/** Extract HTML from ```html ... ``` code block in AI response */
function extractHtml(text: string): string {
  const match = text.match(/```html\s*\n([\s\S]*?)```/)
  return match ? match[1].trim() : ''
}

export default function PrototypeModule() {
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
  } = usePrototypeStore()

  const { sendMessage, isStreaming: streamIsActive, streamingContent } = useChatStream({ mode: 'prototype' })
  const savePendingRef = useRef(false)

  // Sync streaming state to store
  useEffect(() => {
    setIsStreaming(streamIsActive)
  }, [streamIsActive, setIsStreaming])

  // Update output during streaming — extract HTML from streaming content
  useEffect(() => {
    if (streamingContent) {
      const html = extractHtml(streamingContent)
      if (html) {
        setOutput(html)
      }
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
      const currentMessages = usePrototypeStore.getState().messages
      const contextMessages = currentMessages.slice(0, -1)
      const fullResponse = await sendMessage(contextMessages, text)
      updateLastMessage(fullResponse)
      const html = extractHtml(fullResponse)
      if (html) {
        setOutput(html)
      }
    } catch {
      updateLastMessage('生成失败，请重试。')
    }
  }, [currentSessionId, createSession, addMessage, updateLastMessage, setOutput, sendMessage])

  const handleNewPrototype = useCallback(() => {
    usePrototypeStore.setState({
      currentSessionId: null,
      messages: [],
      output: '',
    })
  }, [])

  // Memoize the extracted HTML for the preview to avoid re-parsing on every render
  const previewHtml = useMemo(() => output, [output])

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
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
            <SimpleChatPanel
              messages={messages}
              onSend={handleSend}
              isStreaming={isStreaming}
              placeholder="描述你想要的页面原型..."
              emptyStateIcon="🖥️"
              emptyStateText="描述你的需求，AI 将生成可运行的原型"
            />
          }
          previewPanel={<IframePreview htmlContent={previewHtml} />}
        />
      </div>
    </div>
  )
}
