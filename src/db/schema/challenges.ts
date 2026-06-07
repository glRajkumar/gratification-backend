import { date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { journalPoints } from "./journal"
import { users } from "./auth"

export const challengeCompletions = pgTable(
  "challenge_completions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    challengeKey: text("challenge_key").notNull(),
    journalPointId: text("journal_point_id").references(
      () => journalPoints.id,
      { onDelete: "set null" },
    ),
    date: date("date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("challenge_completions_userId_idx").on(t.userId),
    index("challenge_completions_date_idx").on(t.date),
  ],
)
