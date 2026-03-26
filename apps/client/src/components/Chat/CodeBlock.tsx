import { useState, type ReactNode } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  language?: string
  rawText: string
  children: ReactNode
}

export default function CodeBlock({ language, rawText, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl overflow-hidden my-4">
      <div className="flex justify-between items-center px-4 py-2 text-xs bg-code-header text-code-text/70">
        <span>{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-code-text transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto text-sm font-mono bg-code-bg text-code-text">
        <pre className="!m-0 !p-0 !bg-transparent">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  )
}
