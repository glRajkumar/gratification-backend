import { and, eq, gte, lte } from "drizzle-orm"
import type { Context } from "hono"
import { db } from "../lib/db"
import { categories, journalPoints, todos, goals } from "../db/schema/app"
import type { AppEnv } from "../types/hono"

function weekBounds(weekStr: string): { start: string; end: string } {
  const [year, week] = weekStr.split("-W").map(Number)
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const start = new Date(startOfWeek1)
  start.setDate(startOfWeek1.getDate() + (week - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

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

function computeDailyScores(
  rows: { date: string; score: number; tag: string }[],
): Map<string, number> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const current = map.get(row.date) ?? 0
    if (row.tag === "positive") map.set(row.date, current + row.score)
    else if (row.tag === "negative") map.set(row.date, current - row.score)
    else map.set(row.date, current)
  }
  return map
}

export async function getScoreHistory(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { days } = c.req.valid("query" as never) as { days?: number }
  const daysCount = days ?? 30

  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - daysCount + 1)
  const fromStr = fromDate.toISOString().slice(0, 10)
  const todayStr = new Date().toISOString().slice(0, 10)

  const rows = await db
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

  const dateMap = computeDailyScores(rows)

  const data: { date: string; score: number }[] = []
  const cursor = new Date(fromStr)
  const today = new Date(todayStr)
  while (cursor <= today) {
    const dateStr = cursor.toISOString().slice(0, 10)
    data.push({ date: dateStr, score: dateMap.get(dateStr) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
  }

  const rollingAvg = data.map((_, i) => {
    const window = data.slice(Math.max(0, i - 6), i + 1)
    const avg = window.reduce((sum, x) => sum + x.score, 0) / window.length
    return { date: data[i].date, avg: Math.round(avg * 10) / 10 }
  })

  return c.json({ data, rollingAvg })
}

export async function getHeatmap(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { year } = c.req.valid("query" as never) as { year?: number }
  const targetYear = year ?? new Date().getFullYear()

  const fromStr = `${targetYear}-01-01`
  const toStr = `${targetYear}-12-31`

  const rows = await db
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
        lte(journalPoints.date, toStr),
      ),
    )

  const dateMap = computeDailyScores(rows)
  const result: { date: string; score: number }[] = []
  for (const [date, score] of dateMap) {
    result.push({ date, score })
  }

  return c.json(result)
}

export async function getWeeklySummary(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { week } = c.req.valid("query" as never) as { week?: string }
  const weekStr = week ?? currentWeekStr()

  const { start, end } = weekBounds(weekStr)
  const prevWeekDate = new Date(start)
  prevWeekDate.setDate(prevWeekDate.getDate() - 7)
  const prevWeekStr = `${prevWeekDate.getFullYear()}-W${String(
    Math.ceil(
      (prevWeekDate.getDate() -
        prevWeekDate.getDay() +
        (prevWeekDate.getDay() === 0 ? -6 : 1) +
        new Date(prevWeekDate.getFullYear(), 0, 4).getDay() -
        1) /
        7,
    ) + 1,
  ).padStart(2, "0")}`
  const { start: prevStart, end: prevEnd } = weekBounds(prevWeekStr)

  const thisWeekRows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
      categoryId: journalPoints.categoryId,
    })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, start),
        lte(journalPoints.date, end),
      ),
    )

  const prevWeekRows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
    })
    .from(journalPoints)
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, prevStart),
        lte(journalPoints.date, prevEnd),
      ),
    )

  const thisWeekDateMap = computeDailyScores(thisWeekRows)
  const prevWeekScore = [...computeDailyScores(prevWeekRows).values()].reduce(
    (a, b) => a + b,
    0,
  )
  const totalScore = [...thisWeekDateMap.values()].reduce((a, b) => a + b, 0)

  let bestDay = { date: "", score: -Infinity }
  let worstDay = { date: "", score: Infinity }
  for (const [date, score] of thisWeekDateMap) {
    if (score > bestDay.score) bestDay = { date, score }
    if (score < worstDay.score) worstDay = { date, score }
  }

  const categoryCounts = new Map<string, { positive: number; negative: number }>()
  for (const row of thisWeekRows) {
    if (!row.categoryId) continue
    const entry = categoryCounts.get(row.categoryId) ?? { positive: 0, negative: 0 }
    if (row.tag === "positive") entry.positive++
    else if (row.tag === "negative") entry.negative++
    categoryCounts.set(row.categoryId, entry)
  }

  let topPositiveCategoryId: string | null = null
  let topNegativeCategoryId: string | null = null
  let maxPos = 0
  let maxNeg = 0
  for (const [id, counts] of categoryCounts) {
    if (counts.positive > maxPos) { maxPos = counts.positive; topPositiveCategoryId = id }
    if (counts.negative > maxNeg) { maxNeg = counts.negative; topNegativeCategoryId = id }
  }

  const [topPosCategory] = topPositiveCategoryId
    ? await db.select().from(categories).where(eq(categories.id, topPositiveCategoryId))
    : [null]
  const [topNegCategory] = topNegativeCategoryId
    ? await db.select().from(categories).where(eq(categories.id, topNegativeCategoryId))
    : [null]

  const completedTodos = await db
    .select({ id: todos.id })
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        eq(todos.status, "completed"),
        gte(todos.updatedAt, new Date(start)),
        lte(todos.updatedAt, new Date(end + "T23:59:59")),
      ),
    )

  const activeGoals = await db
    .select({ id: goals.id })
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active")))

  const scoreVsPrevWeek = totalScore - prevWeekScore
  const summaryParts: string[] = []
  if (totalScore > 0) {
    summaryParts.push(
      scoreVsPrevWeek > 0
        ? `Strong week — you scored +${totalScore}, up ${scoreVsPrevWeek} from last week.`
        : `You scored +${totalScore} this week.`,
    )
  } else if (totalScore < 0) {
    summaryParts.push(`Tough week with a score of ${totalScore}.`)
  } else {
    summaryParts.push("A neutral week — your score balanced out.")
  }
  if (topPosCategory)
    summaryParts.push(`${topPosCategory.name} drove most of your positive score.`)
  if (topNegCategory && topNegCategory.id !== topPosCategory?.id)
    summaryParts.push(`${topNegCategory.name} weighed on your score.`)

  return c.json({
    week: weekStr,
    start,
    end,
    totalScore,
    prevWeekScore,
    scoreVsPrevWeek,
    bestDay: bestDay.date ? bestDay : null,
    worstDay: worstDay.date ? worstDay : null,
    topPositiveCategory: topPosCategory,
    topNegativeCategory: topNegCategory,
    todosCompleted: completedTodos.length,
    activeGoals: activeGoals.length,
    summary: summaryParts.join(" "),
  })
}

