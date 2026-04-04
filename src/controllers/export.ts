import { eq } from "drizzle-orm"
import type { Context } from "hono"
import { db } from "../lib/db"
import {
  categories,
  journalPoints,
  reflections,
  todos,
  goals,
  goalProgress,
  habits,
  habitEntries,
} from "../db/schema/app"
import type { AppEnv } from "../types/hono"

export async function exportData(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const [
    userCategories,
    userJournalPoints,
    userTodos,
    userGoals,
    userHabits,
  ] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, userId)),
    db.select().from(journalPoints).where(eq(journalPoints.userId, userId)).orderBy(journalPoints.date),
    db.select().from(todos).where(eq(todos.userId, userId)),
    db.select().from(goals).where(eq(goals.userId, userId)),
    db.select().from(habits).where(eq(habits.userId, userId)),
  ])

  const journalIds = userJournalPoints.map((j) => j.id)
  const goalIds = userGoals.map((g) => g.id)
  const habitIds = userHabits.map((h) => h.id)

  const [userReflections, userGoalProgress, userHabitEntries] =
    await Promise.all([
      journalIds.length > 0
        ? db
            .select()
            .from(reflections)
            .where(
              journalIds.length === 1
                ? eq(reflections.journalPointId, journalIds[0])
                : undefined,
            )
        : [],
      goalIds.length > 0
        ? db.select().from(goalProgress)
        : [],
      habitIds.length > 0
        ? db.select().from(habitEntries).where(eq(habitEntries.userId, userId))
        : [],
    ])

  const allReflections =
    journalIds.length > 0
      ? await db.select().from(reflections).innerJoin(
          journalPoints,
          eq(reflections.journalPointId, journalPoints.id),
        )
          .then((rows) => rows.filter((r) => r.journal_points.userId === userId).map((r) => r.reflections))
      : []

  const allGoalProgress =
    goalIds.length > 0
      ? await db.select().from(goalProgress).innerJoin(
          goals,
          eq(goalProgress.goalId, goals.id),
        )
          .then((rows) => rows.filter((r) => r.goals.userId === userId).map((r) => r.goal_progress))
      : []

  return c.json({
    exportedAt: new Date().toISOString(),
    categories: userCategories,
    journalPoints: userJournalPoints,
    reflections: allReflections,
    todos: userTodos,
    goals: userGoals,
    goalProgress: allGoalProgress,
    habits: userHabits,
    habitEntries: userHabitEntries,
  })
}
