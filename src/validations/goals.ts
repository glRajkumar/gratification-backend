import { z } from "zod"

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  categoryId: z.string().optional(),
  period: z.enum(["daily", "weekly", "monthly"]),
  targetCount: z.number().int().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
})

export const updateGoalSchema = createGoalSchema.partial()

export const goalQuerySchema = z.object({
  status: z.enum(["active", "achieved", "partial", "missed"]).optional(),
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
})

export const goalIdSchema = z.object({
  id: z.string(),
})

export const addProgressSchema = z.object({
  journalPointId: z.string(),
})

export const closeGoalSchema = z.object({
  status: z.enum(["achieved", "partial", "missed"]),
  summaryNote: z.string().optional(),
})
