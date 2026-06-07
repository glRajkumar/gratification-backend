import { and, eq, or } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { journalPoints, userSettings, streakPartners, users } from "../db/schema"
import { computeStreakFull, computeScoreStreak } from "../utils/streaks"
import { checkStreakAchievements } from "../utils/achievements"
import { db } from "../lib/db"

export async function getStreaks(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const rows = await db
    .select({ date: journalPoints.date, score: journalPoints.score, tag: journalPoints.tag })
    .from(journalPoints)
    .where(eq(journalPoints.userId, userId))

  const dates = rows.map((r) => r.date)
  const { currentStreak, longestStreak, lastEntryDate, strengthPercent, daysSinceEntry } =
    computeStreakFull(dates)

  void checkStreakAchievements(userId, currentStreak)

  const milestones = [7, 14, 30, 60, 100, 365]
  const nextMilestone = milestones.find((m) => m > currentStreak) ?? null

  // Score streak (16.2)
  const dailyMap = new Map<string, number>()
  for (const row of rows) {
    const cur = dailyMap.get(row.date) ?? 0
    if (row.tag === "positive") dailyMap.set(row.date, cur + row.score)
    else if (row.tag === "negative") dailyMap.set(row.date, cur - row.score)
    else dailyMap.set(row.date, cur)
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const fromStr = thirtyDaysAgo.toISOString().slice(0, 10)
  const todayStr = new Date().toISOString().slice(0, 10)
  const last30Scores = [...dailyMap.entries()]
    .filter(([d]) => d >= fromStr && d <= todayStr)
    .map(([, s]) => s)
  const avg30 =
    last30Scores.length > 0
      ? last30Scores.reduce((a, b) => a + b, 0) / last30Scores.length
      : 0

  const { currentScoreStreak, longestScoreStreak } = computeScoreStreak(dailyMap, avg30)

  // Freeze tokens (16.3)
  const [settings] = await db
    .select({ freezeTokens: userSettings.freezeTokens })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
  const freezeTokens = settings?.freezeTokens ?? 0

  // Auto-credit: 1 token per 7 consecutive days (cap 3)
  const weekCredits = Math.floor(currentStreak / 7)
  const creditsEarned = Math.min(3, weekCredits)
  if (creditsEarned > freezeTokens && freezeTokens < 3) {
    const newTokens = Math.min(3, creditsEarned)
    await db
      .insert(userSettings)
      .values({ userId, freezeTokens: newTokens })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: { freezeTokens: newTokens },
      })
  }

  // Partner streak (16.4)
  const partner = await db
    .select()
    .from(streakPartners)
    .where(
      and(
        or(
          eq(streakPartners.userId, userId),
          eq(streakPartners.partnerId, userId),
        ),
        eq(streakPartners.status, "active"),
      ),
    )
    .limit(1)

  let partnerData = null
  if (partner[0]) {
    const partnerId =
      partner[0].userId === userId ? partner[0].partnerId : partner[0].userId
    const [partnerUser] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, partnerId))

    const partnerTodayEntry = await db
      .select({ id: journalPoints.id })
      .from(journalPoints)
      .where(
        and(
          eq(journalPoints.userId, partnerId),
          eq(journalPoints.date, todayStr),
        ),
      )
      .limit(1)

    partnerData = {
      id: partner[0].id,
      partnerName: partnerUser?.name ?? partnerUser?.email ?? "Partner",
      currentStreak: partner[0].currentStreak,
      longestStreak: partner[0].longestStreak,
      partnerLoggedToday: partnerTodayEntry.length > 0,
      startDate: partner[0].startDate,
    }
  }

  return c.json({
    currentStreak,
    longestStreak,
    lastEntryDate,
    nextMilestone,
    strengthPercent,
    daysSinceEntry,
    currentScoreStreak,
    longestScoreStreak,
    avg30: Math.round(avg30 * 10) / 10,
    freezeTokens: Math.min(3, creditsEarned > (settings?.freezeTokens ?? 0) ? creditsEarned : freezeTokens),
    partner: partnerData,
  })
}

export async function freezeStreak(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const [settings] = await db
    .select({ freezeTokens: userSettings.freezeTokens })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))

  const currentTokens = settings?.freezeTokens ?? 0
  if (currentTokens <= 0) {
    return c.json({ message: "No freeze tokens available" }, 400)
  }

  const todayStr = new Date().toISOString().slice(0, 10)

  // Insert a "freeze" journal point that counts as an entry (keeps streak alive)
  await db.insert(journalPoints).values({
    userId,
    title: "Streak freeze",
    date: todayStr,
    score: 1,
    tag: "neutral",
    isQuick: true,
  })

  // Deduct token
  await db
    .insert(userSettings)
    .values({ userId, freezeTokens: currentTokens - 1 })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { freezeTokens: currentTokens - 1 },
    })

  return c.json({ message: "Streak frozen", freezeTokens: currentTokens - 1 })
}

export async function invitePartner(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { email } = c.req.valid("json" as never) as { email: string }

  // Check for existing active partnership
  const existing = await db
    .select({ id: streakPartners.id })
    .from(streakPartners)
    .where(
      and(
        or(
          eq(streakPartners.userId, userId),
          eq(streakPartners.partnerId, userId),
        ),
        eq(streakPartners.status, "active"),
      ),
    )
  if (existing.length > 0) {
    return c.json({ message: "Already have an active partner streak" }, 400)
  }

  const [partnerUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))

  if (!partnerUser) return c.json({ message: "User not found" }, 404)
  if (partnerUser.id === userId)
    return c.json({ message: "Cannot partner with yourself" }, 400)

  const inviteToken = crypto.randomUUID()
  const [row] = await db
    .insert(streakPartners)
    .values({
      userId,
      partnerId: partnerUser.id,
      inviteToken,
      status: "pending",
    })
    .returning()

  return c.json({ message: "Invite sent", partnershipId: row.id, inviteToken })
}

export async function acceptPartner(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { token } = c.req.valid("json" as never) as { token: string }

  const [partnership] = await db
    .select()
    .from(streakPartners)
    .where(
      and(
        eq(streakPartners.inviteToken, token),
        eq(streakPartners.partnerId, userId),
        eq(streakPartners.status, "pending"),
      ),
    )

  if (!partnership) return c.json({ message: "Invalid or expired invite" }, 404)

  const todayStr = new Date().toISOString().slice(0, 10)
  await db
    .update(streakPartners)
    .set({ status: "active", startDate: todayStr })
    .where(eq(streakPartners.id, partnership.id))

  return c.json({ message: "Partner streak started" })
}

export async function removePartner(c: Context<AppEnv>) {
  const userId = c.get("userId")

  await db
    .update(streakPartners)
    .set({ status: "declined" })
    .where(
      and(
        or(
          eq(streakPartners.userId, userId),
          eq(streakPartners.partnerId, userId),
        ),
        eq(streakPartners.status, "active"),
      ),
    )

  return c.json({ message: "Partner streak removed" })
}
