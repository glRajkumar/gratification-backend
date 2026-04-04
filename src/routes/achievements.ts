import { Hono } from "hono"
import { getAchievements } from "../controllers/achievements"

const achievementsRouter = new Hono()

achievementsRouter.get("/", getAchievements)

export { achievementsRouter }
