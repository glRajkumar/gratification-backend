import { and, eq } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { weeklyIntentions } from "../db/schema"
import { currentWeekStr } from "../utils/dates"
import { db } from "../lib/db"

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
