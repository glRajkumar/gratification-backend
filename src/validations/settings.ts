import { z } from "zod"

export const updateSettingsSchema = z.object({
  weekStartDay: z.enum(["monday", "sunday"]).optional(),
  defaultTag: z.enum(["positive", "neutral", "negative"]).optional(),
  defaultScore: z.number().int().min(1).max(10).optional(),
  showScoreOnDashboard: z.boolean().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  morningEveningMode: z.boolean().optional(),
  companionName: z.string().max(30).optional(),
  weeklyIntentionEnabled: z.boolean().optional(),
})
