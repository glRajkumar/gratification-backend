import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { journalPoints } from "./journal"
import { users } from "./auth"

export const attachments = pgTable(
  "attachments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    journalPointId: text("journal_point_id")
      .notNull()
      .references(() => journalPoints.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["image", "audio", "video"] }).notNull(),
    url: text("url").notNull(),
    publicId: text("public_id").notNull(),
    filename: text("filename"),
    size: integer("size"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("attachments_journalPointId_idx").on(t.journalPointId),
    index("attachments_userId_idx").on(t.userId),
  ],
)
