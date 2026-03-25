import { generateText } from 'ai'
import { createModelInstance } from '../providers'

const SUMMARIZE_PROMPT =
  '你是一个AI新闻编辑。根据以下文章标题和摘要，生成一段50-100字的中文摘要。如果原文是英文，翻译成中文。只输出摘要内容，不要包含其他文字。'

export async function summarizeArticle(
  title: string,
  description: string,
): Promise<string> {
  try {
    const model = createModelInstance()
    const { text } = await generateText({
      model,
      system: SUMMARIZE_PROMPT,
      prompt: `标题: ${title}\n摘要: ${description}`,
    })
    return text.trim() || description.slice(0, 200)
  } catch (error) {
    console.error('[news] Summarization failed:', error instanceof Error ? error.message : error)
    return description.slice(0, 200)
  }
}
