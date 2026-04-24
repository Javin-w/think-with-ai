# Kimi Web Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the thinking-mode conversation tree (`/api/chat`) the ability to call Kimi's `$web_search` builtin tool, controlled by a user-facing 🌐 toggle.

**Architecture:** Rewrite `apps/server/src/routes/chat.ts` to drop the Vercel AI SDK and go through the existing `agent/core/llm.ts::streamChat` — same pattern the prototype agent already uses. When `webSearch=true`, run a tool-calling loop that attaches `{type:"builtin_function", function:{name:"$web_search"}}` and re-feeds tool_call arguments back as `role:"tool"` messages (Moonshot's "trigger signal" protocol — the server executes the search, the client never hits a third-party search API). Keep the Vercel AI data-stream wire format (`0:` text, `2:` data, `3:` error) so the frontend parser barely changes.

**Tech Stack:** TypeScript, Hono, Moonshot OpenAI-compatible API, Zustand, React, lucide-react, Dexie.

**Source spec:** `docs/superpowers/specs/2026-04-24-kimi-websearch-design.md` (reference it for rationale; this plan is the executable cut).

**Baseline commits:**
- `7a7b82b` — checkpoint of pending UI work (revert target if this feature needs to be undone)
- `540d7c0` — initial design spec
- `d7f6e65` — spec corrections (UI target components)

---

## File Map

| File | Operation | Purpose |
|------|-----------|---------|
| `packages/types/src/index.ts` | Modify | Add `ChatMessageMeta`, extend `ChatMessage.meta`, extend `StreamRequest.webSearch` |
| `apps/server/src/agent/core/llm.ts` | Modify | Extend `OpenAIToolDefinition` to union with `builtin_function`; add `abortSignal` to `StreamChatOptions` and pass to fetch |
| `apps/server/src/prompts.ts` | Modify | Add `WEB_SEARCH_PROMPT_APPEND` constant |
| `apps/server/src/routes/chat.ts` | Rewrite | Replace `streamText` with `streamChat`; add tool-calling loop when `webSearch=true`; emit `0:` text / `2:` search events / `3:` errors |
| `apps/client/src/store/chatSettingsStore.ts` | Create | Global `{ webSearchEnabled, toggleWebSearch }` with localStorage persistence (default `true`) |
| `apps/client/src/store/treeStore.ts` | Modify | Add `updateLastMessageMeta(nodeId, patch)` action |
| `apps/client/src/hooks/useNodeStream.ts` | Modify | Include `webSearch` in fetch body; parse `2:` lines → call `updateLastMessageMeta` |
| `apps/client/src/components/Chat/MessageInput.tsx` | Modify | Add 🌐 button next to `Plus` in bottom-toolbar left group |
| `apps/client/src/components/KnowledgeTree/BranchConversationPanel.tsx` | Modify | In inline `AssistantMessage`, render status bar before `<article>` based on `message.meta` |

**Not touched:** `MessageBubble.tsx` (used by other modes, not thinking tree), `Homepage.tsx` (has its own `<input>`, default-on via store — no UI change), prototype agent code.

---

## Task 1: Extend shared types

**Files:**
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add `ChatMessageMeta` and extend `ChatMessage`/`StreamRequest`**

Edit `packages/types/src/index.ts`. Find the `ChatMessage` interface (around line 45) and replace it + the adjacent `StreamRequest` (around line 106):

```ts
/**
 * Per-message metadata (search state, future extensions)
 */
export interface ChatMessageMeta {
  searchInProgress?: string       // query string while a $web_search round is in flight
  searchQueries?: string[]        // all queries issued for this message (populated when done)
}

/**
 * Represents a single message in a conversation
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];  // base64 data URLs for user-uploaded images
  createdAt: number;
  meta?: ChatMessageMeta;
}
```

And in the same file locate `StreamRequest` (around line 106) and extend:

```ts
export interface StreamRequest {
  message: string;
  context: ChatMessage[];
  provider?: string;
  model?: string;
  mode?: ChatMode;
  webSearch?: boolean;  // when true, attach $web_search tool (Moonshot only)
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes (the new optional fields don't break existing consumers).

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add ChatMessageMeta and webSearch flag on StreamRequest"
```

---

## Task 2: Extend `streamChat` with builtin_function tool type + abortSignal

**Files:**
- Modify: `apps/server/src/agent/core/llm.ts`

- [ ] **Step 1: Replace `OpenAIToolDefinition` with a union**

In `apps/server/src/agent/core/llm.ts`, find lines 31–38 (the current `OpenAIToolDefinition` interface) and replace:

```ts
export type OpenAIToolDefinition =
  | {
      type: 'function'
      function: {
        name: string
        description: string
        parameters: Record<string, unknown>
      }
    }
  | {
      type: 'builtin_function'
      function: {
        name: string
      }
    }
```

- [ ] **Step 2: Add `abortSignal` to `StreamChatOptions`**

Still in `llm.ts`, find `StreamChatOptions` (around lines 40–50). Add an optional field:

```ts
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
```

- [ ] **Step 3: Thread `abortSignal` through the fetch**

In the same file, find the destructuring at the top of `streamChat` (around line 57) and the `fetch` call (around line 75). Update both:

```ts
const { apiKey, baseURL, model, messages, tools, system, temperature, maxTokens, extraBody, abortSignal } = options

// ... existing body construction ...

const response = await fetch(`${baseURL}/chat/completions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
  signal: abortSignal,
})
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: passes. The existing `apps/server/src/agent/modules/prototype/*` callers don't pass `abortSignal` or `builtin_function` tools — the fields are optional, so they stay valid.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/agent/core/llm.ts
git commit -m "feat(llm): support builtin_function tool type and AbortSignal"
```

---

## Task 3: Add web-search system prompt fragment

**Files:**
- Modify: `apps/server/src/prompts.ts`

- [ ] **Step 1: Append `WEB_SEARCH_PROMPT_APPEND` export**

Edit `apps/server/src/prompts.ts`. Add at the bottom of the file (after the existing `SYSTEM_PROMPTS` object):

```ts
/**
 * Appended to thinking-mode system prompt when web_search is enabled.
 * Guides the model on when to search and how to cite sources.
 */
