import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth"
import {
  getChallengeToday,
  completeChallenge,
  getChallengeHistory,
} from "../controllers/challenges"
import type { AppEnv } from "../types/hono"

const challengesRouter = new Hono<AppEnv>()
challengesRouter.use(requireAuth)

challengesRouter.get("/today", getChallengeToday)
challengesRouter.get("/history", getChallengeHistory)
challengesRouter.post(
  "/complete",
  zv(
    "json",
    z.object({
      challengeKey: z.string(),
      journalPointId: z.string().optional(),
    }),
  ),
  completeChallenge,
)

export { challengesRouter }
