/**
 * Generic Agent ReAct Loop (streaming)
 *
 * Uses direct HTTP streaming to Moonshot API for precise event timing control.
 * Tool execution happens AFTER the stream ends, giving us:
 *   text streaming → "正在生成代码..." → tool executes → preview → "✓ 完成"
 */

import { streamChat } from './llm'
import type { AgentModuleConfig, AgentState, AgentEvent, AgentRunOptions, FeedbackRequester, ToolSet } from './types'

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

      // Message history in OpenAI format
      const messages: Array<Record<string, unknown>> = []
      if (existingMessages && existingMessages.length > 0) {
        messages.push(...existingMessages)
      }
      messages.push({ role: 'user', content: message })

      const toolSet: ToolSet = config.createTools(state, emit, requestFeedback)

      // API config
      const apiKey = process.env.MOONSHOT_API_KEY ?? ''
      const baseURL = 'https://api.moonshot.cn/v1'
      const modelId = model ?? config.defaultModel

      try {
        while (state.stepCount < config.maxSteps) {
          const stepStart = Date.now()
          log('step', `--- step ${state.stepCount + 1}/${config.maxSteps} ---`)

          const elapsedSec = () => Math.round((Date.now() - startTime) / 1000)
          const stepLabel = state.stepCount === 0
            ? '正在分析需求...'
            : `正在构建第 ${state.stepCount + 1} 部分...`
          emit({ type: 'step', tool: 'thinking', summary: stepLabel, elapsed: elapsedSec() })

          // Stream from Moonshot API
          let fullText = ''
          let textStarted = false
          let toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> = []

          const stream = streamChat({
            apiKey,
            baseURL,
            model: modelId,
            messages,
            tools: toolSet.definitions,
            system: config.buildSystemPrompt(state),
            temperature: 0.6,
            maxTokens: 8000,
            extraBody: { thinking: { type: 'disabled' } },
          })

          for await (const event of stream) {
            switch (event.type) {
              case 'text-delta': {
                fullText += event.text
                if (!textStarted && event.text.trim()) {
                  textStarted = true
                  emit({ type: 'step', tool: 'agent-text-start', summary: '', elapsed: elapsedSec() })
                }
                if (textStarted) {
                  emit({ type: 'step', tool: 'agent-text-delta', summary: event.text, elapsed: elapsedSec() })
                }
                break
              }
              case 'tool-calls-start': {
                // PRECISE MOMENT: tool calls detected, BEFORE execution
                emit({
                  type: 'step',
                  tool: 'code-generating',
                  summary: `正在生成第 ${state.stepCount + 1} 部分代码...`,
                  elapsed: elapsedSec(),
                })
                break
              }
              case 'tool-calls-done': {
                toolCalls = event.calls
                break
              }
              case 'done': {
                // Add assistant message to conversation history
                messages.push({ ...event.message } as Record<string, unknown>)
                break
              }
            }
          }

          const genElapsed = ((Date.now() - stepStart) / 1000).toFixed(1)
          state.stepCount++
          const hasToolCalls = toolCalls.length > 0

          log('step', `stream done in ${genElapsed}s, hasToolCalls=${hasToolCalls}, textLen=${fullText.length}`)

          // Execute tool calls manually, AFTER the stream is complete
          if (hasToolCalls) {
            for (const tc of toolCalls) {
              const toolName = tc.function.name
              const executor = toolSet.executors[toolName]
              if (!executor) {
                log('ERROR', `Unknown tool: ${toolName}`)
                messages.push({ role: 'tool', tool_call_id: tc.id, content: `Error: unknown tool ${toolName}` })
                continue
              }

              let args: Record<string, unknown>
              try {
                args = JSON.parse(tc.function.arguments)
              } catch (parseErr) {
                const argsLen = tc.function.arguments?.length ?? 0
                const argsPreview = tc.function.arguments?.slice(-200) ?? ''
                log('ERROR', `Failed to parse tool args for ${toolName} (len=${argsLen}, tail="${argsPreview}")`)
                // Still push tool result to keep conversation history consistent
                messages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: `Error: failed to parse tool arguments`,
                })
                continue
              }

              log('tool', `executing ${toolName}...`)
              const result = await executor(args)

              // Emit tool-done (preview was already emitted by the executor)
              const summary = (args.changeSummary as string) || `调用 ${toolName}`
              emit({ type: 'step', tool: toolName, summary, elapsed: elapsedSec() })

              // Add tool result to conversation history
              messages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: result,
              })
            }
          }

          // No tool calls → agent is done
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
