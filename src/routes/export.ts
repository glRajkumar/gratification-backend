import { Hono } from "hono"
import { requireAuth } from "../middlewares/auth"
import { exportData } from "../controllers/export"
import type { AppEnv } from "../types/hono"

const exportRouter = new Hono<AppEnv>()
exportRouter.use(requireAuth)

exportRouter.get("/", exportData)

export { exportRouter }
