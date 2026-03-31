/**
 * Clean scraped content by removing non-news noise (ads, promos, navigation).
 * Uses simple regex instead of AI to avoid output truncation issues.
 */
export function refineBriefing(rawContent: string): string {
  let content = rawContent

  // Remove social media / channel promotion blocks
  const noisePatterns = [
    /#+\s*(多渠道|AI资讯日报多渠道)[^\n]*\n[\s\S]*$/im,  // "多渠道信息" section at end
    /\*{0,2}微信公众号\*{0,2}[：:].*/gi,
    /\*{0,2}抖音\*{0,2}[：:].*/gi,
    /\*{0,2}小宇宙\*{0,2}[：:].*/gi,
    /进群交流[^\n]*/gi,
    /加入社区[^\n]*/gi,
    /访问网页版[^\n]*/gi,
    /扫码关注[^\n]*/gi,
    /!\[.*?二维码.*?\]\(.*?\)/gi,  // QR code images
    /\[.*?进群.*?\]\(.*?\)/gi,     // group invite links
    />\s*[""\u201c].*?(AI资讯|每日早读|全网数据聚合|前沿科学探索|行业自由发声|开源创新力量|AI与人类未来|访问网页版|进群交流).*?[""\u201d]\s*\n*/gi, // tag blockquotes
  ]

  for (const pattern of noisePatterns) {
    content = content.replace(pattern, '')
  }

  // Clean up excessive blank lines
  content = content.replace(/\n{3,}/g, '\n\n').trim()

  console.log(`[refiner] Cleaned ${rawContent.length} → ${content.length} chars`)
  return content
}
