export function computeStreakFull(dates: string[]): {
  currentStreak: number
  longestStreak: number
  lastEntryDate: string | null
  strengthPercent: number
  daysSinceEntry: number | null
} {
  if (dates.length === 0)
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastEntryDate: null,
      strengthPercent: 0,
      daysSinceEntry: null,
    }

  const sorted = [...new Set(dates)].sort()
  const todayStr = new Date().toISOString().slice(0, 10)
  const lastEntry = sorted[sorted.length - 1]

  const daysSinceLast = Math.floor(
    (new Date(todayStr).getTime() - new Date(lastEntry).getTime()) /
    (1000 * 60 * 60 * 24),
  )

  // Compute longest streak from history
  let longestStreak = 1
  let runLength = 1
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.floor(
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) /
      (1000 * 60 * 60 * 24),
    )
    if (gap <= 2) {
      runLength++
      longestStreak = Math.max(longestStreak, runLength)
    } else {
      runLength = 1
    }
  }

  if (daysSinceLast > 3) {
    return {
      currentStreak: 0,
      longestStreak,
      lastEntryDate: lastEntry,
      strengthPercent: 0,
      daysSinceEntry: daysSinceLast,
    }
  }

  // Compute current streak going backwards
  let currentStreak = 1
  for (let i = sorted.length - 2; i >= 0; i--) {
    const gap = Math.floor(
      (new Date(sorted[i + 1]).getTime() - new Date(sorted[i]).getTime()) /
      (1000 * 60 * 60 * 24),
    )
    if (gap <= 2) currentStreak++
    else break
  }

  // Gradual decay: 16.1
  // daysSinceLast=0 (logged today) or 1 (grace) → 100%
  // daysSinceLast=2 → 80%
  // daysSinceLast=3 → 50%
  let strengthPercent = 100
  if (daysSinceLast === 2) strengthPercent = 80
  else if (daysSinceLast === 3) strengthPercent = 50

  return {
    currentStreak,
    longestStreak,
    lastEntryDate: lastEntry,
    strengthPercent,
    daysSinceEntry: daysSinceLast,
  }
}

export function computeScoreStreak(
  dailyScores: Map<string, number>,
  avg30: number,
): {
  currentScoreStreak: number
  longestScoreStreak: number
} {
  const sortedDates = [...dailyScores.keys()].sort()
  const todayStr = new Date().toISOString().slice(0, 10)

  let currentScoreStreak = 0
  // Go backwards from today
  const cursor = new Date(todayStr)
  for (let i = 0; i < 365; i++) {
    const dateStr = cursor.toISOString().slice(0, 10)
    const score = dailyScores.get(dateStr)
    if (score === undefined) break
    if (score > avg30) currentScoreStreak++
    else break
    cursor.setDate(cursor.getDate() - 1)
  }

  let longestScoreStreak = 0
  let run = 0
  for (const date of sortedDates) {
    const score = dailyScores.get(date) ?? 0
    if (score > avg30) {
      run++
      longestScoreStreak = Math.max(longestScoreStreak, run)
    } else {
      run = 0
    }
  }

  return { currentScoreStreak, longestScoreStreak }
}
