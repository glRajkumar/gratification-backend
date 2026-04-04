import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"

import {
  getScoreHistory,
  getHeatmap,
  getWeeklySummary,
  getCategoryBreakdown,
  getCorrelations,
  getCommunityStats,
} from "../controllers/analytics"
import {
  analyticsQuerySchema,
  heatmapQuerySchema,
  categoryBreakdownQuerySchema,
  weeklySummaryQuerySchema,
} from "../validations/journal"

const analyticsRouter = new Hono()

analyticsRouter.get("/score-history", zv("query", analyticsQuerySchema), getScoreHistory)
analyticsRouter.get("/heatmap", zv("query", heatmapQuerySchema), getHeatmap)
analyticsRouter.get("/weekly-summary", zv("query", weeklySummaryQuerySchema), getWeeklySummary)
analyticsRouter.get("/category-breakdown", zv("query", categoryBreakdownQuerySchema), getCategoryBreakdown)
analyticsRouter.get("/correlations", zv("query", analyticsQuerySchema), getCorrelations)
analyticsRouter.get("/community", getCommunityStats)

export { analyticsRouter }
