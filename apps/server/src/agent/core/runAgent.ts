/**
 * Generic Agent ReAct Loop (streaming)
 *
 * Uses streamText for real-time status feedback.
 * Partial HTML preview when toolCallStreaming is supported.
 */

import { streamText } from 'ai'
import { createModelInstance } from '../../providers'
import type { AgentModuleConfig, AgentState, AgentEvent, AgentRunOptions, FeedbackRequester } from './types'

export const pendingFeedback = new Map<string, (data: string) => void>()

function log(tag: string, ...args: unknown[]) {
  const ts = new Date().toISOString().slice(11, 23)
  console.log(`[${ts}] [agent:${tag}]`, ...args)
}

export function runAgent<T>(
  config: AgentModuleConfig<T>,
  options: AgentRunOptions,
): ReadableStream {
  const { message, sessionId, provider, model, existingModuleState, existingMessages } = options
  const encoder = new TextEncoder()

  log('init', `module=${config.name} provider=${provider ?? config.defaultProvider} model=${model ?? config.defaultModel}`)

  return new ReadableStream({
    async start(controller) {
      const startTime = Date.now()

      const emit = (event: AgentEvent) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
        log('emit', `+${elapsed}s type=${event.type}${(event as any).tool ? ` tool=${(event as any).tool}` : ''}`)
        try {
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
          )
        } catch {
          // Stream may be closed
        }
      }

      const requestFeedback: FeedbackRequester = (feedbackType) => {
        const requestId = crypto.randomUUID()
        emit({ type: 'request_feedback', requestId, feedbackType })
        return new Promise<string>((resolve) => {
          const timeout = setTimeout(() => {
            pendingFeedback.delete(requestId)
            resolve('{"error": "Feedback timeout"}')
          }, 15000)
          pendingFeedback.set(requestId, (data: string) => {
            clearTimeout(timeout)
            pendingFeedback.delete(requestId)
            resolve(data)
          })
        })
      }

      const state: AgentState<T> = {
        sessionId,
        stepCount: 0,
        maxSteps: config.maxSteps,
        moduleState: config.createInitialState(existingModuleState as Partial<T> | undefined),
      }

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
          const stepStart = Date.now()
          log('step', `--- step ${state.stepCount + 1}/${config.maxSteps} ---`)

          const elapsedSec = () => Math.round((Date.now() - startTime) / 1000)
          const stepLabel = state.stepCount === 0
            ? '正在分析需求...'
            : `正在构建第 ${state.stepCount + 1} 部分...`
          emit({ type: 'step', tool: 'thinking', summary: stepLabel, elapsed: elapsedSec() })

          const result = streamText({
            model: aiModelInstance,
            system: config.buildSystemPrompt(state),
            messages,
            tools: tools as any,
            maxSteps: 1,
            temperature: 0.6,
            maxTokens: 8000,
          })

          // Stream text portion in real-time (agent reasoning)
          let fullText = ''
          let textStarted = false
          for await (const chunk of result.textStream) {
            fullText += chunk
            // Emit streaming text as it arrives
            if (!textStarted && chunk.trim()) {
              textStarted = true
              emit({ type: 'step', tool: 'agent-text-start', summary: '', elapsed: elapsedSec() })
            }
            if (textStarted) {
              emit({ type: 'step', tool: 'agent-text-delta', summary: chunk, elapsed: elapsedSec() })
            }
          }

          // Wait for tool calls to finish (frontend shows "正在生成代码..." via debounce)
          const finalResult = await result.response
          const genElapsed = ((Date.now() - stepStart) / 1000).toFixed(1)
          state.stepCount++

          const hasToolCalls = finalResult.messages.some(
            (msg: any) => msg.role === 'assistant' && msg.content?.some?.((c: any) => c.type === 'tool-call'),
          )

          log('step', `streamText done in ${genElapsed}s, hasToolCalls=${hasToolCalls}, textLen=${fullText.length}`)

          // Emit tool-done events (tool's preview emit already happened during execution)
          for (const msg of finalResult.messages) {
            const content = (msg as any).content
            if (Array.isArray(content)) {
              for (const part of content) {
                if (part.type === 'tool-call') {
                  const args = part.args as Record<string, unknown>
                  const summary = (args?.changeSummary as string) || `调用 ${part.toolName}`
                  emit({ type: 'step', tool: part.toolName, summary, elapsed: elapsedSec() })
                }
              }
            }
          }

          // Add response messages for next iteration
          for (const msg of finalResult.messages) {
            messages.push(msg as any)
          }

          if (!hasToolCalls) {
            emit({
              type: 'complete',
              text: fullText,
              elapsed: elapsedSec(),
              ...getModuleCompleteData(state),
            })
            break
          }

          if (state.stepCount >= config.maxSteps) {
            emit({
              type: 'complete',
              text: '已达到最大步骤数限制。',
              ...getModuleCompleteData(state),
            })
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Agent 执行出错'
        log('ERROR', `${errorMessage}\n${error instanceof Error ? error.stack : ''}`)
        emit({ type: 'error', message: errorMessage })
      } finally {
        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
        log('done', `total time: ${totalTime}s, steps: ${state.stepCount}`)
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
