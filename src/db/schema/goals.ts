import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { journalPoints } from "./journal"
import { categories } from "./categories"
import { users } from "./auth"

export const goals = pgTable(
  "goals",
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
    period: text("period", {
      enum: ["daily", "weekly", "monthly"],
    }).notNull(),
    targetCount: integer("target_count").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    status: text("status", {
      enum: ["active", "achieved", "partial", "missed"],
    })
      .default("active")
      .notNull(),
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
  (t) => [index("goals_userId_idx").on(t.userId)],
)

export const goalProgress = pgTable(
  "goal_progress",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    goalId: text("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    journalPointId: text("journal_point_id")
      .notNull()
      .references(() => journalPoints.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("goal_progress_goalId_idx").on(t.goalId)],
)
