/**
 * Lightweight streaming wrapper for OpenAI-compatible Chat Completions API.
 *
 * Yields precise events for text deltas, tool-call detection, and completion,
 * giving the caller full control over event timing.
 */

// ── Types ──

export interface AccumulatedToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export type StreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'tool-calls-start' }
  | { type: 'tool-calls-done'; calls: AccumulatedToolCall[] }
  | { type: 'done'; message: AssistantMessage }

export interface AssistantMessage {
  role: 'assistant'
  content: string | null
  tool_calls?: AccumulatedToolCall[]
}

export interface OpenAIToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface StreamChatOptions {
  apiKey: string
  baseURL: string
  model: string
  messages: Array<Record<string, unknown>>
  tools?: OpenAIToolDefinition[]
  system?: string
  temperature?: number
  maxTokens?: number
  extraBody?: Record<string, unknown>
  abortSignal?: AbortSignal
}

// ── Main function ──

export async function* streamChat(
  options: StreamChatOptions,
): AsyncGenerator<StreamEvent> {
  const { apiKey, baseURL, model, messages, tools, system, temperature, maxTokens, extraBody, abortSignal } = options

  const body: Record<string, unknown> = {
    model,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
    ],
    stream: true,
    temperature: temperature ?? 0.6,
    max_tokens: maxTokens ?? 8000,
    ...extraBody,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: abortSignal,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => `HTTP ${response.status}`)
    throw new Error(`Moonshot API error (${response.status}): ${errorText}`)
  }

  if (!response.body) {
    throw new Error('No response body')
  }

  // State for accumulating the response
  let contentAccum = ''
  const toolCallsAccum = new Map<number, { id: string; name: string; arguments: string }>()
  let toolCallsStartEmitted = false

  // Parse SSE stream
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // Keep incomplete last line in buffer

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith(':')) continue // Empty line or SSE comment

        if (trimmed === 'data: [DONE]') {
          // Stream complete — yield final events
          if (toolCallsAccum.size > 0) {
            const calls = buildToolCalls(toolCallsAccum)
            yield { type: 'tool-calls-done', calls }
          }

          const message: AssistantMessage = {
            role: 'assistant',
            content: contentAccum || null,
            ...(toolCallsAccum.size > 0
              ? { tool_calls: buildToolCalls(toolCallsAccum) }
              : {}),
          }
          yield { type: 'done', message }
          return
        }

        if (!trimmed.startsWith('data: ')) continue

        const jsonStr = trimmed.slice(6)
        let data: any
        try {
          data = JSON.parse(jsonStr)
        } catch {
          continue // Skip malformed JSON
        }

        const delta = data?.choices?.[0]?.delta
        if (!delta) continue

        // Text content delta
        if (delta.content && typeof delta.content === 'string') {
          contentAccum += delta.content
          yield { type: 'text-delta', text: delta.content }
        }

        // Tool calls delta
        if (Array.isArray(delta.tool_calls)) {
          if (!toolCallsStartEmitted) {
            toolCallsStartEmitted = true
            yield { type: 'tool-calls-start' }
          }

          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            const existing = toolCallsAccum.get(idx)

            if (existing) {
              // Append argument chunk
              if (tc.function?.arguments) {
                existing.arguments += tc.function.arguments
              }
            } else {
              // First chunk for this tool call
              toolCallsAccum.set(idx, {
                id: tc.id ?? '',
                name: tc.function?.name ?? '',
                arguments: tc.function?.arguments ?? '',
              })
            }
          }
        }
      }
    }

    // Handle case where stream ends without [DONE] (shouldn't happen but be safe)
    if (toolCallsAccum.size > 0 && !toolCallsStartEmitted) {
      yield { type: 'tool-calls-start' }
    }
    if (toolCallsAccum.size > 0) {
      yield { type: 'tool-calls-done', calls: buildToolCalls(toolCallsAccum) }
    }

    const message: AssistantMessage = {
      role: 'assistant',
      content: contentAccum || null,
      ...(toolCallsAccum.size > 0 ? { tool_calls: buildToolCalls(toolCallsAccum) } : {}),
    }
    yield { type: 'done', message }
  } finally {
    reader.releaseLock()
  }
}

// ── Helpers ──

function buildToolCalls(
  accum: Map<number, { id: string; name: string; arguments: string }>,
): AccumulatedToolCall[] {
  return Array.from(accum.entries())
    .sort(([a], [b]) => a - b)
    .map(([, tc]) => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: tc.arguments,
      },
    }))
}
