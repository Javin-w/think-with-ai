import { Hono } from 'hono'
import type { StreamRequest, ChatMessage } from '@repo/types'
import { SYSTEM_PROMPTS, WEB_SEARCH_PROMPT_APPEND } from '../prompts'
import { streamChat } from '../agent/core/llm'

const chat = new Hono()

const MAX_TOOL_ROUNDS = 5

// Encode one line in Vercel AI data-stream protocol: "<code>:<json>\n"
function encodeLine(code: '0' | '2' | '3', payload: unknown): string {
  return `${code}:${JSON.stringify(payload)}\n`
}

// Try to read a human-readable query from a $web_search arguments JSON string
function tryParseQuery(argsJson: string): string {
  try {
    const parsed = JSON.parse(argsJson)
    if (typeof parsed?.query === 'string' && parsed.query) return parsed.query
    if (typeof parsed?.q === 'string' && parsed.q) return parsed.q
    // Fallback: stringify the object so user sees *something*
    return JSON.stringify(parsed).slice(0, 80)
  } catch {
    return '…'
  }
}

// Build OpenAI-format messages from the request (preserves images, etc.)
function buildMessages(
  context: ChatMessage[],
  currentMessage: string,
  images: string[] | undefined,
): Array<Record<string, unknown>> {
  const msgs: Array<Record<string, unknown>> = context.map(msg => {
    if (msg.images?.length) {
      return {
        role: msg.role,
        content: [
          ...msg.images.map(img => ({ type: 'image_url', image_url: { url: img } })),
          { type: 'text', text: msg.content },
        ],
      }
    }
    return { role: msg.role, content: msg.content }
  })

  if (images && images.length > 0) {
    msgs.push({
      role: 'user',
      content: [
        ...images.map(img => ({ type: 'image_url', image_url: { url: img } })),
        { type: 'text', text: currentMessage },
      ],
    })
  } else {
    msgs.push({ role: 'user', content: currentMessage })
  }

  return msgs
}

chat.post('/', async (c) => {
  const body = await c.req.json<StreamRequest & { images?: string[] }>()
  const { message, context = [], provider, model, mode, images, webSearch } = body

  const aiProvider = provider ?? process.env.AI_PROVIDER ?? 'moonshot'
  const aiModel = model ?? process.env.AI_MODEL ?? 'kimi-k2-turbo-preview'
  const apiKey = process.env.MOONSHOT_API_KEY
  const baseURL = 'https://api.moonshot.cn/v1'

  if (aiProvider !== 'moonshot') {
    return c.json({ error: `provider ${aiProvider} is not supported by this route yet` }, 400)
  }
  if (!apiKey) {
    return c.json({ error: 'MOONSHOT_API_KEY is not set' }, 500)
  }

  const useWebSearch = webSearch === true
  const systemPrompt = useWebSearch
    ? SYSTEM_PROMPTS[mode ?? 'thinking'] + WEB_SEARCH_PROMPT_APPEND
    : SYSTEM_PROMPTS[mode ?? 'thinking']

  const messages = buildMessages(context, message, images)

  const abortController = new AbortController()
  c.req.raw.signal?.addEventListener('abort', () => abortController.abort())

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (code: '0' | '2' | '3', payload: unknown) => {
        controller.enqueue(encoder.encode(encodeLine(code, payload)))
      }

      try {
        for await (const ev of streamChat({
          apiKey,
          baseURL,
          model: aiModel,
          messages,
          system: systemPrompt,
          extraBody: { thinking: { type: 'disabled' } },
          abortSignal: abortController.signal,
        })) {
          if (ev.type === 'text-delta') {
            send('0', ev.text)
          }
          // tool-calls not yet wired — Task 5 adds the loop
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI provider error'
        send('3', msg)
      } finally {
        controller.close()
      }
    },
    cancel() {
      abortController.abort()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Encoding': 'none',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

export default chat
