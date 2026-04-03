import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { requireAuth } from "../middlewares/auth"
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categories"
import {
  createCategorySchema,
  updateCategorySchema,
} from "../validations/categories"
import type { AppEnv } from "../types/hono"

const categoriesRouter = new Hono<AppEnv>()

categoriesRouter.use(requireAuth)

categoriesRouter.get("/", listCategories)
categoriesRouter.post("/", zv("json", createCategorySchema), createCategory)
categoriesRouter.put("/:id", zv("json", updateCategorySchema), updateCategory)
categoriesRouter.delete("/:id", deleteCategory)

export { categoriesRouter }
