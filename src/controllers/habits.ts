import { and, eq, gte, isNull } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { habits, habitEntries, journalPoints } from "../db/schema"
import { isScheduledDay } from "../utils/habits"
import { db } from "../lib/db"

export async function listHabits(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const todayStr = new Date().toISOString().slice(0, 10)

  const rows = await db
    .select()
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.archivedAt)))
    .orderBy(habits.createdAt)

  const todayEntries = await db
    .select()
    .from(habitEntries)
    .where(
      and(eq(habitEntries.userId, userId), eq(habitEntries.date, todayStr)),
    )

  const entryMap = new Map(todayEntries.map((e) => [e.habitId, e]))

  const result = rows.map((h) => ({
    ...h,
    todayEntry: entryMap.get(h.id) ?? null,
    scheduledToday: isScheduledDay(h, todayStr),
  }))

  return c.json(result)
}

export async function createHabit(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const body = c.req.valid("json" as never) as {
    title: string
    categoryId?: string
    frequency: "daily" | "weekdays" | "weekends" | "custom"
    customDays?: string
    targetCount: number
    color: string
    icon: string
    autoJournalOnComplete: boolean
    autoJournalOnMiss: boolean
  }

  const [row] = await db
    .insert(habits)
    .values({ ...body, userId })
    .returning()

  return c.json(row, 201)
}

export async function updateHabit(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as Partial<{
    title: string
    categoryId: string
    frequency: "daily" | "weekdays" | "weekends" | "custom"
    customDays: string
    targetCount: number
    color: string
    icon: string
    autoJournalOnComplete: boolean
    autoJournalOnMiss: boolean
  }>

  const [row] = await db
    .update(habits)
    .set(body)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .returning()

  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json(row)
}

export async function archiveHabit(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()

  const [row] = await db
    .update(habits)
    .set({ archivedAt: new Date() })
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .returning()

  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json({ message: "Archived" })
}

export async function checkHabit(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as {
    date: string
    completed: boolean
    note?: string
  }

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))

  if (!habit) return c.json({ message: "Not found" }, 404)

  const existing = await db
    .select()
    .from(habitEntries)
    .where(
      and(
        eq(habitEntries.habitId, id),
        eq(habitEntries.date, body.date),
      ),
    )

  let entry
  if (existing[0]) {
    const [updated] = await db
      .update(habitEntries)
      .set({ completed: body.completed, note: body.note })
      .where(eq(habitEntries.id, existing[0].id))
      .returning()
    entry = updated
  } else {
    const [inserted] = await db
      .insert(habitEntries)
      .values({
        habitId: id,
        userId,
        date: body.date,
        completed: body.completed,
        note: body.note,
      })
      .returning()
    entry = inserted
  }

  if (body.completed && habit.autoJournalOnComplete) {
    await db.insert(journalPoints).values({
      userId,
      title: `Completed habit: ${habit.title}`,
      date: body.date,
      score: 1,
      tag: "positive",
      categoryId: habit.categoryId,
    })
  }

  return c.json(entry)
}

export async function getHabitStats(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const { days } = c.req.valid("query" as never) as { days?: number }
  const daysCount = days ?? 30

  const [habit] = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))

  if (!habit) return c.json({ message: "Not found" }, 404)

  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - daysCount + 1)
  const fromStr = fromDate.toISOString().slice(0, 10)

  const entries = await db
    .select()
    .from(habitEntries)
    .where(
      and(eq(habitEntries.habitId, id), gte(habitEntries.date, fromStr)),
    )

  const entryMap = new Map(entries.map((e) => [e.date, e]))

  const heatmap: { date: string; completed: boolean; scheduled: boolean }[] = []
  const cursor = new Date(fromStr)
  const today = new Date()
  let scheduledDays = 0
  let completedDays = 0

  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10)
    const scheduled = isScheduledDay(habit, dateStr)
    const entry = entryMap.get(dateStr)
    const completed = entry?.completed ?? false

    heatmap.push({ date: dateStr, completed, scheduled })
    if (scheduled) {
      scheduledDays++
      if (completed) completedDays++
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  const strength =
    scheduledDays > 0 ? Math.round((completedDays / scheduledDays) * 100) : 0

  return c.json({
    habit,
    heatmap,
    scheduledDays,
    completedDays,
    strength,
  })
}
