import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { z } from "zod"
import { requireAuth } from "../middlewares/auth"
import { getCurrentIntention, setIntention } from "../controllers/intentions"
import type { AppEnv } from "../types/hono"

const intentionsRouter = new Hono<AppEnv>()
intentionsRouter.use(requireAuth)

intentionsRouter.get("/current", getCurrentIntention)
intentionsRouter.post(
  "/",
  zv(
    "json",
    z.object({
      intention: z.string().min(1).max(500),
      targetScore: z.number().int().min(-100).max(100).optional(),
      focusCategoryId: z.string().optional(),
    }),
  ),
  setIntention,
)

export { intentionsRouter }
