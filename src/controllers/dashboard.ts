import { and, eq, gte, lte } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"
import { journalPoints } from "../db/schema"
import { db } from "../lib/db"

function computeDailyScores(
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

export async function getDashboardContext(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10)

  // 30-day window for context
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const fromStr = thirtyDaysAgo.toISOString().slice(0, 10)

  const rows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
    })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, fromStr),
        lte(journalPoints.date, todayStr),
      ),
    )

  const dateMap = computeDailyScores(rows)
  const yesterdayScore = dateMap.get(yesterdayStr)

  // Streak computation
  const allDates = await db
    .select({ date: journalPoints.date })
    .from(journalPoints)
    .where(eq(journalPoints.userId, userId))
  const uniqueDates = [...new Set(allDates.map((r) => r.date))].sort()
  const lastEntry = uniqueDates[uniqueDates.length - 1] ?? null
  let currentStreak = 0
  if (lastEntry) {
    const daysSinceLast = Math.floor(
      (new Date(todayStr).getTime() - new Date(lastEntry).getTime()) /
      (1000 * 60 * 60 * 24),
    )
    if (daysSinceLast <= 2) {
      currentStreak = 1
      for (let i = uniqueDates.length - 2; i >= 0; i--) {
        const gap = Math.floor(
          (new Date(uniqueDates[i + 1]).getTime() -
            new Date(uniqueDates[i]).getTime()) /
          (1000 * 60 * 60 * 24),
        )
        if (gap <= 2) currentStreak++
        else break
      }
    }
  }

  // Last entry date
  const daysSinceEntry = lastEntry
    ? Math.floor(
      (new Date(todayStr).getTime() - new Date(lastEntry).getTime()) /
      (1000 * 60 * 60 * 24),
    )
    : null

  // 7-day rolling average (last 7 days excluding today)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i - 1)
    return d.toISOString().slice(0, 10)
  })
  const last7Scores = last7.map((d) => dateMap.get(d) ?? 0)
  const avg7 = last7Scores.reduce((a, b) => a + b, 0) / 7

  // Previous 7 days (days 8-14 ago)
  const prev7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i - 8)
    return d.toISOString().slice(0, 10)
  })
  const prev7Scores = prev7.map((d) => dateMap.get(d) ?? 0)
  const avgPrev7 = prev7Scores.reduce((a, b) => a + b, 0) / 7

  const trendImproving = avg7 > avgPrev7

  // Determine greeting type and variants
  type GreetingKey =
    | "positive_yesterday"
    | "long_streak"
    | "improving_trend"
    | "returning"
    | "welcome"

  let greetingKey: GreetingKey = "welcome"
  const greetingData: Record<string, unknown> = {}

  if (daysSinceEntry !== null && daysSinceEntry >= 3) {
    greetingKey = "returning"
  } else if (currentStreak >= 7) {
    greetingKey = "long_streak"
    greetingData.streak = currentStreak
  } else if (yesterdayScore !== undefined && yesterdayScore > 0) {
    greetingKey = "positive_yesterday"
    greetingData.score = yesterdayScore
  } else if (trendImproving) {
    greetingKey = "improving_trend"
    greetingData.avg7 = Math.round(avg7 * 10) / 10
  }

  const greetingVariants: Record<GreetingKey, string[]> = {
    positive_yesterday: [
      `Good start. You scored +${greetingData.score} yesterday.`,
      `Yesterday was a +${greetingData.score} day. Let's build on it.`,
      `+${greetingData.score} yesterday — solid. What's on your mind today?`,
    ],
    long_streak: [
      `Day ${greetingData.streak} of your streak. Keep it going.`,
      `${greetingData.streak} days in a row. That's consistency.`,
      `Your ${greetingData.streak}-day streak is still alive. Don't break it.`,
    ],
    improving_trend: [
      `Your last 7 days averaged ${greetingData.avg7}. A strong stretch.`,
      `Trending up. Last week averaged ${greetingData.avg7}.`,
      `Good momentum — ${greetingData.avg7} average this past week.`,
    ],
    returning: [
      "Good to see you. What's on your mind?",
      "Welcome back. Ready to log?",
      "You've been away a few days. No pressure — what happened?",
    ],
    welcome: [
      "What kind of day is today shaping up to be?",
      "Ready to capture today.",
      "How's your day going?",
    ],
  }

  const variants = greetingVariants[greetingKey]
  const greeting = variants[Math.floor(Math.random() * variants.length)]

  // Score floor: compare worst day this month vs last month
  const now = new Date()
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStartStr = lastMonthStart.toISOString().slice(0, 10)
  const lastMonthEndStr = lastMonthEnd.toISOString().slice(0, 10)

  const thisMonthRows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
    })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, thisMonthStart),
        lte(journalPoints.date, todayStr),
      ),
    )

  const lastMonthRows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
    })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, lastMonthStartStr),
        lte(journalPoints.date, lastMonthEndStr),
      ),
    )

  const thisMonthDailyScores = computeDailyScores(thisMonthRows)
  const lastMonthDailyScores = computeDailyScores(lastMonthRows)

  let scoreFloor: {
    thisMonthWorst: number
    lastMonthWorst: number
    improved: boolean
    diff: number
  } | null = null

  if (thisMonthDailyScores.size > 0 && lastMonthDailyScores.size > 0) {
    const thisMonthWorst = Math.min(...thisMonthDailyScores.values())
    const lastMonthWorst = Math.min(...lastMonthDailyScores.values())
    if (thisMonthWorst > lastMonthWorst) {
      scoreFloor = {
        thisMonthWorst,
        lastMonthWorst,
        improved: true,
        diff: thisMonthWorst - lastMonthWorst,
      }
    }
  }

  // Today's 30-day average (for score-gated prompts on frontend)
  const allDailyScores = [...dateMap.values()]
  const avg30 =
    allDailyScores.length > 0
      ? allDailyScores.reduce((a, b) => a + b, 0) / allDailyScores.length
      : 0

  return c.json({
    greeting,
    greetingKey,
    currentStreak,
    daysSinceEntry,
    avg7: Math.round(avg7 * 10) / 10,
    avg30: Math.round(avg30 * 10) / 10,
    scoreFloor,
  })
}
