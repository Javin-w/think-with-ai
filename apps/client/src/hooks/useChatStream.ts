import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ChatMode } from '@repo/types'

interface UseChatStreamOptions {
  mode: ChatMode
}

export function useChatStream({ mode }: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (
    messages: ChatMessage[],
    userMessage: string,
  ): Promise<string> => {
    setIsStreaming(true)
    setError(null)
    setStreamingContent('')

    // Build context from previous messages (exclude the latest user message if already appended)
    const context = messages.map(m => ({
      role: m.role,
      content: m.content,
    }))

    abortControllerRef.current = new AbortController()

    let accumulated = ''

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context, mode }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error ?? `HTTP ${response.status}`)
      }

      if (!response.body) throw new Error('No response body')

      // Parse Vercel AI SDK data stream protocol
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
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
          // Handle error events (prefix '3:')
          if (line.startsWith('3:')) {
            const errorMsg = JSON.parse(line.slice(2))
            throw new Error(typeof errorMsg === 'string' ? errorMsg : 'AI provider error')
          }
          if (!line.startsWith('0:')) continue // Only text delta events
          try {
            const jsonStr = line.slice(2)
            const text = JSON.parse(jsonStr)
            if (typeof text === 'string') {
              accumulated += text
              setStreamingContent(accumulated)
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
            setStreamingContent(accumulated)
          }
        } catch {
          // Skip malformed final line
        }
      }

      return accumulated
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return accumulated
      }
      const errorMsg = err instanceof Error ? err.message : 'Failed to get AI response'
      setError(errorMsg)
      throw err
    } finally {
      setIsStreaming(false)
      abortControllerRef.current = null
    }
  }, [mode])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { sendMessage, isStreaming, error, abort, streamingContent }
}
