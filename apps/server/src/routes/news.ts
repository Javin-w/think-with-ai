import { Hono } from 'hono'
import { getAllBriefings, getBriefing, getBriefingByDate, createBriefing, updateBriefing, deleteBriefing, getDailyQuestions, setDailyQuestions } from '../news/store'
import { fetchDailyReport } from '../news/scraper'
import { refineBriefing } from '../news/refiner'
import { generateText } from 'ai'
import { createModelInstance } from '../providers'

const news = new Hono()

/** Fetch, refine, and save daily report. Exported for scheduler use. */
export async function fetchAndSaveDailyReport(date?: string): Promise<void> {
  const d = date || new Date().toISOString().slice(0, 10)
  const { title, content: rawContent } = await fetchDailyReport(d)
  const content = refineBriefing(rawContent)
  createBriefing({ title, content, date: d })
  console.log(`[news] Saved briefing for ${d}`)
}

// GET / — list all briefings (without content)
news.get('/', (c) => {
  return c.json({ briefings: getAllBriefings() })
})

// GET /today — today's summary + AI-generated thinking questions
news.get('/today', async (c) => {
  const today = new Date().toISOString().slice(0, 10)
  const briefing = getBriefingByDate(today)

  if (!briefing) {
    return c.json({ summary: null, questions: null, date: today })
  }

  // Extract summary: content between "## 今日摘要" and next "##"
  const summaryMatch = briefing.content.match(/##\s*\**\s*今日摘要\**[^\n]*\n([\s\S]*?)(?=\n##\s|\n---|\Z)/i)
  const summary = summaryMatch ? summaryMatch[1].trim() : null

  // Extract first headline from each category section (### headers)
  const CATEGORY_MAP: Record<string, string> = {
    '产品与功能更新': 'product',
    '前沿研究': 'research',
    '行业展望与社会影响': 'industry',
    '开源TOP项目': 'opensource',
    '开源top项目': 'opensource',
    '社媒分享': 'social',
    '社媒热议': 'social',
  }
  const categoryHeadlines: Array<{ category: string; title: string; items: string[] }> = []
  // Split content by ### sections and extract titles from each
  const sectionRegex = /^###\s+(.+)/gm
  let sectionMatch: RegExpExecArray | null
  const sections: Array<{ header: string; startIndex: number }> = []
  while ((sectionMatch = sectionRegex.exec(briefing.content)) !== null) {
    sections.push({ header: sectionMatch[1], startIndex: sectionMatch.index + sectionMatch[0].length })
  }
  for (let i = 0; i < sections.length && categoryHeadlines.length < 4; i++) {
    const headerRaw = sections[i].header.replace(/\*+/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim()
    const categoryKey = Object.keys(CATEGORY_MAP).find(k => headerRaw.includes(k))
    if (!categoryKey) continue
    const endIndex = i + 1 < sections.length ? sections[i + 1].startIndex : briefing.content.length
    const sectionContent = briefing.content.slice(sections[i].startIndex, endIndex)
    // Extract all numbered bold titles (up to 3)
    const allTitles: string[] = []
    const titleRegex = /\d+\.\s+\*\*(.+?)[。！？.!?]?\*\*/g
    let tm: RegExpExecArray | null
    while ((tm = titleRegex.exec(sectionContent)) !== null && allTitles.length < 3) {
      const t = tm[1].replace(/[。！？.!?]$/, '').trim()
      if (t.length > 4) allTitles.push(t)
    }
    if (allTitles.length > 0) {
      categoryHeadlines.push({ category: CATEGORY_MAP[categoryKey], title: allTitles[0], items: allTitles })
    }
  }

  // Get or generate daily keywords for AI learning
  let keywords: string[] | null = getDailyQuestions(today) ?? null
  if (!keywords) {
    try {
      const model = createModelInstance()
      const { text } = await generateText({
        model,
        system: `你是一个 AI 技术编辑。根据提供的 AI 日报内容，提取 5-8 个值得深入学习的技术名词或概念。
要求：
- 每行一个，格式为：技术名词|一句话简短解释
- 优先选择日报中出现的新模型、新技术、新框架、新算法
- 解释要简洁，不超过 20 字
- 不要编号，不要多余解释
示例：
Qwen3.5-Omni|阿里全模态大模型，支持文本/图像/音频/视频
ARC-AGI-3|衡量AI通用推理能力的基准测试`,
        prompt: briefing.content.slice(0, 4000),
        abortSignal: AbortSignal.timeout(30000),
      })
      keywords = text.trim().split('\n').filter(Boolean).slice(0, 8)
      setDailyQuestions(today, keywords)
    } catch (e) {
      console.error('[news] Failed to generate keywords:', e instanceof Error ? e.message : e)
    }
  }

  return c.json({ summary, keywords, categoryHeadlines, date: today })
})

// GET /:id — get single briefing with content
news.get('/:id', (c) => {
  const briefing = getBriefing(c.req.param('id'))
  if (!briefing) return c.json({ error: 'Not found' }, 404)
  return c.json(briefing)
})

// POST / — create new briefing
news.post('/', async (c) => {
  const body = await c.req.json<{ title: string; content: string; date: string }>()
  if (!body.title || !body.content || !body.date) {
    return c.json({ error: 'title, content, and date are required' }, 400)
  }
  const briefing = createBriefing(body)
  return c.json(briefing, 201)
})

// POST /fetch-daily — manual sync trigger
news.post('/fetch-daily', async (c) => {
  const body = await c.req.json<{ date?: string }>().catch(() => ({}))
  try {
    await fetchAndSaveDailyReport((body as any).date)
    return c.json({ ok: true, briefings: getAllBriefings() }, 201)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Scrape failed'
    console.error('[news] Scrape failed:', msg)
    return c.json({ error: msg }, 500)
  }
})

// PUT /:id — update briefing
news.put('/:id', async (c) => {
  const body = await c.req.json<Partial<{ title: string; content: string; date: string }>>()
  const updated = updateBriefing(c.req.param('id'), body)
  if (!updated) return c.json({ error: 'Not found' }, 404)
  return c.json(updated)
})

// DELETE /:id — delete briefing
news.delete('/:id', (c) => {
  const deleted = deleteBriefing(c.req.param('id'))
  if (!deleted) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

export default news
