import { Hono } from "hono"
import { requireAuth } from "../middlewares/auth"
import { getAchievements } from "../controllers/achievements"
import type { AppEnv } from "../types/hono"

const achievementsRouter = new Hono<AppEnv>()
achievementsRouter.use(requireAuth)

achievementsRouter.get("/", getAchievements)

export { achievementsRouter }
