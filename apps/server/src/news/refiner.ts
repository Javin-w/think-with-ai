import { generateText } from 'ai'
import { createModelInstance } from '../providers'

const SYSTEM_PROMPT = `你是一个内容清洗工具。你的任务是将 AI 资讯原始内容中的非资讯内容过滤掉，只保留有价值的 AI 新闻信息。

需要删除的内容：
- 进群/社群邀请、二维码提示（如"进群交流"、"加入社区"等）
- 个人品牌/自媒体推广（如公众号关注、播客推荐、抖音关注等）
- 网站导航链接（如"访问网页版"、"AI导航"等）
- 多渠道分发信息（如"微信公众号：xxx"、"抖音：xxx"等）
- 广告、赞助内容
- 版权声明、免责声明
- 与 AI 资讯无关的内容

需要保留的内容：
- 所有 AI 相关的新闻、产品更新、研究进展
- 原文的结构和分类（今日摘要、产品更新、前沿研究、行业展望、开源项目、社媒分享等）
- 所有超链接，格式为 [文字](URL)
- 关键数据（数字、指标、star 数等）
- 原文的 Markdown 格式（标题层级、列表、加粗等）

直接输出清洗后的内容，不要添加任何额外说明或前言。`

export async function refineBriefing(rawContent: string, date: string): Promise<string> {
  console.log(`[refiner] Refining ${rawContent.length} chars for ${date}...`)

  try {
    const model = createModelInstance()
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), 60000)

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `以下是 ${date} 的 AI 资讯原始内容，请过滤掉非资讯内容，保留原文结构输出：\n\n${rawContent}`,
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
