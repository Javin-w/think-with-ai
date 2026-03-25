import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

export function createModelInstance(provider?: string, model?: string) {
  const aiProvider = provider ?? process.env.AI_PROVIDER ?? 'openai'
  const aiModel = model ?? process.env.AI_MODEL ?? 'moonshot-v1-128k'

  if (aiProvider === 'anthropic') {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    return anthropic(aiModel)
  }

  if (aiProvider === 'moonshot') {
    const moonshot = createOpenAI({
      apiKey: process.env.MOONSHOT_API_KEY,
      baseURL: 'https://api.moonshot.cn/v1',
    })
    return moonshot(aiModel)
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai(aiModel)
}
