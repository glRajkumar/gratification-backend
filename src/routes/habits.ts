import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { requireAuth } from "../middlewares/auth"
import {
  listHabits,
  createHabit,
  updateHabit,
  archiveHabit,
  checkHabit,
  getHabitStats,
} from "../controllers/habits"
import {
  createHabitSchema,
  updateHabitSchema,
  checkHabitSchema,
  habitStatsQuerySchema,
} from "../validations/habits"
import type { AppEnv } from "../types/hono"

const habitsRouter = new Hono<AppEnv>()
habitsRouter.use(requireAuth)

habitsRouter.get("/", listHabits)
habitsRouter.post("/", zv("json", createHabitSchema), createHabit)
habitsRouter.put("/:id", zv("json", updateHabitSchema), updateHabit)
habitsRouter.delete("/:id", archiveHabit)
habitsRouter.post("/:id/check", zv("json", checkHabitSchema), checkHabit)
habitsRouter.get(
  "/:id/stats",
  zv("query", habitStatsQuerySchema),
  getHabitStats,
)

export { habitsRouter }
