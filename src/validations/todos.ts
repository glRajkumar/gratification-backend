import { z } from "zod"

export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  categoryId: z.string().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
    .optional(),
})

export const updateTodoSchema = createTodoSchema
  .extend({
    status: z.enum(["pending", "completed", "missed"]).optional(),
  })
  .partial()

export const todoQuerySchema = z.object({
  status: z.enum(["pending", "completed", "missed"]).optional(),
  date: z.string().optional(),
})

export const todoIdSchema = z.object({
  id: z.string(),
})

export const completeTodoSchema = z.object({
  createJournalPoint: z.boolean().default(false),
  journalPoint: z
    .object({
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      score: z.number().int().min(1).max(10).default(1),
      tag: z.enum(["positive", "negative", "neutral"]),
    })
    .optional(),
})
