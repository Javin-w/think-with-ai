import type { SearchOptions, SearchResult } from './types'

const ENDPOINT = 'https://api.bochaai.com/v1/web-search'

// Bocha embeds highlight markers as Unicode private-use chars (e.g.  /
//  around matched terms). They render as boxes in most fonts and
// confuse LLMs that try to quote the snippet verbatim. Strip them all.
const PUA_RE = /[\u{e000}-\u{f8ff}]/gu

function clean(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(PUA_RE, '').trim()
}

interface BochaWebPage {
  name?: string
  url?: string
  snippet?: string
  summary?: string
  siteName?: string
  siteIcon?: string
  datePublished?: string
}

interface BochaResponse {
  code: number | string
  msg?: string | null
  message?: string
  data?: {
    webPages?: {
      value?: BochaWebPage[]
    }
  }
}

export async function searchBocha(
  query: string,
  opts: SearchOptions = {},
): Promise<SearchResult[]> {
  const apiKey = process.env.BOCHA_API_KEY
  if (!apiKey) {
    throw new Error('BOCHA_API_KEY is not set')
  }

  const body = {
    query,
    count: opts.count ?? 8,
    freshness: opts.freshness ?? 'noLimit',
    summary: true,
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`Bocha API error (${res.status}): ${text}`)
  }

  const json = (await res.json()) as BochaResponse
  // Bocha returns code:200 on success but code:"403" / "401" as string on errors,
  // with the http status still 200 sometimes. Be defensive.
  if (String(json.code) !== '200') {
    const msg = json.msg || json.message || `code=${json.code}`
    throw new Error(`Bocha API error: ${msg}`)
  }

  const pages = json.data?.webPages?.value ?? []
  return pages.map<SearchResult>((p) => ({
    title: clean(p.name) || clean(p.url) || '(无标题)',
    url: p.url ?? '',
    snippet: clean(p.snippet),
    summary: clean(p.summary) || undefined,
    siteName: clean(p.siteName) || hostnameOf(p.url),
    favicon: p.siteIcon ?? '',
    datePublished: p.datePublished,
  }))
}

function hostnameOf(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
