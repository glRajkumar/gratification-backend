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

export const createReflectionSchema = z.object({
  type: reflectionTypeEnum,
  content: z.string().min(1),
})

export const updateReflectionSchema = createReflectionSchema.partial()

export const reflectionIdSchema = z.object({
  id: z.string(),
})
