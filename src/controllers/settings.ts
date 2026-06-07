import { eq } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { userSettings } from "../db/schema"
import { db } from "../lib/db"

const DEFAULT_SETTINGS = {
  weekStartDay: "monday" as const,
  defaultTag: "positive" as const,
  defaultScore: 1,
  showScoreOnDashboard: true,
  theme: "system" as const,
  freezeTokens: 0,
  morningEveningMode: false,
  companionName: null as string | null,
  weeklyIntentionEnabled: true,
}

export async function getSettings(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const [row] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))

  if (!row) return c.json(DEFAULT_SETTINGS)

  const { id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...settings } = row
  return c.json(settings)
}

export async function updateSettings(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const body = c.req.valid("json" as never) as Partial<{
    weekStartDay: "monday" | "sunday"
    defaultTag: "positive" | "neutral" | "negative"
    defaultScore: number
    showScoreOnDashboard: boolean
    theme: "light" | "dark" | "system"
    morningEveningMode: boolean
    companionName: string
    weeklyIntentionEnabled: boolean
  }>

  const existing = await db
    .select({ id: userSettings.id })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))

  let row
  if (existing[0]) {
    const [updated] = await db
      .update(userSettings)
      .set(body)
      .where(eq(userSettings.userId, userId))
      .returning()
    row = updated
  } else {
    const [inserted] = await db
      .insert(userSettings)
      .values({ userId, ...DEFAULT_SETTINGS, ...body })
      .returning()
    row = inserted
  }

  const { id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...settings } = row
  return c.json(settings)
}
