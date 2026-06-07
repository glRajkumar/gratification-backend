import { and, eq, gte, lte } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import {
  journalPoints,
  reflections,
  categories,
  scoreMilestones,
} from "../db/schema"
import { linearRegressionSlope, stdDev } from "../utils/stats"
import { computeDailyScores } from "../utils/dates"
import { db } from "../lib/db"

export async function getPersonality(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89)
  const fromStr = ninetyDaysAgo.toISOString().slice(0, 10)
  const todayStr = new Date().toISOString().slice(0, 10)

  const rows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
      time: journalPoints.time,
      categoryId: journalPoints.categoryId,
    })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, fromStr),
        lte(journalPoints.date, todayStr),
      ),
    )

  if (rows.length === 0) {
    return c.json({ label: "Explorer", description: "Keep logging to discover your pattern." })
  }

  const dailyMap = computeDailyScores(rows)
  const dailyEntries = [...dailyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const dailyValues = dailyEntries.map(([, s]) => s)

  // Steady Climber
  const threeMonthSlope = linearRegressionSlope(dailyValues)

  // Weekend Warrior
  const weekendScores: number[] = []
  const weekdayScores: number[] = []
  for (const [date, score] of dailyMap) {
    const dow = new Date(date).getDay()
    if (dow === 0 || dow === 6) weekendScores.push(score)
    else weekdayScores.push(score)
  }
  const avgWeekend =
    weekendScores.length > 0
      ? weekendScores.reduce((a, b) => a + b, 0) / weekendScores.length
      : 0
  const avgWeekday =
    weekdayScores.length > 0
      ? weekdayScores.reduce((a, b) => a + b, 0) / weekdayScores.length
      : 0

  // Morning Riser / Night Owl
  const morningRows = rows.filter(
    (r) => r.time && parseInt(r.time.split(":")[0]) < 10,
  )
  const eveningRows = rows.filter(
    (r) => r.time && parseInt(r.time.split(":")[0]) >= 21,
  )
  const morningDailyMap = computeDailyScores(morningRows)
  const eveningDailyMap = computeDailyScores(eveningRows)
  const avgMorningScore =
    morningDailyMap.size > 0
      ? [...morningDailyMap.values()].reduce((a, b) => a + b, 0) / morningDailyMap.size
      : null
  const avgEveningScore =
    eveningDailyMap.size > 0
      ? [...eveningDailyMap.values()].reduce((a, b) => a + b, 0) / eveningDailyMap.size
      : null

  // Consistent / High-Variance
  const last30Values = dailyValues.slice(-30)
  const last30Std = stdDev(last30Values)

  // Deep Reflector
  const reflectionRows = await db
    .select({ journalPointId: reflections.journalPointId })
    .from(reflections)
    .innerJoin(journalPoints, eq(reflections.journalPointId, journalPoints.id))
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, fromStr),
      ),
    )
  const reflectionsPerPoint =
    rows.length > 0 ? reflectionRows.length / rows.length : 0

  // Category Master
  const categoryCounts = new Map<string, number>()
  let totalPositiveScore = 0
  for (const row of rows) {
    if (row.tag === "positive" && row.categoryId) {
      const cur = categoryCounts.get(row.categoryId) ?? 0
      categoryCounts.set(row.categoryId, cur + row.score)
      totalPositiveScore += row.score
    }
  }
  let topCategoryScore = 0
  let topCategoryId: string | null = null
  for (const [id, score] of categoryCounts) {
    if (score > topCategoryScore) {
      topCategoryScore = score
      topCategoryId = id
    }
  }
  const categoryMaster =
    totalPositiveScore > 0 && topCategoryScore / totalPositiveScore > 0.5

  // Comeback Kid
  const lastMonthAvg =
    dailyValues.length >= 30
      ? dailyValues.slice(-60, -30).reduce((a, b) => a + b, 0) / 30
      : null
  const thisMonthAvg =
    dailyValues.length >= 1
      ? dailyValues.slice(-30).reduce((a, b) => a + b, 0) /
      Math.min(30, dailyValues.length)
      : 0
  const comebackKid =
    lastMonthAvg !== null && thisMonthAvg > lastMonthAvg * 1.2

  // Priority: determine single best label
  let label = "Explorer"
  let description = "You're just getting started. Keep logging!"

  if (threeMonthSlope > 0.1) {
    label = "Steady Climber"
    description = "Your score has trended upward over the last 3 months."
  } else if (avgWeekday > 0 && avgWeekend >= avgWeekday * 1.5) {
    label = "Weekend Warrior"
    description = "Your scores on weekends are consistently higher than weekdays."
  } else if (avgMorningScore !== null && avgEveningScore !== null && avgMorningScore >= avgEveningScore + 1) {
    label = "Morning Riser"
    description = "Entries logged in the morning score higher for you."
  } else if (avgEveningScore !== null && avgMorningScore !== null && avgEveningScore >= avgMorningScore + 1) {
    label = "Night Owl"
    description = "Your evening entries tend to score higher."
  } else if (last30Std < 2 && last30Values.length >= 10) {
    label = "Consistent"
    description = "Your scores have been steady with low variance over the last 30 days."
  } else if (last30Std > 5) {
    label = "High-Variance"
    description = "Big swings both ways — emotionally dynamic."
  } else if (reflectionsPerPoint > 2) {
    label = "Deep Reflector"
    description = "You add more reflections per entry than most. You're processing deeply."
  } else if (categoryMaster && topCategoryId) {
    const [cat] = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, topCategoryId))
    label = "Category Master"
    description = `${cat?.name ?? "One category"} drives over 50% of your positive score.`
  } else if (comebackKid) {
    label = "Comeback Kid"
    description = "Your score this month is more than 20% higher than last month."
  }

  return c.json({ label, description })
}

