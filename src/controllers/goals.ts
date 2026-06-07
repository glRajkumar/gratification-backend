import { and, eq } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { goals, goalProgress, journalPoints } from "../db/schema"
import { db } from "../lib/db"

export async function listGoals(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const query = c.req.valid("query" as never) as {
    status?: "active" | "achieved" | "partial" | "missed"
    period?: "daily" | "weekly" | "monthly"
  }

  const conditions = [eq(goals.userId, userId)]
  if (query.status) conditions.push(eq(goals.status, query.status))
  if (query.period) conditions.push(eq(goals.period, query.period))

  const rows = await db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(goals.createdAt)
  return c.json(rows)
}

export async function createGoal(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const body = c.req.valid("json" as never) as {
    title: string
    categoryId?: string
    period: "daily" | "weekly" | "monthly"
    targetCount: number
    startDate: string
    endDate: string
  }
  const [row] = await db
    .insert(goals)
    .values({ ...body, userId })
    .returning()
  return c.json(row, 201)
}

export async function updateGoal(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as Partial<{
    title: string
    categoryId: string
    period: "daily" | "weekly" | "monthly"
    targetCount: number
    startDate: string
    endDate: string
  }>
  const [row] = await db
    .update(goals)
    .set(body)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning()
  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json(row)
}

export async function deleteGoal(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const [row] = await db
    .delete(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
    .returning()
  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json({ message: "Deleted" })
}

export async function addGoalProgress(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const { journalPointId } = c.req.valid("json" as never) as {
    journalPointId: string
  }

  const goal = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
  if (!goal[0]) return c.json({ message: "Not found" }, 404)

  const jp = await db
    .select({ id: journalPoints.id })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.id, journalPointId),
        eq(journalPoints.userId, userId),
      ),
    )
  if (!jp[0]) return c.json({ message: "Journal point not found" }, 404)

  const [row] = await db
    .insert(goalProgress)
    .values({ goalId: id, journalPointId })
    .returning()
  return c.json(row, 201)
}

export async function closeGoal(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as {
    status: "achieved" | "partial" | "missed"
    summaryNote?: string
  }

  const existing = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, userId)))
  if (!existing[0]) return c.json({ message: "Not found" }, 404)
  if (existing[0].status !== "active")
    return c.json({ message: "Goal is already closed" }, 400)

  const tag =
    body.status === "achieved"
      ? "positive"
      : body.status === "partial"
        ? "neutral"
        : "negative"

  const today = new Date().toISOString().slice(0, 10)
  const [jp] = await db
    .insert(journalPoints)
    .values({
      userId,
      title: `Goal "${existing[0].title}" — ${body.status}`,
      description: body.summaryNote,
      date: today,
      score: body.status === "achieved" ? 5 : body.status === "partial" ? 2 : 1,
      tag,
      categoryId: existing[0].categoryId ?? undefined,
    })
    .returning()

  const [updated] = await db
    .update(goals)
    .set({ status: body.status, journalPointId: jp.id })
    .where(eq(goals.id, id))
    .returning()

  return c.json({ goal: updated, journalPoint: jp })
}
