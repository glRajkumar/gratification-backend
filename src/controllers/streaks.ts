import { eq } from "drizzle-orm"
import type { Context } from "hono"
import { db } from "../lib/db"
import { journalPoints } from "../db/schema/app"
import type { AppEnv } from "../types/hono"
import { checkStreakAchievements } from "../utils/achievements"

function computeStreaks(dates: string[]): {
  currentStreak: number
  longestStreak: number
  lastEntryDate: string | null
} {
  if (dates.length === 0)
    return { currentStreak: 0, longestStreak: 0, lastEntryDate: null }

  const sorted = [...new Set(dates)].sort()
  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10)

  const lastEntry = sorted[sorted.length - 1]

  // If the last entry is older than yesterday, streak is 0 (grace period: can miss 1 day)
  const daysSinceLast = Math.floor(
    (new Date(todayStr).getTime() - new Date(lastEntry).getTime()) /
      (1000 * 60 * 60 * 24),
  )
  if (daysSinceLast > 2) {
    // Compute longest streak from history even if current is 0
    let longest = 1
    let current = 1
    for (let i = sorted.length - 2; i >= 0; i--) {
      const gap = Math.floor(
        (new Date(sorted[i + 1]).getTime() - new Date(sorted[i]).getTime()) /
          (1000 * 60 * 60 * 24),
      )
      if (gap <= 2) {
        current++
        longest = Math.max(longest, current)
      } else {
        current = 1
      }
    }
    return { currentStreak: 0, longestStreak: longest, lastEntryDate: lastEntry }
  }

  // Compute current streak going backwards from last entry
  let currentStreak = 1
  for (let i = sorted.length - 2; i >= 0; i--) {
    const gap = Math.floor(
      (new Date(sorted[i + 1]).getTime() - new Date(sorted[i]).getTime()) /
        (1000 * 60 * 60 * 24),
    )
    if (gap <= 2) {
      currentStreak++
    } else {
      break
    }
  }

  // Compute longest streak
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

  return { currentStreak, longestStreak, lastEntryDate: lastEntry }
}

export async function getStreaks(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const rows = await db
    .select({ date: journalPoints.date })
    .from(journalPoints)
    .where(eq(journalPoints.userId, userId))

  const dates = rows.map((r) => r.date)
  const { currentStreak, longestStreak, lastEntryDate } = computeStreaks(dates)

  // Fire and forget achievement checks
  void checkStreakAchievements(userId, currentStreak)

  const milestones = [7, 14, 30, 60, 100, 365]
  const nextMilestone = milestones.find((m) => m > currentStreak) ?? null

  return c.json({
    currentStreak,
    longestStreak,
    lastEntryDate,
    nextMilestone,
  })
}