export const WEB_SEARCH_PROMPT_APPEND = `

如果用户的问题涉及时效性信息、具体数据、最新事件、或你无法确定的事实，请调用 $web_search 工具搜索。搜索得到的网页请在回答中以 markdown 链接格式 [标题](URL) 标注来源。概念性、原理性、不随时间变化的问题不要搜索，直接回答即可。`
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/prompts.ts
git commit -m "feat(prompts): add web_search guidance appendix"
```

---

## Task 4: Rewrite `routes/chat.ts` with `streamChat` (no-websearch path first)

This task stands up the new pipeline end-to-end **without** tool-calling. That proves the wire format works before we add the tool loop on top.

**Files:**
- Rewrite: `apps/server/src/routes/chat.ts`

- [ ] **Step 1: Full rewrite (no-tools path only)**

Replace the entire contents of `apps/server/src/routes/chat.ts` with:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Verify no-websearch path with curl**

Make sure `.env` has `MOONSHOT_API_KEY`, then start the server in a separate shell:

```bash
pnpm --filter server dev
```

In another shell:

```bash
curl -N -X POST http://localhost:3066/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"用一句话说明光合作用","context":[],"webSearch":false}'
```

Expected: lines of the form `0:"…chunk…"\n` streaming in, ending with no error. (No `2:` lines because we haven't added the search events yet.)

If you see a `3:"<error>"` line instead, inspect the server log — most likely `MOONSHOT_API_KEY` missing or `kimi-k2-turbo-preview` model name invalid for your account (try `kimi-latest` or `moonshot-v1-8k` as a fallback via `AI_MODEL=`).

- [ ] **Step 4: Verify the frontend still works**

With both servers running (`pnpm dev`), open `http://localhost:5173`, create a new tree, send a message, and confirm streaming works as before. The `useNodeStream` parser reads `0:` and `3:` — both still emitted — so nothing should regress.

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/chat.ts
git commit -m "refactor(chat): switch /api/chat to direct Moonshot streamChat"
```

---

## Task 5: Add the `$web_search` tool-calling loop

**Files:**
- Modify: `apps/server/src/routes/chat.ts`

- [ ] **Step 1: Replace the `start(controller)` body with the loop**

In `apps/server/src/routes/chat.ts`, replace the existing `async start(controller)` function (from Task 4) with this version that loops on tool_calls:

```ts
async start(controller) {
  const send = (code: '0' | '2' | '3', payload: unknown) => {
    controller.enqueue(encoder.encode(encodeLine(code, payload)))
  }

  const tools = useWebSearch
    ? [{ type: 'builtin_function' as const, function: { name: '$web_search' } }]
    : undefined

  const collectedQueries: string[] = []

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      if (abortController.signal.aborted) break

      let roundToolCalls: import('../agent/core/llm').AccumulatedToolCall[] = []
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
          for (const call of ev.calls) {
            const query = tryParseQuery(call.function.arguments)
            collectedQueries.push(query)
            send('2', [{ type: 'search-start', query }])
          }
        }
      }

      if (roundToolCalls.length === 0) break

      // Feed back: assistant(with tool_calls) + one tool message per call.
      // Moonshot reads the tool message's `content` (the arguments JSON) as
      // the trigger signal to run the search server-side.
      messages.push({
        role: 'assistant',
        content: roundTextBuf || null,
        tool_calls: roundToolCalls,
      })
      for (const call of roundToolCalls) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          name: call.function.name,
          content: call.function.arguments,
        })
      }
    }

    // Tell the client to clear searchInProgress; keep the final query list
    send('2', [{ type: 'search-done', queries: collectedQueries }])
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      // user cancelled — just stop, no error line
    } else {
      const msg = err instanceof Error ? err.message : 'AI provider error'
      send('3', msg)
    }
  } finally {
    controller.close()
  }
},
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes. Note: `AccumulatedToolCall` is imported via `import('…').AccumulatedToolCall` inside the function — this avoids polluting top-level imports for a single use.

