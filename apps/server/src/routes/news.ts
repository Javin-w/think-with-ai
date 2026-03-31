import { Hono } from 'hono'
import { getAllBriefings, getBriefing, createBriefing, updateBriefing, deleteBriefing } from '../news/store'
import { fetchDailyReport } from '../news/scraper'
import { refineBriefing } from '../news/refiner'

const news = new Hono()

// GET / — list all briefings (without content)
news.get('/', (c) => {
  return c.json({ briefings: getAllBriefings() })
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

// POST /fetch-daily — scrape ai.hubtoday.app for a specific date
news.post('/fetch-daily', async (c) => {
  const body = await c.req.json<{ date?: string }>().catch(() => ({}))
  const date = (body as any).date || new Date().toISOString().slice(0, 10)

  try {
    const { title, content: rawContent } = await fetchDailyReport(date)
    const content = await refineBriefing(rawContent, date)
    const briefing = createBriefing({ title, content, date })
    return c.json(briefing, 201)
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
