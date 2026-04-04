import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { z } from "zod"

import {
  getStreaks,
  freezeStreak,
  invitePartner,
  acceptPartner,
  removePartner,
} from "../controllers/streaks"

const streaksRouter = new Hono()

streaksRouter.get("/", getStreaks)
streaksRouter.post("/freeze", freezeStreak)
streaksRouter.post("/partner/invite", zv("json", z.object({ email: z.email() })), invitePartner)
streaksRouter.post("/partner/accept", zv("json", z.object({ token: z.string() })), acceptPartner)
streaksRouter.delete("/partner", removePartner)

export { streaksRouter }
