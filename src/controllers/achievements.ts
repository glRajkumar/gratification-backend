import { eq } from "drizzle-orm"
import type { Context } from "hono"
import { db } from "../lib/db"
import { achievements } from "../db/schema/app"
import type { AppEnv } from "../types/hono"

const ACHIEVEMENT_META: Record<
  string,
  { label: string; description: string; icon: string }
> = {
  first_entry: {
    label: "First Entry",
    description: "Logged your first journal point.",
    icon: "◉",
  },
  week_warrior: {
    label: "Week Warrior",
    description: "Maintained a 7-day streak.",
    icon: "◎",
  },
  month_master: {
    label: "Month Master",
    description: "Maintained a 30-day streak.",
    icon: "◈",
  },
  score_100: {
    label: "Score 100",
    description: "Reached a cumulative score of 100.",
    icon: "◆",
  },
  reflective: {
    label: "Reflective",
    description: "Added 10 reflections.",
    icon: "◐",
  },
  goal_getter: {
    label: "Goal Getter",
    description: "Closed a goal as achieved.",
    icon: "◑",
  },
  balanced: {
    label: "Balanced",
    description: "Logged entries in 3+ categories in one day.",
    icon: "◒",
  },
  deep_thinker: {
    label: "Deep Thinker",
    description: "Added 5 reflections on a single journal point.",
    icon: "◓",
  },
}

const ALL_TYPES = Object.keys(ACHIEVEMENT_META)

export async function getAchievements(c: Context<AppEnv>) {
  const userId = c.get("userId")

  const unlocked = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, userId))

  const unlockedMap = new Map(unlocked.map((a) => [a.type, a.unlockedAt]))

  const result = ALL_TYPES.map((type) => ({
    type,
    ...ACHIEVEMENT_META[type],
    unlocked: unlockedMap.has(type),
    unlockedAt: unlockedMap.get(type) ?? null,
  }))

  return c.json(result)
}
