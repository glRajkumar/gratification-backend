import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"

import {
  listGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addGoalProgress,
  closeGoal,
} from "../controllers/goals"
import {
  createGoalSchema,
  updateGoalSchema,
  goalQuerySchema,
  addProgressSchema,
  closeGoalSchema,
} from "../validations/goals"

const goalsRouter = new Hono()

goalsRouter.get("/", zv("query", goalQuerySchema), listGoals)
goalsRouter.post("/", zv("json", createGoalSchema), createGoal)
goalsRouter.put("/:id", zv("json", updateGoalSchema), updateGoal)
goalsRouter.delete("/:id", deleteGoal)
goalsRouter.post("/:id/progress", zv("json", addProgressSchema), addGoalProgress)
goalsRouter.post("/:id/close", zv("json", closeGoalSchema), closeGoal)

export { goalsRouter }