- [ ] **Step 3: Verify concept-question short-circuit (no search)**

Server running (`pnpm --filter server dev`). Run:

```bash
curl -N -X POST http://localhost:3066/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"用一句话说明光合作用","context":[],"webSearch":true}'
```

Expected: only `0:"…"\n` lines of streamed text, followed by one `2:[{"type":"search-done","queries":[]}]\n` line. No `search-start` — the model should decide not to search.

- [ ] **Step 4: Verify time-sensitive question triggers search**

```bash
curl -N -X POST http://localhost:3066/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"今天美国股市的表现如何","context":[],"webSearch":true}'
```

Expected: at least one `2:[{"type":"search-start","query":"…"}]\n` line, followed by `0:"…"\n` text deltas, ending with `2:[{"type":"search-done","queries":["…"]}]\n`. The response text should contain markdown links to news sites.

If the model ignores the tool, increase the prompt specificity or try `moonshot-v1-128k` (some model variants handle `$web_search` better than others).

- [ ] **Step 5: Verify abort works**

Start a long search:

```bash
curl -N -X POST http://localhost:3066/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"对比 OpenAI 和 Anthropic 2026 年所有旗舰模型的参数","context":[],"webSearch":true}' &
PID=$!
sleep 1
kill $PID
```

Expected: client terminates, server logs show the loop stopped (no unhandled rejection). Server stays up and handles the next request.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/routes/chat.ts
git commit -m "feat(chat): add kimi \$web_search tool-calling loop behind webSearch flag"
```

---

## Task 6: Create `chatSettingsStore`

**Files:**
- Create: `apps/client/src/store/chatSettingsStore.ts`

- [ ] **Step 1: Write the store**

Create `apps/client/src/store/chatSettingsStore.ts` with:

```ts
import { create } from 'zustand'

const STORAGE_KEY = 'chatSettings.webSearchEnabled'

function readInitial(): boolean {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === null) return true // default on
  return v === 'true'
}

interface ChatSettingsState {
  webSearchEnabled: boolean
  toggleWebSearch: () => void
}

