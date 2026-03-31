import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import chat from './routes/chat'
import news from './routes/news'
import { fetchAndSaveDailyReport } from './routes/news'
import { startDailyScheduler } from './news/scheduler'
import agent from './routes/agent'
import exportRoute from './routes/export'

const app = new Hono()

app.use('/api/*', cors())

app.route('/api/chat', chat)
app.route('/api/news', news)
app.route('/api/agent', agent)
app.route('/api/export', exportRoute)

app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

const port = Number(process.env.PORT) || 3000
console.log(`Server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })

// Start daily news scheduler (11:00 AM)
startDailyScheduler(() => fetchAndSaveDailyReport())
