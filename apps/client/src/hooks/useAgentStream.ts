/**
 * useAgentStream — Hook for consuming Prototype Agent SSE events
 *
 * Parses the custom SSE format from POST /api/agent/run:
 *   event: step|clarify|preview|complete|error
 *   data: {...}
 */

import { useState, useCallback, useRef } from 'react'
import type {
  AgentEvent,
  AgentStep,
  PrototypePlan,
  AgentRunRequest,
} from '@repo/types'

export interface UseAgentStreamOptions {
  /** Called when agent requests feedback (DOM info, screenshot). Should return data string. */
  onFeedbackRequest?: (feedbackType: string) => Promise<string>
}

export interface UseAgentStreamReturn {
  runAgent: (request: AgentRunRequest) => Promise<void>
  isRunning: boolean
  currentStep: AgentStep | null
  plan: PrototypePlan | null
  currentHtml: string
  steps: AgentStep[]
  clarifyQuestions: string[]
  completionText: string
  error: string | null
  abort: () => void
}

export function useAgentStream(options?: UseAgentStreamOptions): UseAgentStreamReturn {
  const onFeedbackRequestRef = useRef(options?.onFeedbackRequest)
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState<AgentStep | null>(null)
  const [plan, setPlan] = useState<PrototypePlan | null>(null)
  const [currentHtml, setCurrentHtml] = useState('')
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [clarifyQuestions, setClarifyQuestions] = useState<string[]>([])
  const [completionText, setCompletionText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const runAgent = useCallback(async (request: AgentRunRequest) => {
    setIsRunning(true)
    setError(null)
    setSteps([])
    setCurrentStep(null)
    setClarifyQuestions([])
    setCompletionText('')

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

      // Parse SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Parse complete SSE events from buffer
        // SSE format: "event: <type>\ndata: <json>\n\n"
        const events = buffer.split('\n\n')
        // Last element might be incomplete
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
      switch (event.type) {
        case 'step': {
          const step: AgentStep = {
            id: crypto.randomUUID(),
            tool: event.tool,
            summary: event.summary,
            timestamp: Date.now(),
          }
          setCurrentStep(step)
          setSteps((prev) => [...prev, step])
          if (event.plan) setPlan(event.plan)
          if (event.html) setCurrentHtml(event.html)
          break
        }
        case 'preview':
          setCurrentHtml(event.html)
          break
        case 'clarify':
          setClarifyQuestions(event.questions)
          break
        case 'complete':
          setCompletionText(event.text)
          if (event.html) setCurrentHtml(event.html)
          break
        case 'error':
          setError(event.message)
          break
        case 'request_feedback': {
          // Agent wants DOM info or screenshot from the frontend
          const { requestId, feedbackType } = event as any
          if (onFeedbackRequestRef.current && requestId) {
            onFeedbackRequestRef.current(feedbackType).then((data) => {
              fetch('/api/agent/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, data }),
              }).catch(() => {
                // Ignore feedback delivery errors
              })
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
    currentStep,
    plan,
    currentHtml,
    steps,
    clarifyQuestions,
    completionText,
    error,
    abort,
  }
}
