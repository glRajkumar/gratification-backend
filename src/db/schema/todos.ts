import { date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { journalPoints } from "./journal"
import { categories } from "./categories"
import { users } from "./auth"

export const todos = pgTable(
  "todos",
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
    dueDate: date("due_date"),
    status: text("status", {
      enum: ["pending", "completed", "missed"],
    })
      .default("pending")
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
  (t) => [index("todos_userId_idx").on(t.userId)],
)
