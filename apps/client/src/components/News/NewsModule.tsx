import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useNewsStore } from '../../store/newsStore'

interface TocItem {
  id: string
  text: string
  level: 1 | 2 | 3
}

function slugifyBase(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\[\]()<>*_`#~|!?,.;:'"\\\/]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getNodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(getNodeText).join('')
  if (typeof node === 'object' && 'props' in node) {
    return getNodeText((node as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

/** Extract h1/h2/h3 headings (in order) and assign deduped ids */
function extractToc(content: string): TocItem[] {
  const lines = content.split('\n')
  const items: TocItem[] = []
  const seen = new Map<string, number>()
  let inFence = false

  for (const raw of lines) {
    const line = raw.trim()
    if (/^```/.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = /^(#{1,3})\s+(.+?)\s*$/.exec(line)
    if (!m) continue
    const level = m[1].length as 1 | 2 | 3
    const text = m[2]
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[\]\(#[^)]*\)/g, '')
      .trim()
    if (!text) continue
    const base = slugifyBase(text) || `heading-${items.length + 1}`
    const cnt = (seen.get(base) ?? 0) + 1
    seen.set(base, cnt)
    const id = cnt === 1 ? base : `${base}-${cnt}`
    items.push({ id, text, level })
  }
  return items
}

interface TocProps {
  items: TocItem[]
  activeId: string
  onJump: (id: string) => void
}

function TableOfContents({ items, activeId, onJump }: TocProps) {
  if (items.length === 0) return null
  return (
    <nav aria-label="文章大纲" className="text-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-3">
        大纲
      </p>
      <ul className="space-y-1 border-l border-border">
        {items.map((it) => {
          const isActive = activeId === it.id
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => onJump(it.id)}
                style={{ paddingLeft: `${(it.level - 1) * 12 + 12}px` }}
                className={`block w-full text-left py-1 pr-2 leading-snug transition-colors -ml-px border-l-2 ${
                  isActive
                    ? 'border-brand text-brand font-semibold'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
                title={it.text}
              >
                <span className="line-clamp-2">{it.text}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

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
  let restStartIdx = lines.length
  let foundTitle = false
  let foundSummary = false

  // Lines we never want in the summary (TOC anchor links, blockquote citations, html comments)
  const isAnchorOnlyLine = (line: string) =>
    !line.startsWith('#') && /\[[^\]]*\]\(#[^)]*\)/.test(line)
  const isCitation = (line: string) => /^>+\s*\[/.test(line)
  const isHtmlComment = (line: string) => /^<!--/.test(line)
  const isCodeFence = (line: string) => /^`{3,}/.test(line)
  const isMeaningless = (line: string) =>
    isAnchorOnlyLine(line) || isCitation(line) || isHtmlComment(line) || isCodeFence(line)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (isHtmlComment(line)) continue

    // Summary heading (e.g. "## 今日摘要") wins over title detection — match
    // ONLY real headings, never inline TOC anchors like "**今日摘要** [](#...)"
    if (
      !foundSummary &&
      line.startsWith('#') &&
      (line.includes('摘要') || line.includes('Executive Summary'))
    ) {
      foundSummary = true
      for (let j = i + 1; j < lines.length; j++) {
        const sline = lines[j].trim()
        if (sline.startsWith('#')) {
          restStartIdx = j
          break
        }
        if (!sline) continue
        if (isMeaningless(sline)) continue
        summaryLines.push(sline)
      }
      break
    }

    // First non-summary heading becomes the title
    if (!foundTitle && line.startsWith('#')) {
      title = line
        .replace(/^#+\s*/, '')
        .replace(/\[[^\]]*\]\([^)]*\)/g, '')
        .trim()
      foundTitle = true
      continue
    }
  }

  // Fallback: first prose paragraph if no explicit summary section
  if (!foundSummary) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line || line.startsWith('#') || isMeaningless(line)) continue
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
  const scrollRef = useRef<HTMLElement>(null)
  const [activeTocId, setActiveTocId] = useState<string>('')

  useEffect(() => {
    fetchBriefings()
  }, [fetchBriefings])

  const parsed = currentBriefing ? extractSummary(currentBriefing.content) : null
  const articleSource = parsed ? (parsed.rest || currentBriefing!.content) : ''
  const tocItems = useMemo(() => extractToc(articleSource), [articleSource])

  // Index toc items by their normalized text. Multiple headings can share a
  // text — store the ids in order so the n-th render of "X" picks the n-th id.
  const idIndex = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const it of tocItems) {
      const arr = m.get(it.text) ?? []
      arr.push(it.id)
      m.set(it.text, arr)
    }
    return m
  }, [tocItems])

  // Per-render counter for which occurrence of a duplicated heading we're at.
  // Reset every render so React strict mode's double-invocation is idempotent.
  const consumedRef = useRef<Map<string, number>>(new Map())
  consumedRef.current = new Map()

  const markdownComponents = useMemo<Components>(() => {
    const normalize = (s: string) =>
      s
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[\]\(#[^)]*\)/g, '')
        .trim()
    const makeId = (children: ReactNode): string | undefined => {
      const text = normalize(getNodeText(children))
      if (!text) return undefined
      const ids = idIndex.get(text)
      if (!ids || ids.length === 0) return undefined
      const used = consumedRef.current.get(text) ?? 0
      consumedRef.current.set(text, used + 1)
      return ids[Math.min(used, ids.length - 1)]
    }
    return {
      h1: ({ children, ...rest }) => (
        <h1 id={makeId(children)} {...rest}>{children}</h1>
      ),
      h2: ({ children, ...rest }) => (
        <h2 id={makeId(children)} {...rest}>{children}</h2>
      ),
      h3: ({ children, ...rest }) => (
        <h3 id={makeId(children)} {...rest}>{children}</h3>
      ),
    }
  }, [idIndex])

  useEffect(() => {
    if (tocItems.length === 0) return
    const root = scrollRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) {
          setActiveTocId(visible[0].target.id)
        }
      },
      { root, rootMargin: '-90px 0px -70% 0px', threshold: 0 }
    )
    const targets = tocItems
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el != null)
    targets.forEach((el) => observer.observe(el))
    if (targets[0]) setActiveTocId(targets[0].id)
    return () => observer.disconnect()
  }, [tocItems, currentBriefing?.id])

  const handleJump = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveTocId(id)
    }
  }

  return (
    <div className="flex h-full">
      <section ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Top Tab Bar */}
        <header className="sticky top-0 z-10 bg-surface-secondary/80 backdrop-blur-md px-6 md:px-12 h-14 flex items-center justify-between border-b border-border">
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
                className="flex items-center gap-2 px-5 py-2 bg-brand text-surface-secondary rounded-full text-xs font-bold shadow-sm hover:bg-brand-hover transition-colors disabled:opacity-50"
              >
                {isFetching ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-surface-secondary/40 border-t-surface-secondary rounded-full animate-spin" />
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
                    className="w-full text-left p-5 rounded-xl bg-surface/60 border border-border hover:bg-surface hover:shadow-sm transition-all duration-200 group"
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
          <div className="max-w-7xl mx-auto px-6 md:px-14 py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12">
            <div className="min-w-0 max-w-4xl mx-auto lg:mx-0 w-full">
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

            {/* Executive Summary Card */}
            {parsed.summary && (
              <div className="relative rounded-2xl overflow-hidden mb-16">
                <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-rust/5" />
                <div className="relative backdrop-blur-xl bg-surface/60 p-8 md:p-12 border border-border shadow-xl">
                  <div className="max-w-3xl">
                    <span className="inline-block px-3 py-1 rounded-full bg-brand/15 text-brand text-[10px] font-bold uppercase tracking-wider mb-5">
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
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {parsed.rest || currentBriefing.content}
              </ReactMarkdown>
            </article>

            {/* Footer */}
            <footer className="mt-20 pt-10 border-t border-border text-center space-y-2">
              <p className="text-[10px] text-text-secondary font-medium tracking-wide uppercase">
                Think With AI · Daily Intelligence Report · {currentBriefing.date}
              </p>
              <p className="text-xs text-text-secondary">
                信息源自{' '}
                <a
                  href={`https://hex2077.dev/docs/${currentBriefing.date.slice(0, 7)}/${currentBriefing.date}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:underline"
                >
                  hex2077.dev
                </a>
              </p>
            </footer>
            </div>

            {/* Right rail: table of contents (lg+) */}
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <TableOfContents items={tocItems} activeId={activeTocId} onJump={handleJump} />
              </div>
            </aside>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-[calc(100%-3.5rem)] text-text-secondary gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand/15 to-rust/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-brand/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
              className="flex items-center gap-2 px-8 py-3.5 bg-brand text-surface-secondary rounded-full font-bold text-sm shadow-lg hover:bg-brand-hover transition-colors disabled:opacity-50"
            >
              {isFetching ? (
                <>
                  <span className="w-4 h-4 border-2 border-surface-secondary/40 border-t-surface-secondary rounded-full animate-spin" />
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
