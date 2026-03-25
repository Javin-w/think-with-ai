export default function NewsTicker() {
  return (
    <div className="border-t border-border bg-white px-6 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <span className="text-xs font-medium text-[#4CAF50] bg-green-50 px-2 py-0.5 rounded shrink-0">
          今日 AI 快讯
        </span>
        <p className="text-xs text-text-secondary truncate">
          GPT-5 发布，多模态能力大幅提升 · Anthropic 推出 Claude 企业版 · 国内大模型竞争加剧
        </p>
      </div>
    </div>
  )
}
