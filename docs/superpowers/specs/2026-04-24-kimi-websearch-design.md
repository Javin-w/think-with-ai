# Kimi Web Search 接入设计

**日期**：2026-04-24
**作用域**：thinking 模式（对话树 `/api/chat`）
**provider**：Moonshot (Kimi) 的 builtin `$web_search` 工具
**checkpoint commit**：`7a7b82b`（回退 pre-work 基线）

## 1. 目标与范围

给对话树的 thinking 模式加上"让 Kimi 可以联网搜索"的能力。用户可在输入框切换开关，**开启**等同于把 `$web_search` 作为 tool 附加给模型——是否触发搜索由模型自行判断。

**范围内**：

- `/api/chat` 路由重写以支持 Moonshot tool-calling loop
- 前端树内对话输入框加 🌐 开关按钮
- 消息气泡展示"搜索中/已搜索"状态条
- 全局 `webSearchEnabled` store + localStorage 持久化

**范围外**：

- prototype / agent 模块不接入（代码不动）
- 第三方搜索 API（Tavily / Serper 等）不引入
- 搜索结果 URL 列表面板（Moonshot 不返回搜索结果给客户端，做不到）
- 每条消息独立开关
- Homepage 输入框不加 🌐 图标（空间小），但默认走 store 值（默认 `true`）

## 2. 关键事实：Moonshot `$web_search` 的工作流

这是决定实现方式的底层约束，先讲清楚。

1. 客户端第一次请求时，`tools` 里传 `{type: "builtin_function", function: {name: "$web_search"}}`（**不带** `description` / `parameters`，这是 Moonshot 特殊类型）。
2. 模型判断需要联网，流式输出 `tool_calls($web_search, arguments=<JSON>)`。`arguments.query` 是查询词。
3. 客户端**不执行搜索**，而是把 `arguments` 字符串原样作为 `role: "tool"` 消息回填：
   ```json
   {"role": "tool", "tool_call_id": "<id>", "name": "$web_search", "content": "<arguments 原串>"}
   ```
4. 客户端发第二次请求（messages 带上 assistant 的 tool_calls + 上面的 tool 消息）。
5. Moonshot 服务端识别这个"触发信号"后**自己执行搜索**，把搜索结果作为隐藏上下文注入，再让模型继续生成。
6. 第二次响应里模型可能直接给出最终回答，也可能再次 tool_calls 进行多轮搜索；重复 3~5 直到无 tool_calls。

**客户端能拿到的透明度信号只有：查询词（arguments.query）+ 搜索次数**。搜索结果 URL / 摘要拿不到，引用靠 prompt 引导模型写进正文。

## 3. 架构与调用链

```
前端
┌────────────────────────────────────────────────────────────┐
│ BranchConversationPanel / MessageInput                      │
│   └─ 🌐 按钮 → useChatSettingsStore.toggleWebSearch()       │
│                      ↓                                      │
│           localStorage: "webSearchEnabled"=true             │
│                                                             │
│ Homepage                                                    │
│   └─ 直接读 store（不暴露控件，默认 true）                  │
└───────────────────────┬────────────────────────────────────┘
                        │ POST /api/chat
                        │ { message, context, webSearch: bool }
                        ▼
后端 apps/server/src/routes/chat.ts  (重写)
┌────────────────────────────────────────────────────────────┐
│ 从 body 读 webSearch                                         │
│   ├─ webSearch=false → streamChat({...})  (无 tools)        │
│   └─ webSearch=true  → tool-calling loop                    │
│                                                             │
│ tool-calling loop (MAX_ROUNDS=5)                           │
│   for round in 0..MAX:                                     │
│     stream = streamChat({messages, tools:[$web_search]})   │
│     for event of stream:                                   │
│       text-delta  → SSE "0:<text>"                         │
│       tool-calls-done → 收集 calls；SSE "2:[search-start]" │
│     if no tool_calls: break                                │
│     messages.push(assistant with tool_calls)               │
│     for each call:                                         │
│       messages.push(role:tool, content=arguments)          │
│   SSE "2:[search-done, queries]"                           │
└───────────────────────┬────────────────────────────────────┘
                        │ Vercel AI SDK data stream protocol
                        ▼
前端 hooks/useNodeStream.ts
┌────────────────────────────────────────────────────────────┐
│  解析按行读                                                 │
│   "0:..."  → 累积 assistant content                        │
│   "2:[...]" → updateLastMessageMeta(nodeId, {...})         │
│   "3:..."  → 错误                                          │
│                                                             │
│  meta 结构:                                                 │
│    searchInProgress?: string  (当前搜索中的 query)          │
│    searchQueries?:    string[] (已完成的所有 queries)       │
└───────────────────────┬────────────────────────────────────┘
                        ▼
MessageBubble 渲染
  顶部状态条:
    - searchInProgress → "🔍 搜索：<query>" (带 loading 动画)
    - searchQueries 非空 → "🔍 已搜索 N 次：q1 · q2" (灰色小字)
  正文: 流式 markdown (引用链接在正文中由模型生成)
```

