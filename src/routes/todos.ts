import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { requireAuth } from "../middlewares/auth"
import {
  listTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  completeTodo,
} from "../controllers/todos"
import {
  createTodoSchema,
  updateTodoSchema,
  todoQuerySchema,
  completeTodoSchema,
} from "../validations/todos"
import type { AppEnv } from "../types/hono"

const todosRouter = new Hono<AppEnv>()

todosRouter.use(requireAuth)

todosRouter.get("/", zv("query", todoQuerySchema), listTodos)
todosRouter.post("/", zv("json", createTodoSchema), createTodo)
todosRouter.put("/:id", zv("json", updateTodoSchema), updateTodo)
todosRouter.delete("/:id", deleteTodo)
todosRouter.post("/:id/complete", zv("json", completeTodoSchema), completeTodo)

export { todosRouter }
