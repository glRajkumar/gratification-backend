import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "./auth"

export const achievements = pgTable(
  "achievements",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: [
        "first_entry",
        "week_warrior",
        "month_master",
        "score_100",
        "reflective",
        "goal_getter",
        "balanced",
        "deep_thinker",
      ],
    }).notNull(),
    unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  },
  (t) => [index("achievements_userId_idx").on(t.userId)],
)
