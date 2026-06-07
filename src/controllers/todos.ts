import { and, eq } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { todos, journalPoints } from "../db/schema"
import { db } from "../lib/db"

export async function listTodos(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const query = c.req.valid("query" as never) as {
    status?: "pending" | "completed" | "missed"
    date?: string
  }

  const conditions = [eq(todos.userId, userId)]
  if (query.status) conditions.push(eq(todos.status, query.status))
  if (query.date) conditions.push(eq(todos.dueDate, query.date))

  const rows = await db
    .select()
    .from(todos)
    .where(and(...conditions))
    .orderBy(todos.createdAt)
  return c.json(rows)
}

export async function createTodo(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const body = c.req.valid("json" as never) as {
    title: string
    categoryId?: string
    dueDate?: string
  }
  const [row] = await db
    .insert(todos)
    .values({ ...body, userId })
    .returning()
  return c.json(row, 201)
}

export async function updateTodo(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as Partial<{
    title: string
    categoryId: string
    dueDate: string
    status: "pending" | "completed" | "missed"
  }>
  const [row] = await db
    .update(todos)
    .set(body)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning()
  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json(row)
}

export async function deleteTodo(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const [row] = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning()
  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json({ message: "Deleted" })
}

export async function completeTodo(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as {
    createJournalPoint: boolean
    journalPoint?: {
      title: string
      description?: string
      score: number
      tag: "positive" | "negative" | "neutral"
    }
  }

  const existing = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
  if (!existing[0]) return c.json({ message: "Not found" }, 404)
  if (existing[0].status === "completed")
    return c.json({ message: "Already completed" }, 400)

  let journalPointId: string | undefined

  if (body.createJournalPoint && body.journalPoint) {
    const today = new Date().toISOString().slice(0, 10)
    const [jp] = await db
      .insert(journalPoints)
      .values({
        userId,
        title: body.journalPoint.title,
        description: body.journalPoint.description,
        date: today,
        score: body.journalPoint.score,
        tag: body.journalPoint.tag,
        categoryId: existing[0].categoryId ?? undefined,
      })
      .returning()
    journalPointId = jp.id
  }

  const [updated] = await db
    .update(todos)
    .set({ status: "completed", journalPointId: journalPointId ?? null })
    .where(eq(todos.id, id))
    .returning()

  return c.json({
    todo: updated,
    journalPointPrompt: !body.createJournalPoint
      ? {
        message: "Would you like to log this as a journal point?",
        todoId: id,
        todoTitle: existing[0].title,
      }
      : null,
  })
}
