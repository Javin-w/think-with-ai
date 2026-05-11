import { useState, useCallback, useRef } from 'react'
import { useTreeStore } from '../store/treeStore'
import { useChatSettingsStore } from '../store/chatSettingsStore'
import { getContextMessages } from '../store/treeUtils'

export function useNodeStream() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const {
    addMessage,
    updateLastMessage,
    updateLastMessageMeta,
    appendLastMessageCitations,
    updateTreeTitle,
  } = useTreeStore()

  const sendMessage = useCallback(async (nodeId: string, userMessage: string, images?: string[]) => {
    setIsStreaming(true)
    setError(null)

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: userMessage,
      images,
      createdAt: Date.now(),
    }
    await addMessage(nodeId, userMsg)

    const currentNodes = useTreeStore.getState().nodes
    const contextMessages = getContextMessages(currentNodes, nodeId)
    const context = contextMessages.slice(0, -1)
    const message = userMessage

    const assistantMsg = {
      id: crypto.randomUUID(),
      role: 'assistant' as const,
      content: '',
      createdAt: Date.now(),
    }
    await addMessage(nodeId, assistantMsg)

    abortControllerRef.current = new AbortController()

    try {
      const webSearch = useChatSettingsStore.getState().webSearchEnabled
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context, images, webSearch }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error ?? `HTTP ${response.status}`)
      }
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let lineBuffer = ''
      // Bocha web_search has no explicit "search finished" boundary —
      // when the model starts emitting text deltas, the search is over.
      // Clear the "searching…" bar on the first text delta after a
      // search-start event so it doesn't overlap with the streaming answer.
      let searchBarActive = false

      const processLine = async (line: string) => {
        if (line.startsWith('3:')) {
          const errorMsg = JSON.parse(line.slice(2))
          throw new Error(typeof errorMsg === 'string' ? errorMsg : 'AI provider error')
        }
        if (line.startsWith('2:')) {
          try {
            const events = JSON.parse(line.slice(2))
            if (!Array.isArray(events)) return
            for (const e of events) {
              if (e?.type === 'search-start' && typeof e.query === 'string') {
                searchBarActive = true
                await updateLastMessageMeta(nodeId, { searchInProgress: e.query })
              } else if (e?.type === 'search-results' && Array.isArray(e.citations)) {
                await appendLastMessageCitations(nodeId, e.citations)
              } else if (e?.type === 'search-done') {
                searchBarActive = false
                const patch: { searchInProgress?: undefined; searchQueries?: string[] } = {
                  searchInProgress: undefined,
                }
                if (Array.isArray(e.queries) && e.queries.length > 0) {
                  patch.searchQueries = e.queries
                }
                await updateLastMessageMeta(nodeId, patch)
              }
            }
          } catch {
            // malformed event line — ignore
          }
          return
        }
        if (!line.startsWith('0:')) return
        try {
          const text = JSON.parse(line.slice(2))
          if (typeof text !== 'string') return
          if (searchBarActive) {
            searchBarActive = false
            await updateLastMessageMeta(nodeId, { searchInProgress: undefined })
          }
          accumulated += text
          await updateLastMessage(nodeId, accumulated)
        } catch {
          // skip malformed line
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          await processLine(line)
        }
      }
      // Flush any trailing complete line buffered without newline
      if (lineBuffer) {
        await processLine(lineBuffer)
      }

      const state = useTreeStore.getState()
      const treeNodes = state.nodes.filter(n => n.treeId === state.currentTreeId)
      const rootNode = treeNodes.find(n => n.parentId === null)
      if (rootNode && rootNode.id === nodeId && rootNode.messages.length <= 2) {
        await updateTreeTitle(state.currentTreeId!, userMessage.slice(0, 60))
      }

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      const errorMsg = err instanceof Error ? err.message : 'Failed to get AI response'
      setError(errorMsg)
      await updateLastMessage(nodeId, `❌ Error: ${errorMsg}`)
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [addMessage, updateLastMessage, updateLastMessageMeta, appendLastMessageCitations, updateTreeTitle])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { sendMessage, isStreaming, error, abort }
}
