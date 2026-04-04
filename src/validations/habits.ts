import { z } from "zod"

export const createHabitSchema = z.object({
  title: z.string().min(1).max(200),
  categoryId: z.string().optional(),
  frequency: z.enum(["daily", "weekdays", "weekends", "custom"]).default("daily"),
  customDays: z.string().optional(),
  targetCount: z.number().int().min(1).default(1),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#10b981"),
  icon: z.string().min(1).default("◉"),
  autoJournalOnComplete: z.boolean().default(false),
  autoJournalOnMiss: z.boolean().default(false),
})

export const updateHabitSchema = createHabitSchema.partial()

export const checkHabitSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  completed: z.boolean(),
  note: z.string().optional(),
})

export const habitStatsQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(365).default(30),
})
