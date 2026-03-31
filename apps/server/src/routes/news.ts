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

  // Get or generate daily questions
  let questions: string[] | null = getDailyQuestions(today) ?? null
  if (!questions) {
    try {
      const model = createModelInstance()
      const { text } = await generateText({
        model,
        system: '你是一个 AI 行业分析师。根据提供的 AI 日报内容，生成 3 个值得深入思考的问题，涉及行业发展趋势和产品设计方向。每个问题一行，不要编号，不要多余解释。',
        prompt: briefing.content.slice(0, 4000),
        abortSignal: AbortSignal.timeout(30000),
      })
      questions = text.trim().split('\n').filter(Boolean).slice(0, 3)
      setDailyQuestions(today, questions)
    } catch (e) {
      console.error('[news] Failed to generate questions:', e instanceof Error ? e.message : e)
    }
  }

  return c.json({ summary, questions, date: today })
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
