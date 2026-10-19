// Fitness tracker: types, scoring rules and week helpers.
// Points are always computed from entries (never stored), so rule tweaks here
// apply retroactively and consistently for everyone.

export type Category = 'upper' | 'lower' | 'core' | 'full' | 'cardio'
export type Intensity = 'easy' | 'medium' | 'hard'
export type Equipment = 'dumbbells' | 'none'

export interface FitGroup {
  id: string
  slug: string
  name: string
}

export interface FitMember {
  id: string
  group_id: string
  user_id: string
  display_name: string
  equipment: Equipment
}

export interface FitMove {
  name: string
  amount: string
}

export interface FitRoutine {
  id: string
  group_id: string
  family: string
  name: string
  category: Category
  minutes: number
  intensity: Intensity
  equipment: Equipment
  rounds: number
  moves: FitMove[]
  notes: string | null
}

export interface FitGoal {
  id: string
  member_id: string
  week_start: string
  goal: number
}

export interface FitEntry {
  id: string
  member_id: string
  routine_id: string | null
  day: string
  title: string
  category: Category
  minutes: number
  intensity: Intensity
  planned: boolean
  completed_at: string | null
}

// ---------------- Rules ----------------

export const CATEGORIES: { key: Category; label: string; emoji: string }[] = [
  { key: 'upper', label: 'Upper Body', emoji: '💪' },
  { key: 'lower', label: 'Lower Body', emoji: '🦵' },
  { key: 'core', label: 'Core', emoji: '🔥' },
  { key: 'full', label: 'Full Body', emoji: '⚡' },
  { key: 'cardio', label: 'Cardio', emoji: '🚶‍♀️' },
]

export const INTENSITY: Record<Intensity, { label: string; multiplier: number; color: string }> = {
  easy: { label: 'Easy', multiplier: 1, color: '#16A34A' },
  medium: { label: 'Medium', multiplier: 1.5, color: '#D97706' },
  hard: { label: 'Hard', multiplier: 2, color: '#DC2626' },
}

export const TIME_OPTIONS = [5, 10, 20] as const

export const STRENGTH_BONUS = 0.2 // +20% for any non-cardio routine
export const STREAK_MIN_DAYS = 3 // bonus kicks in on the 3rd consecutive day...
export const STREAK_BONUS_POINTS = 5 // ...and every day after that the streak continues
export const DEFAULT_GOAL = 100

export function categoryLabel(c: Category): string {
  return CATEGORIES.find((x) => x.key === c)?.label ?? c
}

export function categoryEmoji(c: Category): string {
  return CATEGORIES.find((x) => x.key === c)?.emoji ?? '🏃'
}

export function isStrength(c: Category): boolean {
  return c !== 'cardio'
}

export function entryBasePoints(e: Pick<FitEntry, 'minutes' | 'intensity' | 'category'>): number {
  const base = e.minutes * INTENSITY[e.intensity].multiplier
  const bonus = isStrength(e.category) ? base * STRENGTH_BONUS : 0
  return Math.round(base + bonus)
}

/** Cardio routines need no kit, so they show for everyone. */
export function routineMatchesEquipment(r: FitRoutine, equipment: Equipment): boolean {
  return r.category === 'cardio' || r.equipment === equipment
}

// ---------------- Dates (all local, YYYY-MM-DD) ----------------

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** Monday of the week containing the given date. */
export function weekStartOf(s: string): string {
  const d = parseISODate(s)
  const offset = (d.getDay() + 6) % 7 // Mon=0 ... Sun=6
  d.setDate(d.getDate() - offset)
  return toISODate(d)
}

export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function formatDay(s: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short' }): string {
  return parseISODate(s).toLocaleDateString('en-US', opts)
}

export function formatWeek(weekStart: string): string {
  const start = parseISODate(weekStart)
  const end = parseISODate(addDays(weekStart, 6))
  const sameMonth = start.getMonth() === end.getMonth()
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString('en-US', sameMonth ? { day: 'numeric' } : { month: 'short', day: 'numeric' })
  return `${startStr} - ${endStr}`
}

// ---------------- Scoring ----------------

export interface DayScore {
  day: string
  workoutPoints: number
  streakBonus: number
  streakLength: number
}

