import { relations } from "drizzle-orm"
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  real,
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
    attachments: many(attachments),
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

export const attachments = pgTable(
  "attachments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    journalPointId: text("journal_point_id")
      .notNull()
      .references(() => journalPoints.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type", { enum: ["image", "audio", "video"] }).notNull(),
    url: text("url").notNull(),
    publicId: text("public_id").notNull(),
    filename: text("filename"),
    size: integer("size"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("attachments_journalPointId_idx").on(t.journalPointId),
    index("attachments_userId_idx").on(t.userId),
  ],
)

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

export const achievementsRelations = relations(achievements, ({ one }) => ({
  user: one(users, { fields: [achievements.userId], references: [users.id] }),
}))

export const habitsRelations = relations(habits, ({ one, many }) => ({
  user: one(users, { fields: [habits.userId], references: [users.id] }),
  category: one(categories, {
    fields: [habits.categoryId],
    references: [categories.id],
  }),
  entries: many(habitEntries),
}))

export const habitEntriesRelations = relations(habitEntries, ({ one }) => ({
  habit: one(habits, {
    fields: [habitEntries.habitId],
    references: [habits.id],
  }),
  user: one(users, { fields: [habitEntries.userId], references: [users.id] }),
}))

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}))

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  journalPoint: one(journalPoints, {
    fields: [attachments.journalPointId],
    references: [journalPoints.id],
  }),
  user: one(users, { fields: [attachments.userId], references: [users.id] }),
}))

export const streakPartners = pgTable(
  "streak_partners",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    partnerId: text("partner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", {
      enum: ["pending", "active", "declined"],
    })
      .default("pending")
      .notNull(),
    currentStreak: integer("current_streak").default(0).notNull(),
    longestStreak: integer("longest_streak").default(0).notNull(),
    startDate: date("start_date"),
    inviteToken: text("invite_token").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("streak_partners_userId_idx").on(t.userId),
    index("streak_partners_partnerId_idx").on(t.partnerId),
  ],
)

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

export const streakPartnersRelations = relations(
  streakPartners,
  ({ one }) => ({
    user: one(users, {
      fields: [streakPartners.userId],
      references: [users.id],
      relationName: "partnershipUser",
    }),
    partner: one(users, {
      fields: [streakPartners.partnerId],
      references: [users.id],
      relationName: "partnershipPartner",
    }),
  }),
)

export const scoreMilestonesRelations = relations(
  scoreMilestones,
  ({ one }) => ({
    user: one(users, {
      fields: [scoreMilestones.userId],
      references: [users.id],
    }),
  }),
)

export const challengeCompletionsRelations = relations(
  challengeCompletions,
  ({ one }) => ({
    user: one(users, {
      fields: [challengeCompletions.userId],
      references: [users.id],
    }),
    journalPoint: one(journalPoints, {
      fields: [challengeCompletions.journalPointId],
      references: [journalPoints.id],
    }),
  }),
)

export const weeklyIntentionsRelations = relations(
  weeklyIntentions,
  ({ one }) => ({
    user: one(users, {
      fields: [weeklyIntentions.userId],
      references: [users.id],
    }),
    focusCategory: one(categories, {
      fields: [weeklyIntentions.focusCategoryId],
      references: [categories.id],
    }),
    journalPoint: one(journalPoints, {
      fields: [weeklyIntentions.journalPointId],
      references: [journalPoints.id],
    }),
  }),
)
