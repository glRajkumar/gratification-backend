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
    mood: integer("mood"),
    isQuick: boolean("is_quick").default(false).notNull(),
    entryMode: text("entry_mode", { enum: ["morning", "evening"] }),
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
  cognitiveDistortion: text("cognitive_distortion", {
    enum: [
      "catastrophizing",
      "all_or_nothing",
      "mind_reading",
      "overgeneralization",
      "personalization",
      "emotional_reasoning",
      "should_statements",
      "labeling",
      "magnification",
    ],
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
