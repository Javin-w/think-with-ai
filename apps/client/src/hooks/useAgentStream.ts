/**
 * useAgentStream — Hook for consuming Prototype Agent SSE events
 */

import { useState, useCallback, useRef } from 'react'
import type { AgentEvent, AgentRunRequest } from '@repo/types'

export interface AgentActivity {
  id: string
  type: 'thinking' | 'tool-done' | 'text'
  content: string
  elapsed: number // seconds since agent start
}

export interface UseAgentStreamOptions {
  onFeedbackRequest?: (feedbackType: string) => Promise<string>
}

export interface UseAgentStreamReturn {
  runAgent: (request: AgentRunRequest) => Promise<void>
  isRunning: boolean
  currentHtml: string
  completionText: string
  activities: AgentActivity[]
  error: string | null
  abort: () => void
}

export function useAgentStream(options?: UseAgentStreamOptions): UseAgentStreamReturn {
  const onFeedbackRequestRef = useRef(options?.onFeedbackRequest)
  const [isRunning, setIsRunning] = useState(false)
  const [currentHtml, setCurrentHtml] = useState('')
  const [completionText, setCompletionText] = useState('')
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const startTimeRef = useRef(0)
  const textIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stepCountRef = useRef(0)

  const addActivity = (type: AgentActivity['type'], content: string, elapsed?: number) => {
    setActivities(prev => [...prev, {
      id: crypto.randomUUID(),
      type,
      content,
      elapsed: elapsed ?? Math.round((Date.now() - startTimeRef.current) / 1000),
    }])
  }

  const runAgent = useCallback(async (request: AgentRunRequest) => {
    setIsRunning(true)
    setError(null)
    setCompletionText('')
    setActivities([])
    startTimeRef.current = Date.now()
    stepCountRef.current = 0
    if (textIdleTimerRef.current) clearTimeout(textIdleTimerRef.current)

    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(errData.error ?? `HTTP ${response.status}`)
      }

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue
          const lines = eventBlock.split('\n')
          let eventData: string | null = null
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              eventData = line.slice(6)
            }
          }
          if (!eventData) continue
          try {
            const event: AgentEvent = JSON.parse(eventData)
            handleEvent(event)
          } catch {
            // Skip malformed events
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        let eventData: string | null = null
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            eventData = line.slice(6)
          }
        }
        if (eventData) {
          try {
            const event: AgentEvent = JSON.parse(eventData)
            handleEvent(event)
          } catch {
            // Skip
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Agent 执行出错')
    } finally {
      setIsRunning(false)
      abortControllerRef.current = null
    }

    function handleEvent(event: AgentEvent) {
      const elapsed = (event as any).elapsed as number | undefined

      switch (event.type) {
        case 'step': {
          const tool = (event as any).tool as string
          const summary = (event as any).summary as string

          if (tool === 'thinking') {
            addActivity('thinking', summary, elapsed)
          } else if (tool === 'agent-text-start') {
            // Start of streaming reasoning text — add empty text activity
            addActivity('text', '', elapsed)
          } else if (tool === 'agent-text-delta') {
            // Append to the last text activity
            setActivities(prev => {
              const last = prev[prev.length - 1]
              if (last && last.type === 'text') {
                return [...prev.slice(0, -1), { ...last, content: last.content + summary }]
              }
              return [...prev, { id: crypto.randomUUID(), type: 'text', content: summary, elapsed: elapsed ?? 0 }]
            })
            // Debounce: if text stops for 800ms, insert "generating code" hint
            if (textIdleTimerRef.current) clearTimeout(textIdleTimerRef.current)
            textIdleTimerRef.current = setTimeout(() => {
              stepCountRef.current++
              addActivity('thinking', `正在生成第 ${stepCountRef.current} 部分代码...`)
            }, 800)
            return
          } else if (tool === 'agent-text') {
            addActivity('text', summary, elapsed)
          } else if (tool === 'generate_html') {
            // Clear debounce timer — code generation done
            if (textIdleTimerRef.current) { clearTimeout(textIdleTimerRef.current); textIdleTimerRef.current = null }
            addActivity('tool-done', summary, elapsed)
          }

          if ((event as any).html) setCurrentHtml((event as any).html)
          break
        }
        case 'preview':
          // Clear debounce timer if code arrived
          if (textIdleTimerRef.current) { clearTimeout(textIdleTimerRef.current); textIdleTimerRef.current = null }
          setCurrentHtml(event.html)
          break
        case 'complete':
          setCompletionText(event.text)
          if (event.html) setCurrentHtml(event.html)
          break
        case 'error':
          setError(event.message)
          break
        case 'request_feedback': {
          const { requestId, feedbackType } = event as any
          if (onFeedbackRequestRef.current && requestId) {
            onFeedbackRequestRef.current(feedbackType).then((data: string) => {
              fetch('/api/agent/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, data }),
              }).catch(() => {})
            })
          }
          break
        }
      }
    }
  }, [])

  const abort = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return {
    runAgent,
    isRunning,
    currentHtml,
    completionText,
    activities,
    error,
    abort,
  }
}
