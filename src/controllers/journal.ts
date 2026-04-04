import { and, eq, gte, lte, sql } from "drizzle-orm"
import type { Context } from "hono"
import { db } from "../lib/db"
import { journalPoints, reflections } from "../db/schema/app"
import type { AppEnv } from "../types/hono"
import {
  checkJournalAchievements,
  checkReflectionAchievements,
} from "../utils/achievements"

function weekBounds(weekStr: string): { start: string; end: string } {
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

export async function listJournalPoints(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const query = c.req.valid("query" as never) as {
    date?: string
    week?: string
    month?: string
  }

  const conditions = [eq(journalPoints.userId, userId)]

  if (query.date) {
    conditions.push(eq(journalPoints.date, query.date))
  } else if (query.week) {
    const { start, end } = weekBounds(query.week)
    conditions.push(gte(journalPoints.date, start))
    conditions.push(lte(journalPoints.date, end))
  } else if (query.month) {
    const [year, month] = query.month.split("-")
    const start = `${year}-${month}-01`
    const lastDay = new Date(Number(year), Number(month), 0).getDate()
    const end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`
    conditions.push(gte(journalPoints.date, start))
    conditions.push(lte(journalPoints.date, end))
  }

  const rows = await db
    .select()
    .from(journalPoints)
    .where(and(...conditions))
    .orderBy(journalPoints.date, journalPoints.createdAt)
  return c.json(rows)
}

export async function createJournalPoint(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const body = c.req.valid("json" as never) as {
    title: string
    description?: string
    date: string
    time?: string
    categoryId?: string
    score: number
    tag: "positive" | "negative" | "neutral"
    mood?: number
  }
  const [row] = await db
    .insert(journalPoints)
    .values({ ...body, userId })
    .returning()
  void checkJournalAchievements(userId, body.date)
  return c.json(row, 201)
}

export async function getJournalPoint(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const rows = await db
    .select()
    .from(journalPoints)
    .where(and(eq(journalPoints.id, id), eq(journalPoints.userId, userId)))
  if (!rows[0]) return c.json({ message: "Not found" }, 404)

  const pointReflections = await db
    .select()
    .from(reflections)
    .where(eq(reflections.journalPointId, id))
    .orderBy(reflections.createdAt)

  return c.json({ ...rows[0], reflections: pointReflections })
}

export async function updateJournalPoint(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as Partial<{
    title: string
    description: string
    date: string
    time: string
    categoryId: string
    score: number
    tag: "positive" | "negative" | "neutral"
  }>
  const [row] = await db
    .update(journalPoints)
    .set(body)
    .where(and(eq(journalPoints.id, id), eq(journalPoints.userId, userId)))
    .returning()
  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json(row)
}

export async function deleteJournalPoint(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const [row] = await db
    .delete(journalPoints)
    .where(and(eq(journalPoints.id, id), eq(journalPoints.userId, userId)))
    .returning()
  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json({ message: "Deleted" })
}

export async function getDailyScore(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { date } = c.req.valid("query" as never) as { date: string }

  const rows = await db
    .select({ score: journalPoints.score, tag: journalPoints.tag })
    .from(journalPoints)
    .where(and(eq(journalPoints.userId, userId), eq(journalPoints.date, date)))

  let total = 0
  for (const row of rows) {
    if (row.tag === "positive") total += row.score
    else if (row.tag === "negative") total -= row.score
  }

  return c.json({ date, score: total, count: rows.length })
}

export async function addReflection(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as {
    type: string
    content: string
    cognitiveDistortion?: string
  }

  const point = await db
    .select({ id: journalPoints.id })
    .from(journalPoints)
    .where(and(eq(journalPoints.id, id), eq(journalPoints.userId, userId)))
  if (!point[0]) return c.json({ message: "Not found" }, 404)

  const [row] = await db
    .insert(reflections)
    .values({ journalPointId: id, ...body } as typeof reflections.$inferInsert)
    .returning()

  void checkReflectionAchievements(userId, id)
  return c.json(row, 201)
}

export async function getOnThisDay(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const currentYear = today.getFullYear()

  const rows = await db
    .select()
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        sql`EXTRACT(MONTH FROM ${journalPoints.date}::date) = ${month}`,
        sql`EXTRACT(DAY FROM ${journalPoints.date}::date) = ${day}`,
        sql`EXTRACT(YEAR FROM ${journalPoints.date}::date) < ${currentYear}`,
      ),
    )
    .orderBy(journalPoints.date)

  const byYear = new Map<number, typeof rows>()
  for (const row of rows) {
    const year = new Date(row.date).getFullYear()
    const existing = byYear.get(year) ?? []
    existing.push(row)
    byYear.set(year, existing)
  }

  const result = [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, points]) => ({ year, points }))

  return c.json(result)
}

export async function updateReflection(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as Partial<{
    type: string
    content: string
  }>

  const existing = await db
    .select({ id: reflections.id, userId: journalPoints.userId })
    .from(reflections)
    .innerJoin(
      journalPoints,
      eq(reflections.journalPointId, journalPoints.id),
    )
    .where(
      and(eq(reflections.id, id), eq(journalPoints.userId, userId)),
    )
  if (!existing[0]) return c.json({ message: "Not found" }, 404)

  const [row] = await db
    .update(reflections)
    .set(body)
    .where(eq(reflections.id, id))
    .returning()
  return c.json(row)
}

export async function deleteReflection(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()

  const existing = await db
    .select({ id: reflections.id })
    .from(reflections)
    .innerJoin(
      journalPoints,
      eq(reflections.journalPointId, journalPoints.id),
    )
    .where(
      and(eq(reflections.id, id), eq(journalPoints.userId, userId)),
    )
  if (!existing[0]) return c.json({ message: "Not found" }, 404)

  await db.delete(reflections).where(eq(reflections.id, id))
  return c.json({ message: "Deleted" })
}
