import { Fragment, useState, type ReactNode } from 'react'
import type { SearchCitation } from '@repo/types'

interface CitationListProps {
  messageId: string
  citations: SearchCitation[]
}

const COLLAPSED_LIMIT = 4

/**
 * Render the source cards list under an assistant message.
 * Each card has an id `cite-{messageId}-{n}` so superscript [N] markers
 * inside the answer can scroll-jump to it.
 */
export function CitationList({ messageId, citations }: CitationListProps) {
  const [expanded, setExpanded] = useState(false)
  if (citations.length === 0) return null
  const sorted = [...citations].sort((a, b) => a.n - b.n)
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_LIMIT)
  const hiddenCount = sorted.length - visible.length

  return (
    <section className="mt-5 pt-4 border-t border-border/40">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-3">
        来源 · {sorted.length}
      </p>
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map(c => (
          <li
            key={c.n}
            id={`cite-${messageId}-${c.n}`}
            className="transition-shadow"
          >
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg border border-border/40 hover:border-brand/40 hover:bg-surface transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                <span className="text-[10px] font-mono font-bold text-brand shrink-0">[{c.n}]</span>
                {c.favicon ? (
                  <img
                    src={c.favicon}
                    alt=""
                    className="w-3.5 h-3.5 rounded-sm shrink-0"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                ) : null}
                <span className="text-[11px] text-text-secondary truncate min-w-0">
                  {c.siteName || hostname(c.url)}
                </span>
                {c.datePublished && (
                  <span className="text-[10px] text-text-secondary/50 shrink-0">
                    {c.datePublished.slice(0, 10)}
                  </span>
                )}
              </div>
              <p className="text-[13px] font-medium leading-snug text-text-primary line-clamp-2">
                {c.title}
              </p>
              {c.snippet && (
                <p className="text-[12px] text-text-secondary/80 line-clamp-2 mt-1.5 leading-snug">
                  {c.snippet}
                </p>
              )}
            </a>
          </li>
        ))}
      </ol>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 text-[11px] text-text-secondary hover:text-brand transition-colors"
        >
          展开 +{hiddenCount} 条更多来源
        </button>
      )}
    </section>
  )
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/**
 * Walk a React node tree and replace `[N]` text markers with clickable
 * superscript links that scroll to the citation card with id
 * `cite-{messageId}-{n}`. Markers without a matching citation are left
 * as plain text.
 */
export function injectCitationMarkers(
  node: ReactNode,
  citations: SearchCitation[],
  messageId: string,
): ReactNode {
  if (citations.length === 0) return node
  const known = new Set(citations.map(c => c.n))

  const walk = (n: ReactNode, keyPrefix: string): ReactNode => {
    if (typeof n === 'string') return replaceInString(n, known, messageId, keyPrefix)
    if (Array.isArray(n)) {
      return n.map((child, i) => (
        <Fragment key={`${keyPrefix}-${i}`}>{walk(child, `${keyPrefix}-${i}`)}</Fragment>
      ))
    }
    return n
  }

  return walk(node, 'c')
}

function replaceInString(
  text: string,
  knownNumbers: Set<number>,
  messageId: string,
  keyPrefix: string,
): ReactNode {
  const re = /\[(\d+)\]/g
  const parts: ReactNode[] = []
  let lastIdx = 0
  let m: RegExpExecArray | null
  let partKey = 0
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1])
    if (!knownNumbers.has(n)) continue
    if (m.index > lastIdx) {
      parts.push(text.slice(lastIdx, m.index))
    }
    const targetId = `cite-${messageId}-${n}`
    parts.push(
      <sup
        key={`${keyPrefix}-${partKey++}-${n}`}
        className="inline-block mx-0.5"
      >
        <a
          href={`#${targetId}`}
          onClick={(e) => {
            e.preventDefault()
            const el = document.getElementById(targetId)
            if (!el) return
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            el.classList.add('ring-2', 'ring-brand/60', 'rounded-lg')
            setTimeout(() => el.classList.remove('ring-2', 'ring-brand/60'), 1500)
          }}
          className="px-1 py-px text-[10px] font-mono font-bold text-brand bg-brand/10 hover:bg-brand/20 rounded transition-colors no-underline"
        >
          {n}
        </a>
      </sup>
    )
    lastIdx = m.index + m[0].length
  }
  if (parts.length === 0) return text
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  return parts
}
