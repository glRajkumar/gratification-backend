import { z } from "zod"

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
  icon: z.string().min(1).max(10),
})

export const updateCategorySchema = createCategorySchema.partial()

export const categoryIdSchema = z.object({
  id: z.string(),
})