export const useChatSettingsStore = create<ChatSettingsState>((set) => ({
  webSearchEnabled: readInitial(),
  toggleWebSearch: () =>
    set((s) => {
      const next = !s.webSearchEnabled
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // quota / privacy mode — state still toggles, just no persistence
      }
      return { webSearchEnabled: next }
    }),
}))
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/client/src/store/chatSettingsStore.ts
git commit -m "feat(store): add chatSettingsStore with webSearchEnabled toggle"
```

---

## Task 7: Add `updateLastMessageMeta` to `treeStore`

**Files:**
- Modify: `apps/client/src/store/treeStore.ts`

- [ ] **Step 1: Import `ChatMessageMeta` type**

Edit `apps/client/src/store/treeStore.ts`. Update line 2's import:

```ts
import type { Tree, TreeNode, ChatMessage, Annotation, ChatMessageMeta } from '@repo/types'
```

- [ ] **Step 2: Add action to the interface**

In the `TreeStore` interface (starts at line 5), add the new action next to `updateLastMessage`:

```ts
  updateLastMessage: (nodeId: string, content: string) => Promise<void>
  updateLastMessageMeta: (nodeId: string, patch: Partial<ChatMessageMeta>) => Promise<void>
```

- [ ] **Step 3: Implement the action**

After the existing `updateLastMessage` implementation (ends around line 133), add:

```ts
  updateLastMessageMeta: async (nodeId: string, patch: Partial<ChatMessageMeta>) => {
    const { nodes } = get()
    const node = nodes.find(n => n.id === nodeId)
    if (!node || node.messages.length === 0) return
    const lastIdx = node.messages.length - 1
    const existingMeta = node.messages[lastIdx].meta ?? {}
    const mergedMeta: ChatMessageMeta = { ...existingMeta, ...patch }
    // Drop explicit undefined so Dexie stores a cleaner object
    if (mergedMeta.searchInProgress === undefined) delete mergedMeta.searchInProgress
    if (mergedMeta.searchQueries === undefined) delete mergedMeta.searchQueries

    const updatedMessages = node.messages.map((m, i) =>
      i === lastIdx ? { ...m, meta: mergedMeta } : m
    )
    await db.nodes.update(nodeId, { messages: updatedMessages })
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, messages: updatedMessages } : n
      ),
    }))
  },
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add apps/client/src/store/treeStore.ts
git commit -m "feat(treeStore): add updateLastMessageMeta action"
```

---

## Task 8: Wire `useNodeStream` to send `webSearch` and parse `2:` events

**Files:**
- Modify: `apps/client/src/hooks/useNodeStream.ts`

- [ ] **Step 1: Import the new store**

Edit `apps/client/src/hooks/useNodeStream.ts`. Add to the imports at the top:

```ts
import { useChatSettingsStore } from '../store/chatSettingsStore'
```

- [ ] **Step 2: Destructure the new action from `useTreeStore`**

Around line 10, update:

```ts
const { addMessage, updateLastMessage, updateLastMessageMeta, updateTreeTitle } = useTreeStore()
```

- [ ] **Step 3: Send `webSearch` flag in the fetch body**

Around line 48–53, update the fetch call:

```ts
const webSearch = useChatSettingsStore.getState().webSearchEnabled
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, context, images, webSearch }),
  signal: abortControllerRef.current.signal,
})
```

- [ ] **Step 4: Parse `2:` lines alongside the existing `0:`/`3:` branches**

Inside the `for (const line of lines) { ... }` loop (around lines 79–96), add a new branch **before** the `if (!line.startsWith('0:')) continue` guard:

```ts
for (const line of lines) {
  // Handle error events from Vercel AI SDK data stream protocol (prefix '3:')
  if (line.startsWith('3:')) {
    const errorMsg = JSON.parse(line.slice(2))
    throw new Error(typeof errorMsg === 'string' ? errorMsg : 'AI provider error')
  }
  // Custom data events (prefix '2:') — search state updates
  if (line.startsWith('2:')) {
    try {
      const events = JSON.parse(line.slice(2))
      if (Array.isArray(events)) {
        for (const e of events) {
          if (e?.type === 'search-start' && typeof e.query === 'string') {
            await updateLastMessageMeta(nodeId, { searchInProgress: e.query })
          } else if (e?.type === 'search-done' && Array.isArray(e.queries)) {
            await updateLastMessageMeta(nodeId, {
              searchInProgress: undefined,
              searchQueries: e.queries.length > 0 ? e.queries : undefined,
            })
          }
        }
      }
    } catch {
      // malformed data line — ignore
    }
    continue
  }
  if (!line.startsWith('0:')) continue  // Only text delta events
  try {
    const jsonStr = line.slice(2)
    const text = JSON.parse(jsonStr)
    if (typeof text === 'string') {
      accumulated += text
      await updateLastMessage(nodeId, accumulated)
    }
  } catch {
    // Skip malformed lines
  }
}
```

- [ ] **Step 5: Update the `useCallback` dependency array**

At the bottom of `sendMessage`'s `useCallback` (around line 130), add `updateLastMessageMeta`:

```ts
}, [addMessage, updateLastMessage, updateLastMessageMeta, updateTreeTitle])
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add apps/client/src/hooks/useNodeStream.ts
git commit -m "feat(useNodeStream): send webSearch flag and parse search events"
```

---

## Task 9: Add 🌐 button to `MessageInput`

**Files:**
- Modify: `apps/client/src/components/Chat/MessageInput.tsx`

- [ ] **Step 1: Import `Globe` icon and the settings store**

Edit `apps/client/src/components/Chat/MessageInput.tsx`. Update the icon import on line 2 and add the store import:

```ts
import { useState, useRef, useCallback } from 'react'
import { Plus, ArrowRight, X, Globe } from 'lucide-react'
import { useChatSettingsStore } from '../../store/chatSettingsStore'
```

- [ ] **Step 2: Read the store inside the component**

Inside `MessageInput(...)`, just below the `useState`/`useRef` lines (around line 23), add:

```ts
const webSearchEnabled = useChatSettingsStore(s => s.webSearchEnabled)
const toggleWebSearch = useChatSettingsStore(s => s.toggleWebSearch)
```

- [ ] **Step 3: Add the 🌐 button next to `Plus`**

In the bottom toolbar's left button group (the `<div className="flex items-center gap-0.5">` around lines 119–127), **right after the Plus button**, insert:

```tsx
<button
  type="button"
  onClick={toggleWebSearch}
  className={`flex items-center gap-1 h-8 px-2 rounded-full text-xs transition-colors ${
    webSearchEnabled
      ? 'bg-brand/15 text-brand border border-brand/30'
      : 'text-text-secondary/50 hover:text-text-secondary/80 border border-transparent'
  }`}
  title={webSearchEnabled ? '已开启联网搜索（点击关闭）' : '已关闭联网搜索（点击开启）'}
