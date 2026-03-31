import { useState, useCallback, useRef } from 'react'
import { useTreeStore } from '../store/treeStore'
import { getContextMessages } from '../store/treeUtils'

export function useNodeStream() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const { addMessage, updateLastMessage, updateTreeTitle } = useTreeStore()

  const sendMessage = useCallback(async (nodeId: string, userMessage: string, images?: string[]) => {
    setIsStreaming(true)
    setError(null)

    // 1. Add user message to store
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: userMessage,
      images,
      createdAt: Date.now(),
    }
    await addMessage(nodeId, userMsg)

    // 2. Build context: ancestor chain messages + current node messages (now includes user msg)
    // Re-read nodes from store after adding user message
    const currentNodes = useTreeStore.getState().nodes
    const contextMessages = getContextMessages(currentNodes, nodeId)
    // The last message in context is the user message we just added — send it as `message`
    // and the rest as `context`
    const context = contextMessages.slice(0, -1)
    const message = userMessage

    // 3. Add empty assistant message placeholder
    const assistantMsg = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: '',
      createdAt: Date.now(),
    }
    await addMessage(nodeId, assistantMsg)

    // 4. Stream from backend
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, images }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error ?? `HTTP ${response.status}`)
      }

      if (!response.body) throw new Error('No response body')

      // 5. Parse Vercel AI SDK data stream protocol
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let lineBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Buffer partial lines across chunk boundaries
        lineBuffer += chunk
        const lines = lineBuffer.split('\n')
        // Keep the last (potentially incomplete) line in the buffer
        lineBuffer = lines.pop() ?? ''

        for (const line of lines) {
          // Handle error events from Vercel AI SDK data stream protocol (prefix '3:')
          if (line.startsWith('3:')) {
            const errorMsg = JSON.parse(line.slice(2))
            throw new Error(typeof errorMsg === 'string' ? errorMsg : 'AI provider error')
          }
          if (!line.startsWith('0:')) continue  // Only text delta events
          try {
            const jsonStr = line.slice(2)  // Remove "0:" prefix
            const text = JSON.parse(jsonStr)
            if (typeof text === 'string') {
              accumulated += text
              await updateLastMessage(nodeId, accumulated)
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
      // Process any remaining buffered content
      if (lineBuffer.startsWith('0:')) {
        try {
          const text = JSON.parse(lineBuffer.slice(2))
          if (typeof text === 'string') {
            accumulated += text
            await updateLastMessage(nodeId, accumulated)
          }
        } catch {
          // Skip malformed final line
        }
      }

      // 6. Update tree title if this is the first message in the tree
      const state = useTreeStore.getState()
      const treeNodes = state.nodes.filter(n => n.treeId === state.currentTreeId)
      const rootNode = treeNodes.find(n => n.parentId === null)
      if (rootNode && rootNode.id === nodeId && rootNode.messages.length <= 2) {
        // First exchange in root node — update tree title
        await updateTreeTitle(state.currentTreeId!, userMessage.slice(0, 60))
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const errorMsg = err instanceof Error ? err.message : 'Failed to get AI response'
      setError(errorMsg)
      // Update the assistant message placeholder with error
      await updateLastMessage(nodeId, `❌ Error: ${errorMsg}`)
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [addMessage, updateLastMessage, updateTreeTitle])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { sendMessage, isStreaming, error, abort }
}