/** Per-day points for one member, including streak bonuses (streaks can span weeks). */
export function dailyScores(entries: FitEntry[], memberId: string): Map<string, DayScore> {
  const byDay = new Map<string, number>()
  for (const e of entries) {
    if (e.member_id !== memberId || !e.completed_at) continue
    byDay.set(e.day, (byDay.get(e.day) ?? 0) + entryBasePoints(e))
  }

  const result = new Map<string, DayScore>()
  const days = Array.from(byDay.keys()).sort()
  let prev: string | null = null
  let streak = 0
  for (const day of days) {
    streak = prev && addDays(prev, 1) === day ? streak + 1 : 1
    result.set(day, {
      day,
      workoutPoints: byDay.get(day) ?? 0,
      streakBonus: streak >= STREAK_MIN_DAYS ? STREAK_BONUS_POINTS : 0,
      streakLength: streak,
    })
    prev = day
  }
  return result
}

/** Current streak in days (still alive if the last workout was today or yesterday). */
export function currentStreak(entries: FitEntry[], memberId: string, today = todayISO()): number {
  const scores = dailyScores(entries, memberId)
  const last = scores.get(today) ?? scores.get(addDays(today, -1))
  return last?.streakLength ?? 0
}

export function goalFor(goals: FitGoal[], memberId: string, weekStart: string): number {
  const mine = goals
    .filter((g) => g.member_id === memberId && g.week_start <= weekStart)
    .sort((a, b) => b.week_start.localeCompare(a.week_start))
  return mine[0]?.goal ?? DEFAULT_GOAL
}

export interface WeekSummary {
  memberId: string
  weekStart: string
  points: number
  streakBonus: number
  goal: number
  pct: number
  plannedCount: number
  plannedDone: number
  unplannedDone: number
  completedCount: number
  minutes: number
  doneCategories: Category[]
  skippedCategories: Category[] // no completed workout this week
  plannedButSkipped: Category[] // planned at least once, never completed
}

export function weekSummary(
  entries: FitEntry[],
  goals: FitGoal[],
  memberId: string,
  weekStart: string,
  scores = dailyScores(entries, memberId)
): WeekSummary {
  const days = new Set(weekDays(weekStart))
  const mine = entries.filter((e) => e.member_id === memberId && days.has(e.day))
  const done = mine.filter((e) => e.completed_at)
  const planned = mine.filter((e) => e.planned)

  let points = 0
  let streakBonus = 0
  for (const day of days) {
    const s = scores.get(day)
    if (!s) continue
    points += s.workoutPoints + s.streakBonus
    streakBonus += s.streakBonus
  }

  const goal = goalFor(goals, memberId, weekStart)
  const doneCats = new Set(done.map((e) => e.category))
  const plannedCats = new Set(planned.map((e) => e.category))

  return {
    memberId,
    weekStart,
    points,
    streakBonus,
    goal,
    pct: goal > 0 ? Math.round((points / goal) * 100) : 0,
    plannedCount: planned.length,
    plannedDone: planned.filter((e) => e.completed_at).length,
    unplannedDone: done.filter((e) => !e.planned).length,
    completedCount: done.length,
    minutes: done.reduce((sum, e) => sum + e.minutes, 0),
    doneCategories: CATEGORIES.map((c) => c.key).filter((c) => doneCats.has(c)),
    skippedCategories: CATEGORIES.map((c) => c.key).filter((c) => !doneCats.has(c)),
    plannedButSkipped: CATEGORIES.map((c) => c.key).filter((c) => plannedCats.has(c) && !doneCats.has(c)),
  }
}

/** Head-to-head winner by % of goal; null on a tie or if nobody scored. */
export function weekWinner(summaries: WeekSummary[]): string | null {
  const scored = summaries.filter((s) => s.points > 0)
  if (scored.length === 0) return null
  const best = Math.max(...scored.map((s) => s.pct))
  const leaders = scored.filter((s) => s.pct === best)
  return leaders.length === 1 ? leaders[0].memberId : null
}

/** All week starts from the first entry/goal up to (and including) the given week. */
export function weeksWithActivity(entries: FitEntry[], goals: FitGoal[], upTo: string): string[] {
  const starts = [
    ...entries.map((e) => weekStartOf(e.day)),
    ...goals.map((g) => g.week_start),
  ].filter((w) => w <= upTo)
  if (starts.length === 0) return [upTo]
  const first = starts.sort()[0]
  const weeks: string[] = []
  for (let w = first; w <= upTo; w = addDays(w, 7)) weeks.push(w)
  return weeks
}
