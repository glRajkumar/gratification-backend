import { and, count, eq } from "drizzle-orm"
import { db } from "../lib/db"
import { achievements, journalPoints, reflections } from "../db/schema/app"

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
