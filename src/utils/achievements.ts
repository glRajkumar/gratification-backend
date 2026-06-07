import { and, count, eq } from "drizzle-orm"

import { achievements, journalPoints, reflections, scoreMilestones } from "../db/schema"
import { db } from "../lib/db"

export type AchievementType =
  | "first_entry"
  | "week_warrior"
  | "month_master"
  | "score_100"
  | "reflective"
  | "goal_getter"
  | "balanced"
  | "deep_thinker"

async function isUnlocked(userId: string, type: AchievementType) {
  const rows = await db
    .select({ id: achievements.id })
    .from(achievements)
    .where(and(eq(achievements.userId, userId), eq(achievements.type, type)))
  return rows.length > 0
}

async function unlock(userId: string, type: AchievementType) {
  if (await isUnlocked(userId, type)) return
  await db.insert(achievements).values({ userId, type })
}

export async function checkJournalAchievements(userId: string, date: string) {
  const [totalRows] = await db
    .select({ count: count() })
    .from(journalPoints)
    .where(eq(journalPoints.userId, userId))
  if (totalRows.count >= 1) await unlock(userId, "first_entry")

  const allPoints = await db
    .select({ score: journalPoints.score, tag: journalPoints.tag })
    .from(journalPoints)
    .where(eq(journalPoints.userId, userId))
  let cumulative = 0
  for (const p of allPoints) {
    if (p.tag === "positive") cumulative += p.score
    else if (p.tag === "negative") cumulative -= p.score
  }
  if (cumulative >= 100) await unlock(userId, "score_100")

  const todayPoints = await db
    .select({ categoryId: journalPoints.categoryId })
    .from(journalPoints)
    .where(and(eq(journalPoints.userId, userId), eq(journalPoints.date, date)))
  const uniqueCategories = new Set(
    todayPoints.map((p) => p.categoryId).filter(Boolean),
  )
  if (uniqueCategories.size >= 3) await unlock(userId, "balanced")
}

export async function checkReflectionAchievements(
  userId: string,
  journalPointId: string,
) {
  const allReflections = await db
    .select({ id: reflections.id, journalPointId: reflections.journalPointId })
    .from(reflections)
    .innerJoin(
      journalPoints,
      eq(reflections.journalPointId, journalPoints.id),
    )
    .where(eq(journalPoints.userId, userId))

  if (allReflections.length >= 10) await unlock(userId, "reflective")

  const pointReflections = allReflections.filter(
    (r) => r.journalPointId === journalPointId,
  )
  if (pointReflections.length >= 5) await unlock(userId, "deep_thinker")
}

export async function checkGoalAchievement(userId: string) {
  await unlock(userId, "goal_getter")
}

export async function checkStreakAchievements(
  userId: string,
  currentStreak: number,
) {
  if (currentStreak >= 7) await unlock(userId, "week_warrior")
  if (currentStreak >= 30) await unlock(userId, "month_master")
}

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

async function hasMilestone(
  userId: string,
  type: typeof scoreMilestones.$inferSelect.type,
) {
  const rows = await db
    .select({ id: scoreMilestones.id })
    .from(scoreMilestones)
    .where(
      and(eq(scoreMilestones.userId, userId), eq(scoreMilestones.type, type)),
    )
  return rows.length > 0
}

async function recordMilestone(
  userId: string,
  type: typeof scoreMilestones.$inferSelect.type,
  date: string,
  value?: number,
) {
  await db.insert(scoreMilestones).values({ userId, type, date, value })
}

export async function checkScoreMilestones(
  userId: string,
  date: string,
  entryScore: number,
  tag: string,
) {
  const allRows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
    })
    .from(journalPoints)
    .where(eq(journalPoints.userId, userId))

  const dailyMap = computeDailyScores(allRows)
  const todayDayScore = dailyMap.get(date) ?? 0

  // First 8.0+ day: daily score >= 8
  if (todayDayScore >= 8 && !(await hasMilestone(userId, "first_8_day"))) {
    await recordMilestone(userId, "first_8_day", date, todayDayScore)
  }

  // Personal best day
  const allScores = [...dailyMap.entries()].filter(([d]) => d !== date)
  const prevBest = allScores.length > 0 ? Math.max(...allScores.map(([, s]) => s)) : -Infinity
  if (todayDayScore > prevBest) {
    // Remove old best and record new one
    await db
      .delete(scoreMilestones)
      .where(
        and(
          eq(scoreMilestones.userId, userId),
          eq(scoreMilestones.type, "personal_best_day"),
        ),
      )
    await recordMilestone(userId, "personal_best_day", date, todayDayScore)
  }

  // Comeback: today's score 5+ above 7-day avg
  const sevenDaysAgo = new Date(date)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10)
  const last7Scores = allRows
    .filter((r) => r.date >= sevenDaysAgoStr && r.date < date)
    .reduce((acc, r) => {
      const cur = acc.get(r.date) ?? 0
      if (r.tag === "positive") acc.set(r.date, cur + r.score)
      else if (r.tag === "negative") acc.set(r.date, cur - r.score)
      return acc
    }, new Map<string, number>())
  const avg7 =
    last7Scores.size > 0
      ? [...last7Scores.values()].reduce((a, b) => a + b, 0) / last7Scores.size
      : 0
  if (todayDayScore >= avg7 + 5) {
    await recordMilestone(userId, "comeback", date, todayDayScore)
  }

  // First positive month
  const now = new Date(date)
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`

  const monthRows = allRows.filter((r) => r.date >= monthStart && r.date <= monthEnd)
  const monthDailyMap = computeDailyScores(monthRows)
  const monthTotalScore = [...monthDailyMap.values()].reduce((a, b) => a + b, 0)

  if (monthTotalScore > 0 && !(await hasMilestone(userId, "first_positive_month"))) {
    await recordMilestone(userId, "first_positive_month", date, monthTotalScore)
  }
}
