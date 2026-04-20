import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Types (unchanged) ──────────────────────────────────────────────
export interface Briefing {
  id: string
  title: string
  content: string
  date: string      // YYYY-MM-DD
  createdAt: number  // epoch ms
}

// ── Database initialisation ────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(__dirname, '../../data')
mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(resolve(DATA_DIR, 'news.db'))
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS briefings (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL,
    date       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_briefings_date ON briefings(date);

  CREATE TABLE IF NOT EXISTS daily_questions (
    date      TEXT PRIMARY KEY,
    questions TEXT NOT NULL
  );
`)

// ── Prepared statements ────────────────────────────────────────────
const stmts = {
  allBriefings: db.prepare(
    'SELECT id, title, date, created_at as createdAt FROM briefings ORDER BY date DESC'
  ),
  getBriefing: db.prepare(
    'SELECT id, title, content, date, created_at as createdAt FROM briefings WHERE id = ?'
  ),
  getBriefingByDate: db.prepare(
    'SELECT id, title, content, date, created_at as createdAt FROM briefings WHERE date = ?'
  ),
  insertBriefing: db.prepare(
    'INSERT INTO briefings (id, title, content, date, created_at) VALUES (@id, @title, @content, @date, @createdAt)'
  ),
  updateBriefing: db.prepare(
    'UPDATE briefings SET title = @title, content = @content, date = @date WHERE id = @id'
  ),
  deleteBriefing: db.prepare(
    'DELETE FROM briefings WHERE id = ?'
  ),
  getQuestions: db.prepare(
    'SELECT questions FROM daily_questions WHERE date = ?'
  ),
  upsertQuestions: db.prepare(
    'INSERT OR REPLACE INTO daily_questions (date, questions) VALUES (?, ?)'
  ),
}

// ── Exported functions (same signatures as before) ─────────────────

export function getAllBriefings(): Omit<Briefing, 'content'>[] {
  return stmts.allBriefings.all() as Omit<Briefing, 'content'>[]
}

export function getBriefing(id: string): Briefing | undefined {
  return (stmts.getBriefing.get(id) as Briefing) ?? undefined
}

export function createBriefing(data: { title: string; content: string; date: string }): Briefing {
  const briefing: Briefing = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: Date.now(),
  }
  stmts.insertBriefing.run(briefing)
  return briefing
}

export function updateBriefing(
  id: string,
  data: Partial<{ title: string; content: string; date: string }>
): Briefing | null {
  const existing = getBriefing(id)
  if (!existing) return null
  const updated = { ...existing, ...data }
  stmts.updateBriefing.run(updated)
  return updated
}

export function deleteBriefing(id: string): boolean {
  const result = stmts.deleteBriefing.run(id)
  return result.changes > 0
}

export function getBriefingByDate(date: string): Briefing | undefined {
  return (stmts.getBriefingByDate.get(date) as Briefing) ?? undefined
}

export function getDailyQuestions(date: string): string[] | undefined {
  const row = stmts.getQuestions.get(date) as { questions: string } | undefined
  if (!row) return undefined
  return JSON.parse(row.questions) as string[]
}

export function setDailyQuestions(date: string, questions: string[]): void {
  stmts.upsertQuestions.run(date, JSON.stringify(questions))
}
