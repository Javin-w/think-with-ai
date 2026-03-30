/**
 * Agent Route — SSE endpoint for all agent modules
 *
 * POST /api/agent/run
 *   Body: { module?, message, sessionId?, provider?, model?, existingModuleState?, existingMessages? }
 *   Response: SSE stream of AgentEvent
 */

import { Hono } from 'hono'
import { runAgent, AGENT_MODULES, pendingFeedback } from '../agent'

const agent = new Hono()

agent.post('/run', async (c) => {
  const body = await c.req.json()
  const {
    module: moduleName = 'prototype',
    message,
    sessionId,
    provider,
    model,
    existingState,
    existingModuleState,
    existingMessages,
  } = body

  if (!message || typeof message !== 'string') {
    return c.json({ error: 'message is required' }, 400)
  }

  const config = AGENT_MODULES[moduleName]
  if (!config) {
    return c.json({ error: `Unknown agent module: ${moduleName}` }, 400)
  }

  const stream = runAgent(config, {
    message,
    sessionId: sessionId ?? crypto.randomUUID(),
    provider,
    model,
    // Support both field names for backward compatibility
    existingModuleState: existingModuleState ?? existingState,
    existingMessages,
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
      'Access-Control-Allow-Origin': '*',
    },
  })
})

/**
 * POST /api/agent/feedback
 * Frontend sends DOM info / screenshot back to the running agent.
 */
agent.post('/feedback', async (c) => {
  const { requestId, data } = await c.req.json()

  if (!requestId || typeof data !== 'string') {
    return c.json({ error: 'requestId and data are required' }, 400)
  }

  const resolve = pendingFeedback.get(requestId)
  if (resolve) {
    resolve(data)
    return c.json({ ok: true })
  }

  return c.json({ error: 'No pending request found for this requestId' }, 404)
})

export default agent
