import { z } from "zod"

const tagEnum = z.enum(["positive", "negative", "neutral"])

const reflectionTypeEnum = z.enum([
  "positive_aspect",
  "negative_aspect",
  "lesson_learned",
  "alternative_action",
  "why_it_happened",
  "custom",
])

export const createJournalPointSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM")
    .optional(),
  categoryId: z.string().optional(),
  score: z.number().int().min(1).max(10).default(1),
  tag: tagEnum,
  mood: z.number().int().min(1).max(5).optional(),
})

export const updateJournalPointSchema = createJournalPointSchema.partial()

export const journalQuerySchema = z.object({
  date: z.string().optional(),
  week: z.string().optional(),
  month: z.string().optional(),
})

export const scoreQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
})

export const journalIdSchema = z.object({
  id: z.string(),
})

const cognitiveDistortionEnum = z.enum([
  "catastrophizing",
  "all_or_nothing",
  "mind_reading",
  "overgeneralization",
  "personalization",
  "emotional_reasoning",
  "should_statements",
  "labeling",
  "magnification",
])

export const createReflectionSchema = z.object({
  type: reflectionTypeEnum,
  content: z.string().min(1),
  cognitiveDistortion: cognitiveDistortionEnum.optional(),
})

export const updateReflectionSchema = createReflectionSchema.partial()

export const analyticsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
})

export const heatmapQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})

export const categoryBreakdownQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const weeklySummaryQuerySchema = z.object({
  week: z.string().optional(),
})

export const reflectionIdSchema = z.object({
  id: z.string(),
})
