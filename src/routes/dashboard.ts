import { Hono } from "hono"
import { requireAuth } from "../middlewares/auth"
import { getDashboardContext } from "../controllers/dashboard"

export const dashboardRouter = new Hono()

dashboardRouter.use("*", requireAuth)

dashboardRouter.get("/context", getDashboardContext)
