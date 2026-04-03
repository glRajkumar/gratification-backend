import { eq, and } from "drizzle-orm"
import type { Context } from "hono"
import { db } from "../lib/db"
import { categories } from "../db/schema/app"
import type { AppEnv } from "../types/hono"

export async function listCategories(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.createdAt)
  return c.json(rows)
}

export async function createCategory(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const body = c.req.valid("json" as never) as {
    name: string
    color: string
    icon: string
  }
  const [row] = await db
    .insert(categories)
    .values({ ...body, userId })
    .returning()
  return c.json(row, 201)
}

export async function updateCategory(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const body = c.req.valid("json" as never) as Partial<{
    name: string
    color: string
    icon: string
  }>
  const [row] = await db
    .update(categories)
    .set(body)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning()
  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json(row)
}

export async function deleteCategory(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const [row] = await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning()
  if (!row) return c.json({ message: "Not found" }, 404)
  return c.json({ message: "Deleted" })
}
