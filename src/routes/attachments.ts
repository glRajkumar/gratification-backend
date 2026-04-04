import { Hono } from "hono"
import { requireAuth } from "../middlewares/auth"
import {
  uploadAttachments,
  deleteAttachmentById,
} from "../controllers/attachments"
import type { AppEnv } from "../types/hono"

const attachmentsRouter = new Hono<AppEnv>()
attachmentsRouter.use(requireAuth)

attachmentsRouter.delete("/:id", deleteAttachmentById)

export { attachmentsRouter }