## 4. 数据模型扩展

### 4.1 `packages/types/src/index.ts`

```ts
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  createdAt: number
  meta?: ChatMessageMeta           // ← 新增
}

export interface ChatMessageMeta {   // ← 新增
  searchInProgress?: string
  searchQueries?: string[]
}

export interface StreamRequest {
  message: string
  context: ChatMessage[]
  provider?: string
  model?: string
  mode?: ChatMode
  webSearch?: boolean              // ← 新增
}
```

**Dexie 迁移**：`meta` 是 optional 字段，IndexedDB 不需要 schema version bump。旧消息读出来 `meta` 为 `undefined`，UI 不渲染状态条，与现有行为一致。

### 4.2 `apps/server/src/agent/core/llm.ts` — 扩展 tool 类型 & abort

**tool 类型**：当前 `OpenAIToolDefinition` 只支持 `type: 'function'`。扩展为 union：

```ts
export type OpenAIToolDefinition =
  | {
      type: 'function'
      function: { name: string; description: string; parameters: Record<string, unknown> }
    }
  | {
      type: 'builtin_function'
      function: { name: string }
    }
```

`streamChat` 的 `body.tools = tools` 行不用改（直接透传）。

**abort signal**：`StreamChatOptions` 目前没有 `abortSignal` 字段，fetch 调用也没传 signal。需要小扩展：

```ts
export interface StreamChatOptions {
  // ...existing
  abortSignal?: AbortSignal
}

// 在 fetch 里：
const response = await fetch(`${baseURL}/chat/completions`, {
  method: 'POST',
  headers: {...},
  body: JSON.stringify(body),
  signal: abortSignal,   // ← 新增
})
```

这个改动对 `agent` 模块兼容（字段可选，老调用不传照旧）。

## 5. 后端实现（`apps/server/src/routes/chat.ts` 完全重写）

### 5.1 核心逻辑（伪代码）

```ts
const MAX_TOOL_ROUNDS = 5
const { message, context, webSearch, mode } = body

const aiProvider = process.env.AI_PROVIDER ?? 'moonshot'
const aiModel = process.env.AI_MODEL ?? 'kimi-k2-turbo-preview'

// 仅 Moonshot 支持 builtin $web_search；其他 provider 忽略 webSearch 开关
const useWebSearch = webSearch === true && aiProvider === 'moonshot'

const messages = buildMessages(context, message, images)  // 和现在一致
const tools = useWebSearch
  ? [{ type: 'builtin_function', function: { name: '$web_search' } } as const]
  : undefined

const systemPrompt = useWebSearch
  ? SYSTEM_PROMPTS.thinking + WEB_SEARCH_PROMPT_APPEND
  : SYSTEM_PROMPTS[mode ?? 'thinking']

// 返回 ReadableStream，编码为 Vercel AI data stream protocol
return new Response(buildStream(async (send) => {
  const collectedQueries: string[] = []

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    if (abortSignal.aborted) break

    let roundToolCalls: AccumulatedToolCall[] = []
    let roundTextBuf = ''

    for await (const ev of streamChat({
      apiKey: process.env.MOONSHOT_API_KEY!,
      baseURL: 'https://api.moonshot.cn/v1',
      model: aiModel,
      messages,
      tools,
      system: systemPrompt,
      extraBody: { thinking: { type: 'disabled' } },
    })) {
      if (ev.type === 'text-delta') {
        roundTextBuf += ev.text
        send('0', JSON.stringify(ev.text))
      }
      if (ev.type === 'tool-calls-done') {
        roundToolCalls = ev.calls
        for (const call of ev.calls) {
          const query = tryParseQuery(call.function.arguments)
          send('2', JSON.stringify([{ type: 'search-start', query }]))
          collectedQueries.push(query)
        }
      }
    }

    if (roundToolCalls.length === 0) break  // 无 tool_call，结束

    // 把 assistant (tool_calls) + 每个 tool result 追加到 messages
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
        content: call.function.arguments,   // 原样回填触发信号
      })
    }
  }

  // 结束信号：告诉前端把 searchInProgress 清空
  send('2', JSON.stringify([{ type: 'search-done', queries: collectedQueries }]))
}), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
```

