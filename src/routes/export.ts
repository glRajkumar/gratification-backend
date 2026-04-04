import { Hono } from "hono"
import { exportData } from "../controllers/export"

const exportRouter = new Hono()

exportRouter.get("/", exportData)

export { exportRouter }
