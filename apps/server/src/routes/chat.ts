import { Hono } from 'hono'
import { streamText } from 'ai'
import type { StreamRequest } from '@repo/types'
import { SYSTEM_PROMPTS } from '../prompts'
import { createModelInstance } from '../providers'

const chat = new Hono()

chat.post('/', async (c) => {
  const body = await c.req.json<StreamRequest & { images?: string[] }>()
  const { message, context = [], provider, model, mode, images } = body

  const aiModelInstance = createModelInstance(provider, model)

  // Build messages array: context history + current user message
  const messages: Array<{ role: 'user' | 'assistant'; content: any }> = [
    ...context.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.images?.length
        ? [
            ...msg.images.map((img: string) => ({ type: 'image' as const, image: img })),
            { type: 'text' as const, text: msg.content },
          ]
        : msg.content,
    })),
  ]

  // Current user message — may include images
  if (images && images.length > 0) {
    messages.push({
      role: 'user',
      content: [
        ...images.map(img => ({ type: 'image' as const, image: img })),
        { type: 'text' as const, text: message },
      ],
    })
  } else {
    messages.push({ role: 'user', content: message })
  }

  // Wire abort signal
  const abortController = new AbortController()
  c.req.raw.signal?.addEventListener('abort', () => abortController.abort())

  try {
    const result = streamText({
      model: aiModelInstance,
      system: SYSTEM_PROMPTS[mode ?? 'thinking'],
      messages,
      abortSignal: abortController.signal,
      temperature: 0.6,
    })

    const response = result.toDataStreamResponse()
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
