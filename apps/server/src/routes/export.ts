import { Hono } from 'hono'
import { generateText } from 'ai'
import { createModelInstance } from '../providers'

const exportRoute = new Hono()

const SUMMARY_PROMPT = `你是一个知识整理专家。用户会给你一棵知识树的完整对话内容（包含主线和分支），请将其总结归纳为一篇结构清晰的文档。

要求：
- 使用 Markdown 格式
- 用 # 作为文档标题（从对话主题提炼）
- 用 ## 作为主要章节
- 用 ### 作为子章节（对应分支话题）
- 保留关键的技术细节、公式、代码
- 去除对话中的冗余（如"好的"、"请问"等对话性内容）
- 行文流畅，像一篇正式的学习笔记或技术文档
- 如果有用户批注，以引用块形式保留
- 如果用户没指定语言，默认中文
- 只输出文档内容，不要包含额外解释`

interface TreeNodeData {
  selectedText: string | null
  messages: { role: string; content: string }[]
  annotations?: { selectedText: string; content: string }[]
  children: TreeNodeData[]
}

function treeToText(node: TreeNodeData, depth = 0): string {
  const indent = depth === 0 ? '主线对话' : `分支：${node.selectedText || '未命名分支'}`
  const parts: string[] = [`\n${'#'.repeat(Math.min(depth + 2, 4))} ${indent}\n`]

  for (const msg of node.messages) {
    if (msg.role === 'user') {
      parts.push(`**用户提问：** ${msg.content}\n`)
    } else {
      parts.push(`${msg.content}\n`)
    }
  }

  // Include annotations
  if (node.annotations && node.annotations.length > 0) {
    parts.push('\n**用户批注：**\n')
    for (const ann of node.annotations) {
      parts.push(`> "${ann.selectedText}" — ${ann.content}\n`)
    }
  }

  // Recurse children
  for (const child of node.children) {
    parts.push(treeToText(child, depth + 1))
  }

  return parts.join('\n')
}

exportRoute.post('/summary', async (c) => {
  const body = await c.req.json<{ treeData: TreeNodeData; title: string; provider?: string; model?: string }>()
  const { treeData, title, provider, model } = body

  const aiModelInstance = createModelInstance(provider, model)

  // Convert tree to readable text
  const treeText = treeToText(treeData)
  const userMessage = `以下是一棵知识树的完整对话内容，标题是「${title}」。请将其整理为一篇结构化文档：\n\n${treeText}`

  try {
    const result = await generateText({
      model: aiModelInstance,
      system: SUMMARY_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 4096,
    })

    return c.json({ markdown: result.text })
  } catch (error: unknown) {
    if (error instanceof Error && (error.message.includes('API key') || (error as any).status === 401)) {
      return c.json({ error: 'Invalid API key' }, 401)
    }
    return c.json({ error: error instanceof Error ? error.message : 'AI provider error' }, 500)
  }
})

export default exportRoute
