import { relations } from "drizzle-orm"

import { journalPoints, reflections } from "./journal"
import { challengeCompletions } from "./challenges"
import { habits, habitEntries } from "./habits"
import { goals, goalProgress } from "./goals"
import { weeklyIntentions } from "./intentions"
import { scoreMilestones } from "./milestones"
import { streakPartners } from "./streaks"
import { achievements } from "./achievements"
import { userSettings } from "./settings"
import { attachments } from "./attachments"
import { categories } from "./categories"
import { todos } from "./todos"
import { users } from "./auth"

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

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  journalPoint: one(journalPoints, {
    fields: [attachments.journalPointId],
    references: [journalPoints.id],
  }),
  user: one(users, { fields: [attachments.userId], references: [users.id] }),
}))

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
