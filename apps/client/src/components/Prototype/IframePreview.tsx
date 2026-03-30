import { useState, useRef, useImperativeHandle, forwardRef } from 'react'

export interface IframePreviewHandle {
  extractDOMInfo: () => string
}

interface IframePreviewProps {
  htmlContent: string
  onQuickEdit?: (instruction: string) => void
}

const VIEWPORT_PRESETS = [
  { name: '手机', width: 375, icon: '📱' },
  { name: '平板', width: 768, icon: '📟' },
  { name: '桌面', width: 0, icon: '🖥️' }, // 0 = full width
]

const QUICK_EDITS = [
  { label: '放大字号', instruction: '把页面整体字号放大一号，标题和正文都适当增大' },
  { label: '换配色', instruction: '换一套更现代的配色方案，保持整体和谐' },
  { label: '加间距', instruction: '增加各区块之间的间距，让页面更透气' },
  { label: '加动效', instruction: '给按钮和卡片添加简单的 hover 动效和过渡动画' },
  { label: '深色模式', instruction: '把整个页面改为深色模式，使用深色背景和浅色文字' },
]

function IframePreviewInner({ htmlContent, onQuickEdit }: IframePreviewProps, ref: React.Ref<IframePreviewHandle>) {
  const [viewportWidth, setViewportWidth] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useImperativeHandle(ref, () => ({
    extractDOMInfo: () => {
      const iframe = iframeRef.current
      if (!iframe) return '{"error": "iframe not available"}'
      try {
        const doc = iframe.contentDocument
        if (!doc) return '{"error": "cannot access iframe document"}'
        const body = doc.body
        return JSON.stringify({
          title: doc.title || '',
          bodyText: body?.innerText?.slice(0, 1000) || '',
          links: Array.from(doc.querySelectorAll('a')).slice(0, 20).map(a => a.textContent?.trim()),
          buttons: Array.from(doc.querySelectorAll('button')).slice(0, 20).map(b => b.textContent?.trim()),
          images: Array.from(doc.querySelectorAll('img')).slice(0, 10).map(i => ({ alt: i.alt, src: i.src?.slice(0, 100) })),
          sections: Array.from(doc.querySelectorAll('section, header, nav, main, footer, [class*="container"]'))
            .slice(0, 15)
            .map(el => ({
              tag: el.tagName.toLowerCase(),
              id: el.id || undefined,
              className: el.className?.toString().slice(0, 80),
              height: (el as HTMLElement).offsetHeight,
              visible: (el as HTMLElement).offsetHeight > 0,
            })),
          overflowCount: Array.from(doc.querySelectorAll('*'))
            .filter(el => el.scrollWidth > el.clientWidth + 2).length,
          viewport: { width: body?.scrollWidth, height: body?.scrollHeight },
        })
      } catch {
        return '{"error": "DOM extraction failed"}'
      }
    },
  }))

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prototype.html'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleOpenInNewWindow = () => {
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(htmlContent)
      win.document.close()
    }
  }

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(htmlContent)
  }

  if (!htmlContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-secondary">
        <span className="text-4xl mb-3">🖥️</span>
        <span className="text-sm">描述你的需求，Agent 将生成可运行的 HTML 原型</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface">
        {/* Viewport presets */}
        <div className="flex items-center gap-1 mr-2">
          {VIEWPORT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => setViewportWidth(preset.width)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                viewportWidth === preset.width
                  ? 'bg-brand text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-gray-100'
              }`}
              title={preset.name + (preset.width ? ` (${preset.width}px)` : '')}
            >
              {preset.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-border" />

        <button
          onClick={handleDownload}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-brand transition-colors"
        >
          下载 HTML
        </button>
        <button
          onClick={handleOpenInNewWindow}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-brand transition-colors"
        >
          在新窗口打开
        </button>
        <button
          onClick={handleCopyCode}
          className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary border border-border rounded-lg hover:border-brand transition-colors"
        >
          复制代码
        </button>

        {/* Quick edit buttons */}
        {onQuickEdit && (
          <>
            <div className="w-px h-4 bg-border" />
            {QUICK_EDITS.map((edit) => (
              <button
                key={edit.label}
                onClick={() => onQuickEdit(edit.instruction)}
                className="px-2 py-1 text-xs text-text-secondary hover:text-brand hover:bg-brand/5 rounded transition-colors"
              >
                {edit.label}
              </button>
            ))}
          </>
        )}
      </div>

      {/* iframe container */}
      <div className="flex-1 min-h-0 flex justify-center bg-gray-50">
        <div
          className="h-full bg-white transition-all duration-300"
          style={{
            width: viewportWidth > 0 ? `${viewportWidth}px` : '100%',
            boxShadow: viewportWidth > 0 ? '0 0 20px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          <iframe
            srcDoc={htmlContent}
            ref={iframeRef}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0"
            title="Prototype Preview"
          />
        </div>
      </div>
    </div>
  )
}

const IframePreview = forwardRef(IframePreviewInner)
export default IframePreview
