import { relations } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { users } from "./auth"

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull(),
    icon: text("icon").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("categories_userId_idx").on(t.userId)],
)

export const journalPoints = pgTable(
  "journal_points",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    date: date("date").notNull(),
    time: text("time"),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    score: integer("score").default(1).notNull(),
    tag: text("tag", {
      enum: ["positive", "negative", "neutral"],
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("journal_points_userId_idx").on(t.userId),
    index("journal_points_date_idx").on(t.date),
  ],
)

export const reflections = pgTable("reflections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  journalPointId: text("journal_point_id")
    .notNull()
    .references(() => journalPoints.id, { onDelete: "cascade" }),
  type: text("type", {
    enum: [
      "positive_aspect",
      "negative_aspect",
      "lesson_learned",
      "alternative_action",
      "why_it_happened",
      "custom",
    ],
  }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

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

// Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, { fields: [categories.userId], references: [users.id] }),
  journalPoints: many(journalPoints),
  todos: many(todos),
  goals: many(goals),
}))

export const journalPointsRelations = relations(
  journalPoints,
  ({ one, many }) => ({
    user: one(users, {
      fields: [journalPoints.userId],
      references: [users.id],
    }),
    category: one(categories, {
      fields: [journalPoints.categoryId],
      references: [categories.id],
    }),
    reflections: many(reflections),
    goalProgress: many(goalProgress),
  }),
)

export const reflectionsRelations = relations(reflections, ({ one }) => ({
  journalPoint: one(journalPoints, {
    fields: [reflections.journalPointId],
    references: [journalPoints.id],
  }),
}))

export const todosRelations = relations(todos, ({ one }) => ({
  user: one(users, { fields: [todos.userId], references: [users.id] }),
  category: one(categories, {
    fields: [todos.categoryId],
    references: [categories.id],
  }),
  journalPoint: one(journalPoints, {
    fields: [todos.journalPointId],
    references: [journalPoints.id],
  }),
}))

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  category: one(categories, {
    fields: [goals.categoryId],
    references: [categories.id],
  }),
  journalPoint: one(journalPoints, {
    fields: [goals.journalPointId],
    references: [journalPoints.id],
  }),
  progress: many(goalProgress),
}))

export const goalProgressRelations = relations(goalProgress, ({ one }) => ({
  goal: one(goals, { fields: [goalProgress.goalId], references: [goals.id] }),
  journalPoint: one(journalPoints, {
    fields: [goalProgress.journalPointId],
    references: [journalPoints.id],
  }),
}))
