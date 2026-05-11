import { NodeHtmlMarkdown } from 'node-html-markdown'

const nhm = new NodeHtmlMarkdown()

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

function extractContent(html: string): string {
  let contentHtml = ''

  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) {
    contentHtml = articleMatch[1]
  } else {
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (mainMatch) {
      contentHtml = mainMatch[1]
    } else {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      contentHtml = bodyMatch ? bodyMatch[1] : html
    }
  }

  return contentHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
}

/** Fetch AI daily from hex2077.dev (migrated from ai.hubtoday.app) */
async function fetchHubToday(date: string): Promise<string> {
  const [year, month] = date.split('-')
  const url = `https://hex2077.dev/docs/${year}-${month}/${date}/`
  console.log(`[scraper] Fetching hubtoday: ${url}`)

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
    if (!res.ok) {
      console.error(`[scraper] hubtoday HTTP ${res.status}`)
      return ''
    }
    const html = await res.text()
    let md = nhm.translate(extractContent(html)).trim()
    // hex2077 wraps articles with a decorative header (nav, search box, "Secure_Doc"
    // banner, promo blockquote, promo link). Anchor on the first 今日摘要 heading
    // and drop everything before it. Falls back to original content if not found.
    const summaryIdx = md.search(/^#{1,3}\s+\*{0,2}\s*今日摘要/m)
    if (summaryIdx > 0) {
      md = md.slice(summaryIdx)
    }
    // Strip duplicate title and tag blockquote
    md = md
      .replace(/^#\s*AI资讯日报[^\n]*\n*/i, '')
      .replace(/^>\s*[""\u201c].*?[""\u201d]\s*\n*/m, '')
      .trim()
    console.log(`[scraper] hubtoday: ${md.length} chars`)
    return md
  } catch (e) {
    console.error(`[scraper] hubtoday failed:`, e instanceof Error ? e.message : e)
    return ''
  }
}

/** Fetch AI news from news.smol.ai */
async function fetchSmolAI(date: string): Promise<string> {
  // URL format: /issues/YY-MM-DD-slug (slug varies, try "not-much" first)
  const [year, month, day] = date.split('-')
  const shortYear = year.slice(2)
  const baseSlug = `${shortYear}-${month}-${day}-not-much`
  let url = `https://news.smol.ai/issues/${baseSlug}`

  console.log(`[scraper] Fetching smol.ai: ${url}`)

  try {
    let res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })

    // If 404, try to find the correct slug from the issues listing
    if (!res.ok && res.status === 404) {
      console.log(`[scraper] smol.ai slug not-much 404, searching issues list...`)
      const listRes = await fetch('https://news.smol.ai/issues', {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(10000),
      })
      if (listRes.ok) {
        const listHtml = await listRes.text()
        // Find link matching this date: /issues/YY-MM-DD-*
        const slugPattern = new RegExp(`/issues/${shortYear}-${month}-${day}-([^"]+)`, 'i')
        const match = listHtml.match(slugPattern)
        if (match) {
          url = `https://news.smol.ai${match[0]}`
          console.log(`[scraper] Found smol.ai slug: ${url}`)
          res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) })
        }
      }
    }

    if (!res.ok) {
      console.error(`[scraper] smol.ai HTTP ${res.status}`)
      return ''
    }

    const html = await res.text()
    const md = nhm.translate(extractContent(html)).trim()
    console.log(`[scraper] smol.ai: ${md.length} chars`)
    return md
  } catch (e) {
    console.error(`[scraper] smol.ai failed:`, e instanceof Error ? e.message : e)
    return ''
  }
}

/** Fetch and merge content from all sources */
export async function fetchDailyReport(date: string): Promise<{ title: string; content: string }> {
  const [hubtoday, smolai] = await Promise.all([
    fetchHubToday(date),
    fetchSmolAI(date),
  ])

  const parts: string[] = []
  if (hubtoday) parts.push(`<!-- 来源: AI洞察日报 -->\n${hubtoday}`)
  if (smolai) parts.push(`<!-- 来源: SmolAI News -->\n${smolai}`)

  if (parts.length === 0) {
    throw new Error(`No content fetched for ${date} from any source`)
  }

  const content = parts.join('\n\n---\n\n')
  const title = `AI资讯日报 ${date}`
  console.log(`[scraper] Merged ${parts.length} sources, total ${content.length} chars`)

  return { title, content }
}
