const HOUR = 11 // 每天上午 11 点
const DAY_MS = 24 * 60 * 60 * 1000

function msUntilNextRun(): number {
  const now = new Date()
  const next = new Date(now)
  next.setHours(HOUR, 0, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

export function startDailyScheduler(job: () => Promise<void>): void {
  const delay = msUntilNextRun()
  const nextRun = new Date(Date.now() + delay)
  console.log(`[scheduler] 每日自动抓取已设置，下次执行: ${nextRun.toLocaleString('zh-CN')}`)

  setTimeout(async () => {
    console.log('[scheduler] 执行每日自动抓取...')
    try {
      await job()
      console.log('[scheduler] 自动抓取完成')
    } catch (e) {
      console.error('[scheduler] 自动抓取失败:', e instanceof Error ? e.message : e)
    }
    // 之后每 24 小时重复
    setInterval(async () => {
      console.log('[scheduler] 执行每日自动抓取...')
      try {
        await job()
        console.log('[scheduler] 自动抓取完成')
      } catch (e) {
        console.error('[scheduler] 自动抓取失败:', e instanceof Error ? e.message : e)
      }
    }, DAY_MS)
  }, delay)
}
