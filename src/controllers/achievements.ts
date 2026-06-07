import { eq } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { ACHIEVEMENT_META, ALL_TYPES } from "../utils/achievements"
import { achievements } from "../db/schema"
import { db } from "../lib/db"

export async function getAchievements(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const unlocked = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, userId))

  const unlockedMap = new Map(unlocked.map((a) => [a.type, a.unlockedAt]))

  const result = ALL_TYPES.map((type) => ({
    type,
    ...ACHIEVEMENT_META[type],
    unlocked: unlockedMap.has(type),
    unlockedAt: unlockedMap.get(type) ?? null,
  }))

  return c.json(result)
}
