import { Hono } from 'hono'
import type { StreamRequest, ChatMessage, SearchCitation } from '@repo/types'
import { SYSTEM_PROMPTS, WEB_SEARCH_PROMPT_APPEND } from '../prompts'
import { streamChat, type OpenAIToolDefinition, type AccumulatedToolCall } from '../agent/core/llm'
import { searchBocha } from '../search/bocha'
import type { SearchResult } from '../search/types'

const chat = new Hono()

const MAX_TOOL_ROUNDS = 2
const RESULTS_PER_QUERY = 6

// Encode one line in Vercel AI data-stream protocol: "<code>:<json>\n"
// 0 = text delta, 2 = custom data array, 3 = error
function encodeLine(code: '0' | '2' | '3', payload: unknown): string {
  return `${code}:${JSON.stringify(payload)}\n`
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

// Parse a JSON-string tool_call argument and extract a `query` field.
// Falls back to `q` for forgiving parsing.
function parseQuery(argsJson: string): string {
  try {
    const parsed = JSON.parse(argsJson) as Record<string, unknown>
    if (typeof parsed.query === 'string' && parsed.query.trim()) return parsed.query.trim()
    if (typeof parsed.q === 'string' && parsed.q.trim()) return parsed.q.trim()
  } catch {
    // fall through
  }
  return ''
}

// Format search results as a tool message body fed back to the model.
// Compact-but-readable: title + site + date + URL + short body, numbered.
function formatToolResult(query: string, citations: SearchCitation[]): string {
  if (citations.length === 0) {
    return `搜索 "${query}" 未返回任何结果。可以告诉用户搜索未命中，请用户改换关键词。`
  }
  const lines: string[] = [`搜索结果（query: "${query}"）：`, '']
  for (const c of citations) {
    const dateStr = c.datePublished ? ` · ${c.datePublished.slice(0, 10)}` : ''
    lines.push(`[${c.n}] ${c.title} — ${c.siteName}${dateStr}`)
    lines.push(`URL: ${c.url}`)
    const body = (c.summary || c.snippet || '').slice(0, 600)
    if (body) lines.push(body)
    lines.push('')
  }
  return lines.join('\n')
}

function toCitations(results: SearchResult[], startN: number): SearchCitation[] {
  return results.map((r, i) => ({
    n: startN + i,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    summary: r.summary,
    siteName: r.siteName,
    favicon: r.favicon,
    datePublished: r.datePublished,
  }))
}

const WEB_SEARCH_TOOL: OpenAIToolDefinition = {
  type: 'function',
  function: {
    name: 'web_search',
    description:
      'Search the web for current information. Use for time-sensitive facts (news, prices, latest versions, recent events) or claims you are uncertain about. Do NOT use for conceptual or general-knowledge questions.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Search query. Short, keyword-focused, no full sentence. Include the year if time-sensitive (e.g. "Anthropic 估值 2026"). Use the same language as the user question.',
        },
      },
      required: ['query'],
    },
  },
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
  const tools = useWebSearch ? [WEB_SEARCH_TOOL] : undefined

  const messages = buildMessages(context, message, images)

  const abortController = new AbortController()
  c.req.raw.signal?.addEventListener('abort', () => abortController.abort())

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (code: '0' | '2' | '3', payload: unknown) => {
        try {
          controller.enqueue(encoder.encode(encodeLine(code, payload)))
        } catch {
          // controller already closed (client disconnect) — drop the chunk
        }
      }

      const collectedCitations: SearchCitation[] = []
      const collectedQueries: string[] = []
      let citationCounter = 0

      try {
        // Without web search: single-pass plain streaming
        if (!useWebSearch) {
          for await (const ev of streamChat({
            apiKey,
            baseURL,
            model: aiModel,
            messages,
            system: systemPrompt,
            extraBody: { thinking: { type: 'disabled' } },
            abortSignal: abortController.signal,
          })) {
            if (ev.type === 'text-delta') send('0', ev.text)
          }
          return
        }

        // With web search: agentic loop, max MAX_TOOL_ROUNDS rounds
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          if (abortController.signal.aborted) break

          let roundToolCalls: AccumulatedToolCall[] = []
          let roundTextBuf = ''

          for await (const ev of streamChat({
            apiKey,
            baseURL,
            model: aiModel,
            messages,
            tools,
            system: systemPrompt,
            extraBody: { thinking: { type: 'disabled' } },
            abortSignal: abortController.signal,
          })) {
            if (ev.type === 'text-delta') {
              roundTextBuf += ev.text
              send('0', ev.text)
            } else if (ev.type === 'tool-calls-done') {
              roundToolCalls = ev.calls
            }
          }

          if (roundToolCalls.length === 0) break

          // Feed the assistant turn with its tool_calls back into context
          messages.push({
            role: 'assistant',
            content: roundTextBuf || null,
            tool_calls: roundToolCalls,
          })

          // Execute each search call and feed back as a tool message
          for (const call of roundToolCalls) {
            if (call.function.name !== 'web_search') {
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: `未知工具 ${call.function.name}`,
              })
              continue
            }

            const query = parseQuery(call.function.arguments)
            if (!query) {
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: '工具参数缺少 query 字段',
              })
              continue
            }

            collectedQueries.push(query)
            send('2', [{ type: 'search-start', query }])

            try {
              const results = await searchBocha(query, {
                count: RESULTS_PER_QUERY,
                signal: abortController.signal,
              })
              const startN = citationCounter + 1
              const citations = toCitations(results, startN)
              citationCounter = startN + citations.length - 1
              collectedCitations.push(...citations)

              send('2', [{ type: 'search-results', citations }])

              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: formatToolResult(query, citations),
              })
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'search failed'
              console.error('[chat] web_search failed:', msg)
              messages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: `搜索调用失败：${msg}`,
              })
            }
          }
        }

        // Final summary event: full queries + citations list for client persistence
        send('2', [
          {
            type: 'search-done',
            queries: collectedQueries,
            citations: collectedCitations,
          },
        ])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // user/client cancelled — silent stop
        } else {
          const msg = err instanceof Error ? err.message : 'AI provider error'
          send('3', msg)
        }
      } finally {
        try { controller.close() } catch { /* already closed */ }
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
