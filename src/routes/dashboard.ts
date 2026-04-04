import { Hono } from "hono"

import { getDashboardContext } from "../controllers/dashboard"

export const dashboardRouter = new Hono()

dashboardRouter.get("/context", getDashboardContext)
