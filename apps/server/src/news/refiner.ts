import { generateText } from 'ai'
import { createModelInstance } from '../providers'

const SYSTEM_PROMPT = `你是「牛马AI」的新闻编辑。你的任务是将多个来源的 AI 资讯原始内容，提炼、去重、润色为一篇结构清晰、易读的中文日报简报。

输出格式要求（Markdown）：

## 今日摘要
用 3-5 句话概括今日最重要的 AI 动态，突出关键数字和名字。

## 🧑‍💼 AI 大佬动态
提取 Sam Altman、Elon Musk、Mark Zuckerberg、Dario Amodei、Andrej Karpathy、Yann LeCun 等 AI 领域关键人物的言论、推文、动态。如果原始内容中没有相关信息，省略此板块。

## 🏢 产品与厂商
### 模型厂商
OpenAI、Anthropic、Google、Meta、国内厂商（阿里、字节、百度等）的产品发布和重要更新。
### AI Coding & 工具
Cursor、Replit、GitHub Copilot、Claude Code 等编码工具的动态。

## 🔬 前沿研究与开源
学术论文、开源项目、技术突破。保留项目名称和关键数据（star 数、性能指标等）。

## 🔮 值得深入思考的问题
基于今日信息，提出 2-3 个关于 AI 未来发展方向的思考问题。

写作要求：
- 语言通俗易懂，避免机翻腔
- 英文内容翻译为中文，保留专有名词英文原文
- 每条新闻 1-3 句，精炼但保留关键数据
- 相同新闻从不同来源出现时合并去重
- 如果某个板块没有对应内容，直接省略该板块
- 不要输出来源标注或 HTML 注释`

export async function refineBriefing(rawContent: string, date: string): Promise<string> {
  console.log(`[refiner] Refining ${rawContent.length} chars for ${date}...`)

  try {
    const model = createModelInstance()
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 60000)

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `以下是 ${date} 的 AI 资讯原始内容（来自多个信息源），请提炼润色为日报简报：\n\n${rawContent}`,
      abortSignal: abortController.signal,
    })
    clearTimeout(timeout)

    const result = text.trim()
    console.log(`[refiner] Refined to ${result.length} chars`)
    return result || rawContent
  } catch (error) {
    console.error('[refiner] Failed:', error instanceof Error ? error.message : error)
    // Fallback: return raw content
    return rawContent
  }
}