export async function getCategoryBreakdown(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { from, to } = c.req.valid("query" as never) as {
    from?: string
    to?: string
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const fromStr = from ?? thirtyDaysAgo.toISOString().slice(0, 10)
  const toStr = to ?? todayStr

  const rows = await db
    .select({
      score: journalPoints.score,
      tag: journalPoints.tag,
      categoryId: journalPoints.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
    })
    .from(journalPoints)
    .leftJoin(categories, eq(journalPoints.categoryId, categories.id))
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, fromStr),
        lte(journalPoints.date, toStr),
      ),
    )

  const breakdown = new Map<
    string,
    {
      categoryId: string
      categoryName: string
      categoryColor: string
      categoryIcon: string
      score: number
      positiveCount: number
      negativeCount: number
    }
  >()

  for (const row of rows) {
    const key = row.categoryId ?? "__none__"
    const name = row.categoryName ?? "Uncategorized"
    const color = row.categoryColor ?? "#94a3b8"
    const icon = row.categoryIcon ?? "○"

    const entry = breakdown.get(key) ?? {
      categoryId: key,
      categoryName: name,
      categoryColor: color,
      categoryIcon: icon,
      score: 0,
      positiveCount: 0,
      negativeCount: 0,
    }

    if (row.tag === "positive") {
      entry.score += row.score
      entry.positiveCount++
    } else if (row.tag === "negative") {
      entry.score -= row.score
      entry.negativeCount++
    }

    breakdown.set(key, entry)
  }

  const result = [...breakdown.values()].sort((a, b) => b.score - a.score)
  return c.json(result)
}

export async function getCorrelations(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { days } = c.req.valid("query" as never) as { days?: number }
  const daysCount = days ?? 30

  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - daysCount + 1)
  const fromStr = fromDate.toISOString().slice(0, 10)
  const todayStr = new Date().toISOString().slice(0, 10)

  const rows = await db
    .select({
      date: journalPoints.date,
      score: journalPoints.score,
      tag: journalPoints.tag,
      categoryId: journalPoints.categoryId,
      categoryName: categories.name,
    })
    .from(journalPoints)
    .leftJoin(categories, eq(journalPoints.categoryId, categories.id))
    .where(
      and(
        eq(journalPoints.userId, userId),
        gte(journalPoints.date, fromStr),
        lte(journalPoints.date, todayStr),
      ),
    )

  const dailyData = new Map<
    string,
    { score: number; categories: Set<string> }
  >()

  for (const row of rows) {
    const entry = dailyData.get(row.date) ?? {
      score: 0,
      categories: new Set<string>(),
    }
    if (row.tag === "positive") entry.score += row.score
    else if (row.tag === "negative") entry.score -= row.score
    if (row.categoryId) entry.categories.add(row.categoryId)
    dailyData.set(row.date, entry)
  }

  const categoryNames = new Map<string, string>()
  for (const row of rows) {
    if (row.categoryId && row.categoryName)
      categoryNames.set(row.categoryId, row.categoryName)
  }

  const allDailyScores = [...dailyData.values()].map((d) => d.score)
  const allDates = [...dailyData.keys()]

  const correlations: {
    categoryId: string
    categoryName: string
    daysWithCategory: number
    avgScoreWithCategory: number
    avgScoreWithoutCategory: number
    percentDiff: number
  }[] = []

  for (const [categoryId, categoryName] of categoryNames) {
    const withScores = allDates
      .filter((d) => dailyData.get(d)!.categories.has(categoryId))
      .map((d) => dailyData.get(d)!.score)
    const withoutScores = allDates
      .filter((d) => !dailyData.get(d)!.categories.has(categoryId))
      .map((d) => dailyData.get(d)!.score)

    if (withScores.length < 3) continue

    const avgWith = withScores.reduce((a, b) => a + b, 0) / withScores.length
    const avgWithout =
      withoutScores.length > 0
        ? withoutScores.reduce((a, b) => a + b, 0) / withoutScores.length
        : 0

    const base = Math.abs(avgWithout) || 1
    const percentDiff = Math.round(((avgWith - avgWithout) / base) * 100)

    correlations.push({
      categoryId,
      categoryName,
      daysWithCategory: withScores.length,
      avgScoreWithCategory: Math.round(avgWith * 10) / 10,
      avgScoreWithoutCategory: Math.round(avgWithout * 10) / 10,
      percentDiff,
    })
  }

  correlations.sort((a, b) => b.percentDiff - a.percentDiff)
  const top2Positive = correlations.filter((c) => c.percentDiff > 0).slice(0, 2)
  const top1Negative = correlations.filter((c) => c.percentDiff < 0).slice(0, 1)

  return c.json([...top2Positive, ...top1Negative])
}
