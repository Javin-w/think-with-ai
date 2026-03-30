/**
 * Generic Agent ReAct Loop
 *
 * The core while-loop that powers all agent modules:
 *   while model returns tool_use → execute → emit SSE → continue
 *   when model returns text → emit complete → stop
 *
 * Supports feedback loop: tools can request data from the frontend
 * (e.g., DOM info, screenshots) by emitting request_feedback events
 * and waiting for the response via the pending feedback map.
 */

import { generateText } from 'ai'
import { createModelInstance } from '../../providers'
import type { AgentModuleConfig, AgentState, AgentEvent, AgentRunOptions, FeedbackRequester } from './types'

/**
 * Global map of pending feedback requests.
 * Key: requestId, Value: resolve function.
 * When frontend POSTs to /api/agent/feedback, we resolve the matching promise.
 */
export const pendingFeedback = new Map<string, (data: string) => void>()

export function runAgent<T>(
  config: AgentModuleConfig<T>,
  options: AgentRunOptions,
): ReadableStream {
  const { message, sessionId, provider, model, existingModuleState, existingMessages } = options
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
          )
        } catch {
          // Stream may be closed
        }
      }

      // Feedback requester: emit request → wait for frontend response
      const requestFeedback: FeedbackRequester = (feedbackType) => {
        const requestId = crypto.randomUUID()
        emit({ type: 'request_feedback', requestId, feedbackType })

        return new Promise<string>((resolve) => {
          // Timeout after 15 seconds
          const timeout = setTimeout(() => {
            pendingFeedback.delete(requestId)
            resolve('{"error": "Feedback timeout - frontend did not respond in 15s"}')
          }, 15000)

          pendingFeedback.set(requestId, (data: string) => {
            clearTimeout(timeout)
            pendingFeedback.delete(requestId)
            resolve(data)
          })
        })
      }

      // Initialize state
      const state: AgentState<T> = {
        sessionId,
        stepCount: 0,
        maxSteps: config.maxSteps,
        moduleState: config.createInitialState(existingModuleState as Partial<T> | undefined),
      }

      // Build messages
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []
      if (existingMessages && existingMessages.length > 0) {
        messages.push(...existingMessages)
      }
      messages.push({ role: 'user', content: message })

      const aiModelInstance = createModelInstance(
        provider ?? config.defaultProvider,
        model ?? config.defaultModel,
      )
      const tools = config.createTools(state, emit, requestFeedback)

      try {
        while (state.stepCount < config.maxSteps) {
          const result = await generateText({
            model: aiModelInstance,
            system: config.buildSystemPrompt(state),
            messages,
            tools: tools as any,
            maxSteps: 1,
            temperature: 0.6,
          })

          state.stepCount++

          const hasToolCalls = result.steps.some(
            (step) => step.toolCalls && step.toolCalls.length > 0,
          )

          if (!hasToolCalls) {
            emit({
              type: 'complete',
              text: result.text,
              ...getModuleCompleteData(state),
            })
            break
          }

          for (const msg of result.response.messages) {
            messages.push(msg as any)
          }

          if (state.stepCount >= config.maxSteps) {
            emit({
              type: 'complete',
              text: '已达到最大步骤数限制。当前结果已保存，你可以继续提出修改意见。',
              ...getModuleCompleteData(state),
            })
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Agent 执行出错'
        emit({ type: 'error', message: errorMessage })
      } finally {
        controller.close()
      }
    },
  })
}

function getModuleCompleteData<T>(state: AgentState<T>): Record<string, unknown> {
  if (typeof state.moduleState === 'object' && state.moduleState !== null) {
    return state.moduleState as Record<string, unknown>
  }
  return {}
}
