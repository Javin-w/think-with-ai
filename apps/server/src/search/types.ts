/**
 * Unified search result shape across providers (currently only Bocha,
 * but kept generic to make Tavily/Perplexity swap-in trivial later).
 */
export interface SearchResult {
  title: string
  url: string
  snippet: string        // short excerpt
  summary?: string       // longer excerpt when the provider returns one
  siteName: string
  favicon: string        // absolute favicon URL
  datePublished?: string // ISO timestamp if available
}

export interface SearchOptions {
  count?: number          // default 8
  freshness?: 'oneDay' | 'oneWeek' | 'oneMonth' | 'oneYear' | 'noLimit'
  signal?: AbortSignal
}
