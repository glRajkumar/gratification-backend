import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"

import {
  listJournalPoints,
  createJournalPoint,
  createQuickJournalPoint,
  getJournalPoint,
  updateJournalPoint,
  deleteJournalPoint,
  getDailyScore,
  addReflection,
  updateReflection,
  deleteReflection,
  getOnThisDay,
} from "../controllers/journal"
import { uploadAttachments } from "../controllers/attachments"
import {
  createJournalPointSchema,
  createQuickJournalPointSchema,
  updateJournalPointSchema,
  journalQuerySchema,
  scoreQuerySchema,
  journalIdSchema,
  createReflectionSchema,
  updateReflectionSchema,
} from "../validations/journal"

const journalRouter = new Hono()

journalRouter.get("/score", zv("query", scoreQuerySchema), getDailyScore)
journalRouter.get("/on-this-day", getOnThisDay)
journalRouter.post("/quick", zv("json", createQuickJournalPointSchema), createQuickJournalPoint)

journalRouter.get("/", zv("query", journalQuerySchema), listJournalPoints)
journalRouter.post("/", zv("json", createJournalPointSchema), createJournalPoint)
journalRouter.get("/:id", getJournalPoint)
journalRouter.put("/:id", zv("json", updateJournalPointSchema), updateJournalPoint)
journalRouter.delete("/:id", deleteJournalPoint)

journalRouter.post("/:id/reflections", zv("json", createReflectionSchema), addReflection)

journalRouter.post("/:id/attachments", uploadAttachments)

export { journalRouter }

const reflectionsRouter = new Hono()

reflectionsRouter.put("/:id", zv("json", updateReflectionSchema), updateReflection)
reflectionsRouter.delete("/:id", deleteReflection)

export { reflectionsRouter }
