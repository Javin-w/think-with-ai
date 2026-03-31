/**
 * Clean scraped content by removing non-news noise (ads, promos, navigation).
 * Uses simple regex instead of AI to avoid output truncation issues.
 */
export function refineBriefing(rawContent: string): string {
  let content = rawContent

  // Remove social media / channel promotion blocks
  const noisePatterns = [
    /#+\s*\**\s*(多渠道|AI资讯日报多渠道)[^\n]*\n[\s\S]*$/im,  // "多渠道信息" section and everything after
    /\*{0,2}微信公众号\*{0,2}[：:].*/gi,
    /\*{0,2}抖音\*{0,2}[：:].*/gi,
    /\*{0,2}小宇宙\*{0,2}[：:].*/gi,
    /进群交流[^\n]*/gi,
    /加入社区[^\n]*/gi,
    /访问网页版[^\n]*/gi,
    /扫码关注[^\n]*/gi,
    /!\[.*?二维码.*?\]\(.*?\)/gi,  // QR code images
    /\[.*?进群.*?\]\(.*?\)/gi,     // group invite links
    />\s*[""\u201c].*?(AI资讯|每日早读|全网数据聚合|前沿科学探索|行业自由发声|开源创新力量|AI与人类未来|访问网页版|进群交流).*?[""\u201d].*\n*/gi, // tag blockquotes
    /<!--\s*来源:.*?-->\s*\n*/gi,  // source comments
    /[""\u201c]\s*`?AI资讯`?\s*[|｜].*?[""\u201d].*\n*/gi,  // tag line without blockquote marker
    /`AI资讯`\s*[|｜]\s*`每日早读`.*\n*/gi,  // backtick-formatted tag line
  ]

  for (const pattern of noisePatterns) {
    content = content.replace(pattern, '')
  }

  // In numbered/bulleted lists, split "**Title.**Description" so title is on its own line
  content = content.replace(
    /^(\s*\d+\.\s+)\*\*(.+?[。！？.!?])\*\*/gm,
    '$1**$2**<br>'
  )

  // Clean up excessive blank lines
  content = content.replace(/\n{3,}/g, '\n\n').trim()

  console.log(`[refiner] Cleaned ${rawContent.length} → ${content.length} chars`)
  return content
}
