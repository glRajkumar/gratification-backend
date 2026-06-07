import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { users } from "./auth"

export const scoreMilestones = pgTable(
  "score_milestones",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "first_8_day",
        "personal_best_day",
        "first_positive_month",
        "best_month_ever",
        "better_floor",
        "comeback",
      ],
    }).notNull(),
    value: integer("value"),
    date: date("date").notNull(),
    celebratedAt: timestamp("celebrated_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("score_milestones_userId_idx").on(t.userId)],
)
