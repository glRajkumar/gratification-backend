import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"

import { getSettings, updateSettings } from "../controllers/settings"
import { updateSettingsSchema } from "../validations/settings"

const settingsRouter = new Hono()

settingsRouter.get("/", getSettings)
settingsRouter.put("/", zv("json", updateSettingsSchema), updateSettings)

export { settingsRouter }
