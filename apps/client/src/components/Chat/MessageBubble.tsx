import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import type { ChatMessage } from '@repo/types'
import { preprocessLatex } from '../../utils/preprocessLatex'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%] bg-brand/15 border border-brand/20 rounded-lg px-4 py-3 text-sm text-text-primary">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <div
        data-testid="assistant-message"
        className="max-w-[90%] bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary"
      >
        <div className="prose prose-invert prose-sm max-w-none prose-p:text-text-primary prose-strong:text-text-primary prose-code:text-brand prose-a:text-brand">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeHighlight, rehypeKatex]}
            components={{
              code({ className, children, ...props }: any) {
                const isBlock = className?.includes('language-')
                if (isBlock) {
                  return (
                    <code
                      className={`${className} font-mono text-sm bg-code-bg rounded block p-3 overflow-x-auto`}
                      {...props}
                    >
                      {children}
                    </code>
                  )
                }
                return (
                  <code className="font-mono text-sm bg-code-bg text-code-text rounded px-1" {...props}>
                    {children}
                  </code>
                )
              },
              pre({ children }: any) {
                return <pre className="bg-code-bg rounded-lg overflow-x-auto my-2">{children}</pre>
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
