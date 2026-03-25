import { Hono } from 'hono'
import { streamText } from 'ai'
import type { StreamRequest } from '@repo/types'
import { SYSTEM_PROMPTS } from '../prompts'
import { createModelInstance } from '../providers'

const chat = new Hono()

chat.post('/', async (c) => {
  const body = await c.req.json<StreamRequest>()
  const { message, context = [], provider, model, mode } = body

  const aiModelInstance = createModelInstance(provider, model)

  // Build messages array: context history + current user message
  const messages = [
    ...context.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    })),
    { role: 'user' as const, content: message },
  ]

  // Wire abort signal
  const abortController = new AbortController()
  c.req.raw.signal?.addEventListener('abort', () => abortController.abort())

  try {
    const result = streamText({
      model: aiModelInstance,
      system: SYSTEM_PROMPTS[mode ?? 'thinking'],
      messages,
      abortSignal: abortController.signal,
    })

    // Return SSE stream response
    const response = result.toDataStreamResponse()
    // Add Content-Encoding: none to prevent proxy compression breaking the stream
    const headers = new Headers(response.headers)
    headers.set('Content-Encoding', 'none')
    headers.set('Access-Control-Allow-Origin', '*')
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('API key') || (error as any).status === 401)) {
      return c.json({ error: 'Invalid API key' }, 401)
    }
    return c.json({ error: error instanceof Error ? error.message : 'AI provider error' }, 500)
  }
})

export default chat
