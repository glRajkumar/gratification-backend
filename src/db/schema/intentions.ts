import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { journalPoints } from "./journal"
import { categories } from "./categories"
import { users } from "./auth"

export const weeklyIntentions = pgTable(
  "weekly_intentions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    week: text("week").notNull(),
    intention: text("intention").notNull(),
    targetScore: integer("target_score"),
    focusCategoryId: text("focus_category_id").references(
      () => categories.id,
      { onDelete: "set null" },
    ),
    journalPointId: text("journal_point_id").references(
      () => journalPoints.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("weekly_intentions_userId_idx").on(t.userId),
    index("weekly_intentions_week_idx").on(t.week),
  ],
)
