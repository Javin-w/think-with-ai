interface IframePreviewProps {
  htmlContent: string
}

export default function IframePreview({ htmlContent }: IframePreviewProps) {
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
        <span className="text-sm">描述你的需求，AI 将生成可运行的 HTML 原型</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface">
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
      </div>

      {/* iframe */}
      <div className="flex-1 min-h-0">
        <iframe
          srcDoc={htmlContent}
          sandbox="allow-scripts"
          className="w-full h-full border-0"
          title="Prototype Preview"
        />
      </div>
    </div>
  )
}
