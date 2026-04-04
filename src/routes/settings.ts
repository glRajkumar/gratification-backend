import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { requireAuth } from "../middlewares/auth"
import { getSettings, updateSettings } from "../controllers/settings"
import { updateSettingsSchema } from "../validations/settings"
import type { AppEnv } from "../types/hono"

const settingsRouter = new Hono<AppEnv>()
settingsRouter.use(requireAuth)

settingsRouter.get("/", getSettings)
settingsRouter.put("/", zv("json", updateSettingsSchema), updateSettings)

export { settingsRouter }
