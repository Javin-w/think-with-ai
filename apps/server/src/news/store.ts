export interface Briefing {
  id: string
  title: string
  content: string
  date: string
  createdAt: number
}

const briefings = new Map<string, Briefing>()

export function getAllBriefings(): Omit<Briefing, 'content'>[] {
  return Array.from(briefings.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ content, ...rest }) => rest)
}

export function getBriefing(id: string): Briefing | undefined {
  return briefings.get(id)
}

export function createBriefing(data: { title: string; content: string; date: string }): Briefing {
  const briefing: Briefing = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: Date.now(),
  }
  briefings.set(briefing.id, briefing)
  return briefing
}

export function updateBriefing(id: string, data: Partial<{ title: string; content: string; date: string }>): Briefing | null {
  const existing = briefings.get(id)
  if (!existing) return null
  const updated = { ...existing, ...data }
  briefings.set(id, updated)
  return updated
}

export function deleteBriefing(id: string): boolean {
  return briefings.delete(id)
}

export function getBriefingByDate(date: string): Briefing | undefined {
  return Array.from(briefings.values()).find((b) => b.date === date)
}

// Daily questions cache
const dailyQuestions = new Map<string, string[]>()

export function getDailyQuestions(date: string): string[] | undefined {
  return dailyQuestions.get(date)
}

export function setDailyQuestions(date: string, questions: string[]): void {
  dailyQuestions.set(date, questions)
}
