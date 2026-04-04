import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"

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

const habitsRouter = new Hono()

habitsRouter.get("/", listHabits)
habitsRouter.post("/", zv("json", createHabitSchema), createHabit)
habitsRouter.put("/:id", zv("json", updateHabitSchema), updateHabit)
habitsRouter.delete("/:id", archiveHabit)
habitsRouter.post("/:id/check", zv("json", checkHabitSchema), checkHabit)
habitsRouter.get("/:id/stats", zv("query", habitStatsQuerySchema), getHabitStats)

export { habitsRouter }