export async function getWrapped(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { month } = c.req.valid("query" as never) as { month?: string }

  const now = new Date()
  const targetDate = month
    ? new Date(month + "-01")
    : new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const year = targetDate.getFullYear()
  const mon = targetDate.getMonth() + 1
  const monthStr = `${year}-${String(mon).padStart(2, "0")}`
  const monthStart = `${monthStr}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const monthEnd = `${monthStr}-${String(lastDay).padStart(2, "0")}`

  const rows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
      title: journalPoints.title,
      categoryId: journalPoints.categoryId,
      isQuick: journalPoints.isQuick,
    })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, monthStart),
        lte(journalPoints.date, monthEnd),
      ),
    )

  if (rows.length === 0) {
    return c.json({ month: monthStr, empty: true })
  }

  const dailyMap = computeDailyScores(rows)
  const dailyValues = [...dailyMap.values()]
  const totalScore = dailyValues.reduce((a, b) => a + b, 0)

  let bestDay = { date: "", score: -Infinity }
  let worstDay = { date: "", score: Infinity }
  for (const [date, score] of dailyMap) {
    if (score > bestDay.score) bestDay = { date, score }
    if (score < worstDay.score) worstDay = { date, score }
  }

  // Best day title (first entry on that day)
  const bestDayTitle = rows.find((r) => r.date === bestDay.date && !r.isQuick)?.title ?? null
  const worstDayTitle = rows.find((r) => r.date === worstDay.date && !r.isQuick)?.title ?? null

  // Top category
  const categoryScores = new Map<string, number>()
  for (const row of rows) {
    if (!row.categoryId) continue
    const cur = categoryScores.get(row.categoryId) ?? 0
    if (row.tag === "positive") categoryScores.set(row.categoryId, cur + row.score)
    else if (row.tag === "negative") categoryScores.set(row.categoryId, cur - row.score)
  }
  let topCategoryId: string | null = null
  let topCategoryScore = -Infinity
  for (const [id, score] of categoryScores) {
    if (score > topCategoryScore) { topCategoryScore = score; topCategoryId = id }
  }

  const [topCategory] = topCategoryId
    ? await db.select().from(categories).where(eq(categories.id, topCategoryId))
    : [null]

  // Reflection count
  const reflectionRows = await db
    .select({ id: reflections.id })
    .from(reflections)
    .innerJoin(journalPoints, eq(reflections.journalPointId, journalPoints.id))
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, monthStart),
        lte(journalPoints.date, monthEnd),
      ),
    )

  // Streak peak this month (longest unbroken run)
  const sortedDates = [...dailyMap.keys()].sort()
  let streakPeak = 1
  let run = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = Math.floor(
      (new Date(sortedDates[i]).getTime() -
        new Date(sortedDates[i - 1]).getTime()) /
      (1000 * 60 * 60 * 24),
    )
    if (gap <= 2) { run++; streakPeak = Math.max(streakPeak, run) }
    else run = 1
  }

  // Score graph data
  const graphData: { date: string; score: number }[] = []
  const cursor = new Date(monthStart)
  const end = new Date(monthEnd)
  while (cursor <= end) {
    const ds = cursor.toISOString().slice(0, 10)
    graphData.push({ date: ds, score: dailyMap.get(ds) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  // Personality label for the month (re-use the logic inline)
  const trendValues = graphData.map((d) => d.score)
  const slope = trendValues.length >= 5
    ? (trendValues[trendValues.length - 1] - trendValues[0]) / trendValues.length
    : 0
  let personalityLabel = "Explorer"
  if (slope > 0.1) personalityLabel = "Steady Climber"
  else if (totalScore > dailyValues.length * 3) personalityLabel = "High Scorer"

  const quickEntries = rows.filter((r) => r.isQuick).length
  const fullEntries = rows.filter((r) => !r.isQuick).length

  return c.json({
    month: monthStr,
    empty: false,
    totalScore,
    bestDay: bestDay.date ? { ...bestDay, title: bestDayTitle } : null,
    worstDay: worstDay.date ? { ...worstDay, title: worstDayTitle } : null,
    personalityLabel,
    topCategory,
    entriesLogged: fullEntries,
    quickEntries,
    reflectionsAdded: reflectionRows.length,
    streakPeak,
    graphData,
  })
}

export async function getPercentile(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const todayStr = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const fromStr = thirtyDaysAgo.toISOString().slice(0, 10)

  // User's 30-day avg
  const userRows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
    })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, fromStr),
        lte(journalPoints.date, todayStr),
      ),
    )

  const userDailyMap = new Map<string, number>()
  for (const row of userRows) {
    const cur = userDailyMap.get(row.date) ?? 0
    if (row.tag === "positive") userDailyMap.set(row.date, cur + row.score)
    else if (row.tag === "negative") userDailyMap.set(row.date, cur - row.score)
    else userDailyMap.set(row.date, cur)
  }
  const userAvg =
    userDailyMap.size > 0
      ? [...userDailyMap.values()].reduce((a, b) => a + b, 0) / userDailyMap.size
      : 0

  // Get cohort: all users who have entries in this period (anonymized)
  const cohortRows = await db
    .select({
      userId: journalPoints.userId,
      score: journalPoints.score,
      tag: journalPoints.tag,
      date: journalPoints.date,
    })
    .from(journalPoints)
    .where(
      and(gte(journalPoints.date, fromStr), lte(journalPoints.date, todayStr)),
    )

  // Compute per-user averages
  const userAverages = new Map<string, { sum: number; dates: Set<string> }>()
  for (const row of cohortRows) {
    const entry = userAverages.get(row.userId) ?? { sum: 0, dates: new Set() }
    const dateScore = entry.sum
    userAverages.set(row.userId, entry)

    const dates = entry.dates
    dates.add(row.date)
    // We need per-date scores, so rebuild
  }

  // Simpler approach: compute daily avg per user
  const perUserDailyMap = new Map<string, Map<string, number>>()
  for (const row of cohortRows) {
    if (!perUserDailyMap.has(row.userId))
      perUserDailyMap.set(row.userId, new Map())
    const dMap = perUserDailyMap.get(row.userId)!
    const cur = dMap.get(row.date) ?? 0
    if (row.tag === "positive") dMap.set(row.date, cur + row.score)
    else if (row.tag === "negative") dMap.set(row.date, cur - row.score)
    else dMap.set(row.date, cur)
  }

  const cohortAverages: number[] = []
  for (const [uid, dMap] of perUserDailyMap) {
    if (dMap.size < 3) continue // skip users with < 3 days data
    const avg = [...dMap.values()].reduce((a, b) => a + b, 0) / dMap.size
    cohortAverages.push(avg)
  }

  if (cohortAverages.length < 2) {
    return c.json({ userAvg: Math.round(userAvg * 10) / 10, percentile: null, cohortSize: cohortAverages.length })
  }

  const below = cohortAverages.filter((a) => a < userAvg).length
  const percentile = Math.round((below / cohortAverages.length) * 100)

  return c.json({
    userAvg: Math.round(userAvg * 10) / 10,
    percentile,
    cohortSize: cohortAverages.length,
  })
}

export async function getScoreMilestones(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const rows = await db
    .select()
    .from(scoreMilestones)
    .where(eq(scoreMilestones.userId, userId))
    .orderBy(scoreMilestones.createdAt)

  // Mark as celebrated
  const uncelebrated = rows.filter((r) => !r.celebratedAt)
  if (uncelebrated.length > 0) {
    for (const row of uncelebrated) {
      await db
        .update(scoreMilestones)
        .set({ celebratedAt: new Date() })
        .where(eq(scoreMilestones.id, row.id))
    }
  }

  return c.json({ milestones: rows, newMilestones: uncelebrated })
}