### 5.2 SSE 事件格式（Vercel AI data stream protocol 子集）

沿用前端 `useNodeStream.ts` 已有的解析器约定：

| 行前缀 | 含义 | payload（JSON.stringify 后） |
|--------|------|------------------------------|
| `0:` | 文本 delta | `string` |
| `2:` | 自定义 data（数组） | `[{type, ...}]` |
| `3:` | 错误 | `string` (错误消息) |

本次只新增 `2:` 的两种事件：
- `{ type: 'search-start', query: string }`
- `{ type: 'search-done', queries: string[] }`

### 5.3 非 Moonshot provider 的兼容

`useWebSearch = webSearch && provider === 'moonshot'`。如果用户切到 OpenAI/Anthropic，即使开关是 true 也不附 tools（`$web_search` 是 Moonshot 专属）。当前项目环境只配了 Moonshot，但保留这个判断让 provider 切换不崩。

### 5.4 System Prompt 扩展（`apps/server/src/prompts.ts`）

```ts
export const WEB_SEARCH_PROMPT_APPEND = `

若用户的问题涉及时效性信息、具体数据、最新事件、或你无法确定的事实，请调用 $web_search 工具搜索。搜索得到的网页请在回答中以 markdown 链接格式 \`[标题](URL)\` 标注来源。概念性、原理性、不随时间变化的问题不要搜索，直接回答即可。`
```

## 6. 前端改动

### 6.1 新建 `apps/client/src/store/chatSettingsStore.ts`

保持和项目其他 store（原生 zustand 无 middleware）一致的风格——手动 localStorage 读写：

```ts
import { create } from 'zustand'

const STORAGE_KEY = 'chatSettings.webSearchEnabled'

function readInitial(): boolean {
  if (typeof localStorage === 'undefined') return true
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === null) return true   // 默认开
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
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
      return { webSearchEnabled: next }
    }),
}))
```

> 不引入 `zustand/middleware` 的 `persist`：项目现有 store 都未使用它，保持一致；手写 localStorage 只有几行。

### 6.2 `hooks/useNodeStream.ts` 改动

- fetch body 追加 `webSearch: useChatSettingsStore.getState().webSearchEnabled`
- 解析新增 `2:` 分支：
  ```ts
  if (line.startsWith('2:')) {
    const events = JSON.parse(line.slice(2))
    for (const e of events) {
      if (e.type === 'search-start') {
        await updateLastMessageMeta(nodeId, { searchInProgress: e.query })
      }
      if (e.type === 'search-done') {
        await updateLastMessageMeta(nodeId, {
          searchInProgress: undefined,
          searchQueries: e.queries,
        })
      }
    }
  }
  ```

### 6.3 `store/treeStore.ts` 新增 action

```ts
updateLastMessageMeta: async (nodeId: string, patch: Partial<ChatMessageMeta>) => {
  // 找到节点最后一条 assistant 消息，merge patch 到 meta
}
```

### 6.4 `components/Chat/MessageInput.tsx`

**只改这一个输入组件**。`BranchConversationPanel.tsx` 不暴露自己的输入框——它调用 `<MessageInput />` 渲染两处（empty-state 和底部），所以改 `MessageInput` 一次两处就都生效。Homepage 用自己 inline 的 `<input>`，不走这里（符合"Homepage 不加图标"的要求）。

在 `MessageInput` 的底部工具栏左侧按钮组（`<div className="flex items-center gap-0.5">`）里、`Plus` 图标按钮的**右边**加一个 🌐 按钮：

```tsx
<button
  type="button"
  onClick={toggleWebSearch}
  className={clsx(
    'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition',
    webSearchEnabled
      ? 'bg-primary/10 text-primary border border-primary/30'
      : 'bg-surface-tertiary text-text-secondary border border-transparent hover:border-border'
  )}
  title={webSearchEnabled ? '已开启联网搜索' : '已关闭联网搜索'}
>
  <GlobeIcon className="w-3.5 h-3.5" />
  <span>联网</span>
