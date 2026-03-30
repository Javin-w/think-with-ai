import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import type { ChatMessage } from '@repo/types'

function preprocessLatex(content: string): string {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n')
    .replace(/\\\(([\s\S]*?)\\\)/g, ' $$$1$$ ')
}

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-slate-100 rounded-lg px-4 py-3 text-sm text-text-primary">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <div
        data-testid="assistant-message"
        className="max-w-[90%] bg-white border border-border rounded-lg px-4 py-3 text-sm text-text-primary"
      >
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
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
            {preprocessLatex(message.content)}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
