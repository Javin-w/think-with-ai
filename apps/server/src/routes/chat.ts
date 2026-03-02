import { Hono } from 'hono'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { StreamRequest } from '@repo/types'

const chat = new Hono()

chat.post('/', async (c) => {
  const body = await c.req.json<StreamRequest>()
  const { message, context = [], provider, model } = body

  const aiProvider = provider ?? process.env.AI_PROVIDER ?? 'openai'
  const aiModel = model ?? process.env.AI_MODEL ?? 'gpt-4o-mini'

  // Build the AI model instance
  let aiModelInstance
  if (aiProvider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    aiModelInstance = anthropic(aiModel)
  } else {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    aiModelInstance = openai(aiModel)
  }

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
      system: '你是一个乐于助人的学习助手。用清晰、条理分明的方式解释概念。支持 Markdown 格式化输出。',
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