>
  <Globe size={14} strokeWidth={1.8} />
  <span>联网</span>
</button>
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 5: Visual check in browser**

Run `pnpm dev`. Open `http://localhost:5173`, navigate into any tree node. Observe:
- The 🌐 button renders right of the Plus icon in the bottom toolbar.
- Default state: highlighted in brand color (localStorage default is `true`).
- Click once: goes to muted gray; reload page → stays muted.
- Click again: highlighted again; reload page → stays highlighted.

- [ ] **Step 6: Commit**

```bash
git add apps/client/src/components/Chat/MessageInput.tsx
git commit -m "feat(ui): add web-search toggle button to MessageInput"
```

---

## Task 10: Add search status bar to `AssistantMessage` in `BranchConversationPanel`

**Files:**
- Modify: `apps/client/src/components/KnowledgeTree/BranchConversationPanel.tsx`

- [ ] **Step 1: Insert the status bar in `AssistantMessage`**

Edit `apps/client/src/components/KnowledgeTree/BranchConversationPanel.tsx`. Find the `AssistantMessage` return block (starts at line 133 with `<div className="mb-6">`). Insert the status bar **before** the `<article ...>`:

```tsx
  return (
    <div className="mb-6">
      {message.meta?.searchInProgress && (
        <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
          <span className="animate-pulse">🔍</span>
          <span>搜索：{message.meta.searchInProgress}</span>
        </div>
      )}
      {!message.meta?.searchInProgress && (message.meta?.searchQueries?.length ?? 0) > 0 && (
        <div className="text-xs text-text-secondary/70 mb-2">
          🔍 已搜索 {message.meta!.searchQueries!.length} 次：
          <span className="opacity-80"> {message.meta!.searchQueries!.join(' · ')}</span>
        </div>
      )}

      <article
        data-testid="assistant-message"
        data-message-id={message.id}
        className="prose prose-invert max-w-none prose-headings:font-semibold prose-p:leading-7 prose-p:text-text-primary prose-li:leading-7 prose-strong:text-text-primary prose-a:text-brand prose-code:text-brand"
      >
        {/* existing ReactMarkdown unchanged */}
```

