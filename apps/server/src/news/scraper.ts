import { NodeHtmlMarkdown } from 'node-html-markdown'

const nhm = new NodeHtmlMarkdown()

export async function fetchDailyReport(date: string): Promise<{ title: string; content: string }> {
  // date format: 2026-03-30
  const [year, month] = date.split('-')
  const url = `https://ai.hubtoday.app/${year}-${month}/${date}/`

  console.log(`[scraper] Fetching ${url}...`)

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch: HTTP ${response.status}`)
  }

  const html = await response.text()

  // Extract the main article content
  // The site uses <article> or a main content area
  let contentHtml = ''

  // Try to find <article> tag first
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)
  if (articleMatch) {
    contentHtml = articleMatch[1]
  } else {
    // Fallback: find main content between common markers
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)
    if (mainMatch) {
      contentHtml = mainMatch[1]
    } else {
      // Last resort: find the largest content block
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
      contentHtml = bodyMatch ? bodyMatch[1] : html
    }
  }

  // Remove script, style, nav, footer, header tags
  contentHtml = contentHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')

  // Convert HTML to Markdown
  let markdown = nhm.translate(contentHtml).trim()

  if (!markdown) {
    throw new Error('No content extracted from page')
  }

  // Remove the page's own title (e.g. "# AI资讯日报 2026/3/31") and tag blockquote
  // that duplicates our title and adds noise
  markdown = markdown
    .replace(/^#\s*AI资讯日报[^\n]*\n*/i, '')
    .replace(/^>\s*[""].*?[""]\s*\n*/m, '')
    .trim()

  const title = `AI资讯日报 ${date}`
  console.log(`[scraper] Got ${markdown.length} chars for ${date}`)

  return { title, content: markdown }
}
