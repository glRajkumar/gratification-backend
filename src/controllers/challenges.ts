import { and, eq } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"
import { challengeCompletions } from "../db/schema"
import { getTodayChallenge } from "../utils/challenges"
import { db } from "../lib/db"

export async function getChallengeToday(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const dow = today.getDay()
  const dom = today.getDate()

  const challenge = getTodayChallenge(dow, dom)

  // Check if already completed today
  const [completion] = await db
    .select()
    .from(challengeCompletions)
    .where(
      and(
        eq(challengeCompletions.userId, userId),
        eq(challengeCompletions.date, todayStr),
        eq(challengeCompletions.challengeKey, challenge.key),
      ),
    )

  return c.json({
    ...challenge,
    date: todayStr,
    completed: !!completion,
    journalPointId: completion?.journalPointId ?? null,
  })
}

export async function completeChallenge(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const body = c.req.valid("json" as never) as {
    challengeKey: string
    journalPointId?: string
  }
  const todayStr = new Date().toISOString().slice(0, 10)

  const [existing] = await db
    .select({ id: challengeCompletions.id })
    .from(challengeCompletions)
    .where(
      and(
        eq(challengeCompletions.userId, userId),
        eq(challengeCompletions.date, todayStr),
        eq(challengeCompletions.challengeKey, body.challengeKey),
      ),
    )

  if (existing) return c.json({ message: "Already completed" }, 400)

  const [row] = await db
    .insert(challengeCompletions)
    .values({
      userId,
      challengeKey: body.challengeKey,
      journalPointId: body.journalPointId,
      date: todayStr,
    })
    .returning()

  return c.json(row, 201)
}

export async function getChallengeHistory(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const rows = await db
    .select()
    .from(challengeCompletions)
    .where(eq(challengeCompletions.userId, userId))
    .orderBy(challengeCompletions.date)

  return c.json({ total: rows.length, completions: rows })
}
