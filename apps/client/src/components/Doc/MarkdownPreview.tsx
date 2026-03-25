import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface MarkdownPreviewProps {
  content: string
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'document.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary">
        <span className="text-4xl mb-3">📄</span>
        <span className="text-sm">开始对话，AI 将为你生成文档</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface">
        <button
          onClick={handleCopy}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-brand transition-colors"
        >
          复制全文
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-brand transition-colors"
        >
          导出 .md
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              code({ className, children, ...props }: any) {
                const isBlock = className?.includes('language-')
                if (isBlock) {
                  return (
                    <code
                      className={`${className} font-mono text-sm bg-slate-50 rounded block p-3 overflow-x-auto`}
                      {...props}
                    >
                      {children}
                    </code>
                  )
                }
                return (
                  <code className="font-mono text-sm bg-slate-100 rounded px-1" {...props}>
                    {children}
                  </code>
                )
              },
              pre({ children }: any) {
                return <pre className="bg-slate-50 rounded-lg overflow-x-auto my-2">{children}</pre>
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
