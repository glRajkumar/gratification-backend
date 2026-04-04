import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"

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

const categoriesRouter = new Hono()

categoriesRouter.get("/", listCategories)
categoriesRouter.post("/", zv("json", createCategorySchema), createCategory)
categoriesRouter.put("/:id", zv("json", updateCategorySchema), updateCategory)
categoriesRouter.delete("/:id", deleteCategory)

export { categoriesRouter }