(Leave everything from `<ReactMarkdown ...>` through `</article>` and the trailing `<BranchSummaryCard .../>` unchanged.)

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: passes. `message.meta` is optional so all guards are required.

- [ ] **Step 3: Visual check: no-op for old messages**

In `pnpm dev`, open an existing tree with pre-feature assistant messages. No status bar should render (legacy messages have `meta === undefined`).

- [ ] **Step 4: Commit**

```bash
git add apps/client/src/components/KnowledgeTree/BranchConversationPanel.tsx
git commit -m "feat(ui): render search status bar on AssistantMessage"
```

---

## Task 11: End-to-end validation

**Files:**
- (none modified — validation only)

- [ ] **Step 1: Typecheck entire workspace**

Run: `pnpm typecheck`
Expected: no errors across `types`, `client`, `server`.

- [ ] **Step 2: Build succeeds**

Run: `pnpm build`
Expected: `apps/client/dist/` is produced without errors. (Server uses `tsx` at runtime, no build step.)

- [ ] **Step 3: Manual dev server run**

In one shell: `pnpm dev`. Open `http://localhost:5173`.

- [ ] **Step 4: Boss-agent acceptance (mandatory per project CLAUDE.md)**

Dispatch the `boss` agent:

- `goal`: "Kimi `$web_search` 能力已接入对话树 thinking 模式：MessageInput 有 🌐 开关（默认开，localStorage 持久化），开启时发请求带 `webSearch:true`，模型自决是否搜；触发搜索时消息气泡顶部出现 '🔍 搜索：<query>'，完成后折叠为灰色小字 '🔍 已搜索 N 次：...'；Homepage 不加图标，默认随 store 值。"
- `scenarios`:
  1. `open` 一个新树，发送概念性问题（如"光合作用的原理"），确认没有搜索状态条出现，回答正常。
  2. 同一树发送时效性问题（如"今天的天气预报"或"最近 OpenAI 发布了什么"），应出现 `🔍 搜索：...` 状态条，回答完成后折叠为灰色 `🔍 已搜索 N 次：...`，回答正文里有 markdown 链接。
  3. 点 🌐 按钮关闭，再发时效性问题，确认无任何搜索状态条出现（纯文本流）。
  4. 刷新页面，🌐 按钮状态保持（关闭态 localStorage 持久化）。
  5. Homepage 输入框无 🌐 图标；在 Homepage 发一条时效性问题，进入树后能看到搜索状态条（默认开关是开的）。
- `baseUrl`: `http://localhost:5173`

If boss reports ❌, fix issues and rerun until ✅.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add <any fixup files>
git commit -m "fix(websearch): <specific fix from boss feedback>"
```

(Skip if no fixes.)

- [ ] **Step 6: Mark the feature done**

No user-facing doc changes required — `CLAUDE.md` doesn't describe per-feature behavior. The spec + plan files in `docs/superpowers/` are the canonical record.

---

## Rollback procedure

If this feature needs to be reverted cleanly:

```bash
git revert <commit range from Task 1 .. Task 11> --no-commit
git commit -m "revert: back out kimi web_search integration"
```

Or, to roll back to the pre-work checkpoint:

```bash
git reset --hard 7a7b82b   # destructive — confirms first
```

The checkpoint commit `7a7b82b` is the clean baseline.
