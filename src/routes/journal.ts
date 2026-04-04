import { Hono } from "hono"
import { zValidator as zv } from "@hono/zod-validator"
import { requireAuth } from "../middlewares/auth"
import {
  listJournalPoints,
  createJournalPoint,
  getJournalPoint,
  updateJournalPoint,
  deleteJournalPoint,
  getDailyScore,
  addReflection,
  updateReflection,
  deleteReflection,
  getOnThisDay,
} from "../controllers/journal"
import {
  createJournalPointSchema,
  updateJournalPointSchema,
  journalQuerySchema,
  scoreQuerySchema,
  journalIdSchema,
  createReflectionSchema,
  updateReflectionSchema,
} from "../validations/journal"
import type { AppEnv } from "../types/hono"

const journalRouter = new Hono<AppEnv>()

journalRouter.use(requireAuth)

// Named endpoints first (before /:id) to avoid route conflicts
journalRouter.get("/score", zv("query", scoreQuerySchema), getDailyScore)
journalRouter.get("/on-this-day", getOnThisDay)

journalRouter.get("/", zv("query", journalQuerySchema), listJournalPoints)
journalRouter.post("/", zv("json", createJournalPointSchema), createJournalPoint)
journalRouter.get("/:id", getJournalPoint)
journalRouter.put("/:id", zv("json", updateJournalPointSchema), updateJournalPoint)
journalRouter.delete("/:id", deleteJournalPoint)

journalRouter.post(
  "/:id/reflections",
  zv("json", createReflectionSchema),
  addReflection,
)

export { journalRouter }

// Standalone reflections router (mounted separately at /reflections)
const reflectionsRouter = new Hono<AppEnv>()

reflectionsRouter.use(requireAuth)

reflectionsRouter.put("/:id", zv("json", updateReflectionSchema), updateReflection)
reflectionsRouter.delete("/:id", deleteReflection)

export { reflectionsRouter }