</button>
```

（`Globe` 从项目已在用的 `lucide-react` 导入；`clsx` 同样已是依赖）

### 6.5 `components/KnowledgeTree/BranchConversationPanel.tsx::AssistantMessage`

**注意**：thinking 模式下 assistant 消息不用 `MessageBubble.tsx`，而是用该文件内定义的 `AssistantMessage` 组件（第 100 行起）。`MessageBubble` 是其他模式（prototype / chat preview 等）用的通用气泡，本次不动。

在 `AssistantMessage` 里，`<article>` 元素**之前**插入状态条：

```tsx
return (
  <div className="mb-6">
    {/* ↓ 新增：搜索状态条 */}
    {message.meta?.searchInProgress && (
      <div className="flex items-center gap-2 text-xs text-text-secondary mb-2">
        <span className="animate-pulse">🔍</span>
        <span>搜索：{message.meta.searchInProgress}</span>
      </div>
    )}
    {!message.meta?.searchInProgress && (message.meta?.searchQueries?.length ?? 0) > 0 && (
      <div className="text-xs text-text-secondary mb-2 opacity-70">
        🔍 已搜索 {message.meta!.searchQueries!.length} 次：
        {message.meta!.searchQueries!.join(' · ')}
      </div>
    )}

    <article ...>
      {/* 原有内容 */}
    </article>

    <BranchSummaryCard branches={branchNodes} />
  </div>
)
```

### 6.6 Homepage（`Homepage.tsx`）

**无需改动 UI**，只需保证它提交的第一条消息在 `handleSend` 链路里会读取 `useChatSettingsStore.webSearchEnabled`（默认 `true`）。这已经在 `useNodeStream` 里统一处理了。

## 7. 错误处理与边界

| 场景 | 处理 |
|------|------|
| 循环超过 `MAX_TOOL_ROUNDS` | break，并在 messages 追加 system hint "搜索上限已达，请基于已有信息回答"，再发一次请求让模型收尾 |
| `tool_calls.arguments` 不是合法 JSON | `tryParseQuery` 返回 `'…'`，流程不中断 |
| `streamChat` 抛错（API 401/500/网络） | catch 后 send `3:"<message>"`，前端 useNodeStream 抛 Error，assistant 消息末尾 `❌ Error: ...`（沿用当前行为） |
| 用户点停止 | `abortController.signal.aborted` 在每轮 loop 入口检查；`streamChat` 内部的 fetch 已经支持 AbortSignal（需在 chat.ts 里显式传入） |
| 非 Moonshot provider 但 `webSearch=true` | 忽略开关，正常无 tool 调用；前端 UI 上开关仍保持用户意图（不强制关闭） |

## 8. 验收场景（boss agent）

`baseUrl=http://localhost:5173`，验收目标："Kimi 联网搜索能力已接入对话树 thinking 模式"。

1. **开关关 + 提问**：树内对话输入框点关 🌐 → 问"量子力学是什么"。预期：响应与现在一致；network 请求 body 里 `webSearch=false`；消息气泡无搜索状态条。
2. **开关开 + 概念性问题**：点开 🌐 → 问"光合作用的原理"。预期：模型不触发搜索；响应正常流式出来；气泡顶部无状态条（没有 search-start 事件）。
3. **开关开 + 时效性问题**：问"今天 A 股上证指数收盘是多少"。预期：气泡顶部出现 "🔍 搜索：<query>"，完成后折叠为 "🔍 已搜索 N 次：..."；回答正文里包含 markdown 链接引用。
4. **多轮搜索**：问"对比一下 OpenAI 和 Anthropic 2026 年最新的旗舰模型"。预期：可能多次 search-start 事件；所有查询词都保留在 `searchQueries` 里。
5. **点停止**：搜索进行中按停止。预期：立即中断，不再发起下一轮；气泡停在中断位置，无报错。
6. **刷新保持**：开/关状态刷新后保持（localStorage）。
7. **Homepage 入口**：Homepage 发第一条时效性问题 → 能触发搜索（因为默认 `true`）。

## 9. 不做的 YAGNI 清单

- ❌ prototype / agent 模块接入 `$web_search`
- ❌ 第三方搜索 API 集成
- ❌ 客户端解析/渲染搜索结果 URL 列表（Moonshot 不返回）
- ❌ 每条消息独立开关
- ❌ 可展开的搜索详情弹窗
- ❌ 搜索关键词编辑/重发
- ❌ Homepage 输入框的 🌐 图标（空间不够）
- ❌ provider 切换的前端 UI（保留后端兼容判断即可）

## 10. 开发顺序（后续 writing-plans 会展开）

1. 扩展 types + `OpenAIToolDefinition` union
2. 重写 `routes/chat.ts` 后端（先不管前端，curl 能跑出 tool-calling loop 为准）
3. 新建 `chatSettingsStore`，改 `useNodeStream` + `treeStore.updateLastMessageMeta`
4. UI：`MessageInput` / `BranchConversationPanel` 加 🌐；`MessageBubble` 加状态条
5. system prompt 扩展
6. boss agent 按 §8 场景验收
