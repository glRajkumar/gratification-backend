import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth"
import {
  getPersonality,
  getWrapped,
  getPercentile,
  getScoreMilestones,
} from "../controllers/personality"
import type { AppEnv } from "../types/hono"

const personalityRouter = new Hono<AppEnv>()
personalityRouter.use(requireAuth)

personalityRouter.get("/personality", getPersonality)
personalityRouter.get(
  "/wrapped",
  zv("query", z.object({ month: z.string().optional() })),
  getWrapped,
)
personalityRouter.get("/percentile", getPercentile)
personalityRouter.get("/milestones", getScoreMilestones)

export { personalityRouter }
