import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { categories } from "./categories"
import { users } from "./auth"

export const habits = pgTable(
  "habits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    frequency: text("frequency", {
      enum: ["daily", "weekdays", "weekends", "custom"],
    })
      .default("daily")
      .notNull(),
    customDays: text("custom_days"),
    targetCount: integer("target_count").default(1).notNull(),
    color: text("color").notNull().default("#10b981"),
    icon: text("icon").notNull().default("◉"),
    autoJournalOnComplete: boolean("auto_journal_on_complete")
      .default(false)
      .notNull(),
    autoJournalOnMiss: boolean("auto_journal_on_miss")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (t) => [index("habits_userId_idx").on(t.userId)],
)

export const habitEntries = pgTable(
  "habit_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    completed: boolean("completed").default(false).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("habit_entries_habitId_idx").on(t.habitId),
    index("habit_entries_userId_date_idx").on(t.userId, t.date),
  ],
)
