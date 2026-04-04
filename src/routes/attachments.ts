import { Hono } from "hono"

import {
  uploadAttachments,
  deleteAttachmentById,
} from "../controllers/attachments"

const attachmentsRouter = new Hono()

attachmentsRouter.put("/:id", uploadAttachments)
attachmentsRouter.delete("/:id", deleteAttachmentById)

export { attachmentsRouter }
