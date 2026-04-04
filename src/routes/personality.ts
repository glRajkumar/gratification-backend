import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { z } from "zod"

import {
  getPersonality,
  getWrapped,
  getPercentile,
  getScoreMilestones,
} from "../controllers/personality"

const personalityRouter = new Hono()

personalityRouter.get("/personality", getPersonality)
personalityRouter.get("/wrapped", zv("query", z.object({ month: z.string().optional() })), getWrapped)
personalityRouter.get("/percentile", getPercentile)
personalityRouter.get("/milestones", getScoreMilestones)

export { personalityRouter }
