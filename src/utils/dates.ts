export function weekBounds(weekStr: string): { start: string; end: string } {
  const [year, week] = weekStr.split("-W").map(Number)
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const start = new Date(startOfWeek1)
  start.setDate(startOfWeek1.getDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export function currentWeekStr(): string {
  const now = new Date()
  const year = now.getFullYear()
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const daysDiff = Math.floor(
    (now.getTime() - startOfWeek1.getTime()) / (1000 * 60 * 60 * 24),
  )
  const week = Math.floor(daysDiff / 7) + 1
  return `${year}-W${String(week).padStart(2, "0")}`
}

export function computeDailyScores(
  rows: { date: string; score: number; tag: string }[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const current = map.get(row.date) ?? 0
    if (row.tag === "positive") map.set(row.date, current + row.score)
    else if (row.tag === "negative") map.set(row.date, current - row.score)
    else map.set(row.date, current)
  }
  return map
}
