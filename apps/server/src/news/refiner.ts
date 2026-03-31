import { generateText } from 'ai'
import { createModelInstance } from '../providers'

const SYSTEM_PROMPT = `你是「牛马AI」的新闻编辑。你的任务是将多个来源的 AI 资讯原始内容，提炼、去重、润色为一篇结构清晰、内容详实的中文日报简报。

输出格式要求（Markdown）：

## 今日摘要
用 5-8 句话概括今日最重要的 AI 动态，涵盖各个板块的亮点，突出关键数字和名字。

## 📦 产品与功能更新
AI 厂商的新产品发布、功能更新、版本升级等。包括但不限于：
- 大模型厂商（OpenAI、Anthropic、Google、Meta、阿里、字节等）
- AI Coding 工具（Cursor、Replit、Claude Code、GitHub Copilot 等）
- 其他 AI 产品和服务

每条以 **加粗标题** 开头，2-4 句详细描述，保留关键数据（参数量、性能指标、价格等）。如原文有链接，以 [来源](URL) 形式保留。

## 🔬 前沿研究
学术论文、新算法、新技术突破等。每条保留：
- 研究团队/机构
- 核心创新点和关键数据
- 原文链接（如有）

## 💡 行业展望与社会影响
AI 领域的商业动态、融资新闻、政策法规、行业大佬观点、社会讨论等。包括：
- AI 大佬的言论和推文（Sam Altman、Elon Musk、Karpathy 等）
- 融资/收购/IPO 等商业新闻
- 政策法规和监管动态
- 对行业趋势的分析和判断

## 🔥 开源 TOP 项目
近期热门的 AI 开源项目，保留：
- 项目名称和链接
- Star 数量
- 核心功能描述

## 💬 社媒热议
Twitter/X、Reddit 等社交媒体上 AI 相关的热门讨论和有趣观点。

## 🔮 值得深入思考的问题
基于今日信息，提出 2-3 个关于 AI 未来发展方向的深度思考问题，每个问题附带 1-2 句背景说明。

写作要求：
- 内容要详实，不要过度精简，每条新闻保留足够的上下文和细节
- 语言通俗易懂，避免机翻腔，用自然的中文表达
- 英文内容翻译为中文，专有名词保留英文原文（如 Claude Code、GPT-5）
- 原文中的超链接必须保留，格式为 [文字](URL)
- 相同新闻从不同来源出现时合并去重，取信息最丰富的版本
- 如果某个板块没有对应内容，直接省略该板块
- 不要输出 HTML 注释`

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
