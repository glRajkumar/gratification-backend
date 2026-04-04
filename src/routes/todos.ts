import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"

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

const todosRouter = new Hono()

todosRouter.get("/", zv("query", todoQuerySchema), listTodos)
todosRouter.post("/", zv("json", createTodoSchema), createTodo)
todosRouter.put("/:id", zv("json", updateTodoSchema), updateTodo)
todosRouter.delete("/:id", deleteTodo)
todosRouter.post("/:id/complete", zv("json", completeTodoSchema), completeTodo)

export { todosRouter }
