import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNewsStore } from '../../store/newsStore'

function formatDateLabel(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).toUpperCase()
  } catch {
    return dateStr
  }
}

function formatDateFull(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Extract first paragraph (after any heading) as executive summary */
function extractSummary(content: string): { title: string; summary: string; rest: string } {
  const lines = content.split('\n')
  let title = ''
  let summaryLines: string[] = []
  let restStartIdx = 0
  let foundTitle = false
  let foundSummary = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // First heading becomes the title
    if (!foundTitle && line.startsWith('#')) {
      title = line.replace(/^#+\s*/, '')
      foundTitle = true
      continue
    }

    // Try to find "今日摘要" section
    if (line.includes('今日摘要') || line.includes('摘要') || line.includes('Executive Summary')) {
      // Collect paragraphs until next heading
      for (let j = i + 1; j < lines.length; j++) {
        const sline = lines[j].trim()
        if (sline.startsWith('#')) {
          restStartIdx = j
          foundSummary = true
          break
        }
        if (sline) summaryLines.push(sline)
      }
      if (foundSummary) break
    }
  }

  // If no explicit summary section, take the first non-heading paragraph
  if (!foundSummary) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('#')) continue
      summaryLines = [line]
      restStartIdx = i + 1
      break
    }
  }

  const rest = lines.slice(restStartIdx).join('\n')
  return {
    title,
    summary: summaryLines.join(' '),
    rest,
  }
}

export default function NewsModule() {
  const { briefings, currentBriefing, isLoading, isFetching, fetchBriefings, fetchBriefing, fetchDaily } = useNewsStore()
  const [activeTab, setActiveTab] = useState<'current' | 'archive'>('current')

  useEffect(() => {
    fetchBriefings()
  }, [fetchBriefings])

  const parsed = currentBriefing ? extractSummary(currentBriefing.content) : null

  return (
    <div className="flex h-full">
      <section className="flex-1 overflow-y-auto">
        {/* Top Tab Bar */}
        <header className="sticky top-0 z-10 bg-[#f8fafc]/70 backdrop-blur-md px-6 md:px-12 h-14 flex items-center justify-between border-b border-[#e2e8f0]/30">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('current')}
              className={`text-[0.6875rem] font-bold uppercase tracking-widest pb-1 transition-colors ${
                activeTab === 'current'
                  ? 'text-brand border-b-2 border-brand'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              当日简报
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`text-[0.6875rem] font-bold uppercase tracking-widest pb-1 transition-colors ${
                activeTab === 'archive'
                  ? 'text-brand border-b-2 border-brand'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              简报归档
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'current' && (
              <button
                onClick={() => fetchDaily()}
                disabled={isFetching}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-br from-brand to-brand-hover text-white rounded-full text-xs font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isFetching ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    同步中...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                    </svg>
                    同步今日
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Archive Tab */}
        {activeTab === 'archive' ? (
          <div className="max-w-4xl mx-auto px-6 md:px-14 py-10">
            <header className="mb-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-0.5 bg-brand rounded-full" />
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-brand">
                  Archive
                </p>
              </div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-text-primary mb-2">
                简报归档
              </h2>
              <p className="text-base text-text-secondary">
                共 {briefings.length} 期简报
              </p>
            </header>

            {briefings.length === 0 && !isLoading ? (
              <p className="text-sm text-text-secondary">暂无简报</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {briefings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      fetchBriefing(b.id)
                      setActiveTab('current')
                    }}
                    className="w-full text-left p-5 rounded-xl bg-white/60 border border-[#e2e8f0]/40 hover:bg-white hover:shadow-sm transition-all duration-200 group"
                  >
                    <p className="text-xs font-bold text-brand mb-1.5">
                      {formatDateLabel(b.date)}
                    </p>
                    <p className="text-sm font-semibold text-text-primary leading-snug group-hover:text-brand transition-colors">
                      {b.title}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-[calc(100%-3.5rem)]">
            <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : currentBriefing && parsed ? (
          <div className="max-w-4xl mx-auto px-6 md:px-14 py-10">
            {/* Editorial Header */}
            <header className="mb-14">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-10 h-0.5 bg-brand rounded-full" />
                <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-brand">
                  Intelligence Briefing
                </p>
              </div>
              <h2 className="text-4xl md:text-6xl font-light tracking-tight text-text-primary mb-3">
                AI 每日简报
              </h2>
              <p className="text-lg text-text-secondary font-medium">
                {formatDateFull(currentBriefing.date)}
              </p>
            </header>

            {/* Executive Summary Card (Glassmorphism) */}
            {parsed.summary && (
              <div className="relative rounded-2xl overflow-hidden mb-16">
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-[#8e2fbd]/5" />
                <div className="relative backdrop-blur-xl bg-white/60 p-8 md:p-12 border border-white/40 shadow-xl">
                  <div className="max-w-3xl">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#f6d9ff] text-[#8e2fbd] text-[10px] font-bold uppercase tracking-wider mb-5">
                      今日摘要
                    </span>
                    <h3 className="text-2xl md:text-3xl font-semibold mb-5 leading-tight text-text-primary">
                      {parsed.title || currentBriefing.title}
                    </h3>
                    <p className="text-base md:text-lg text-text-secondary leading-relaxed">
                      {parsed.summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content (Markdown) */}
            <article className="prose prose-lg max-w-none news-article news-atheneum">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {parsed.rest || currentBriefing.content}
              </ReactMarkdown>
            </article>

            {/* Footer */}
            <footer className="mt-20 pt-10 border-t border-[#e2e8f0]/30 text-center">
              <p className="text-[10px] text-text-secondary font-medium tracking-wide uppercase">
                Think With AI · Daily Intelligence Report · {currentBriefing.date}
              </p>
            </footer>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-[calc(100%-3.5rem)] text-text-secondary gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand/10 to-[#8e2fbd]/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-brand/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-text-primary mb-1">暂无简报</h3>
              <p className="text-sm text-text-secondary mb-6">点击下方按钮抓取今日 AI 日报</p>
            </div>
            <button
              onClick={() => fetchDaily()}
              disabled={isFetching}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-br from-brand to-brand-hover text-white rounded-full font-bold text-sm shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isFetching ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  抓取中...
                </>
              ) : (
                '抓取今日 AI 日报'
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
