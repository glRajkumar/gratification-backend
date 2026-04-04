import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { z } from "zod"

import {
  getChallengeToday,
  completeChallenge,
  getChallengeHistory,
} from "../controllers/challenges"

const challengesRouter = new Hono()

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
