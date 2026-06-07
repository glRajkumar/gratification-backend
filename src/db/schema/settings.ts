import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { users } from "./auth"

export const userSettings = pgTable("user_settings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  weekStartDay: text("week_start_day", { enum: ["monday", "sunday"] })
    .default("monday")
    .notNull(),
  defaultTag: text("default_tag", {
    enum: ["positive", "neutral", "negative"],
  })
    .default("positive")
    .notNull(),
  defaultScore: integer("default_score").default(1).notNull(),
  showScoreOnDashboard: boolean("show_score_on_dashboard")
    .default(true)
    .notNull(),
  theme: text("theme", { enum: ["light", "dark", "system"] })
    .default("system")
    .notNull(),
  freezeTokens: integer("freeze_tokens").default(0).notNull(),
  morningEveningMode: boolean("morning_evening_mode").default(false).notNull(),
  companionName: text("companion_name"),
  weeklyIntentionEnabled: boolean("weekly_intention_enabled")
    .default(true)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})
