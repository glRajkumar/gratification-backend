import { and, eq } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { weeklyIntentions } from "../db/schema"
import { db } from "../lib/db"

function currentWeekStr(): string {
  const now = new Date()
  const year = now.getFullYear()
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const daysDiff = Math.floor(
    (now.getTime() - startOfWeek1.getTime()) / (1000 * 60 * 60 * 24),
  )
  const week = Math.floor(daysDiff / 7) + 1
  return `${year}-W${String(week).padStart(2, "0")}`
}

export async function getCurrentIntention(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const week = currentWeekStr()

  const [intention] = await db
    .select()
    .from(weeklyIntentions)
    .where(
      and(
        eq(weeklyIntentions.userId, userId),
        eq(weeklyIntentions.week, week),
      ),
    )

  return c.json(intention ?? null)
}

export async function setIntention(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const body = c.req.valid("json" as never) as {
    intention: string
    targetScore?: number
    focusCategoryId?: string
  }
  const week = currentWeekStr()

  const [existing] = await db
    .select({ id: weeklyIntentions.id })
    .from(weeklyIntentions)
    .where(
      and(
        eq(weeklyIntentions.userId, userId),
        eq(weeklyIntentions.week, week),
      ),
    )

  if (existing) {
    const [updated] = await db
      .update(weeklyIntentions)
      .set(body)
      .where(eq(weeklyIntentions.id, existing.id))
      .returning()
    return c.json(updated)
  }

  const [row] = await db
    .insert(weeklyIntentions)
    .values({ userId, week, ...body })
    .returning()
  return c.json(row, 201)
}
