import { Hono } from "hono"
import { requireAuth } from "../middlewares/auth"
import { getStreaks } from "../controllers/streaks"
import type { AppEnv } from "../types/hono"

const streaksRouter = new Hono<AppEnv>()
streaksRouter.use(requireAuth)

streaksRouter.get("/", getStreaks)

export { streaksRouter }
