import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/api/*', cors())

app.get('/api/health', (c) => {
  return c.json({ status: 'ok' })
})

const port = Number(process.env.PORT) || 3000
console.log(`Server running on http://localhost:${port}`)

serve({ fetch: app.fetch, port })
