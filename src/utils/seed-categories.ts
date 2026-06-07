import { categories } from "../db/schema"
import { db } from "../lib/db"

const DEFAULTS = [
  { name: "Life", color: "#6366f1", icon: "🌱" },
  { name: "Personal", color: "#ec4899", icon: "👤" },
  { name: "Work", color: "#f59e0b", icon: "💼" },
  { name: "Health", color: "#10b981", icon: "❤️" },
  { name: "Learning", color: "#3b82f6", icon: "📚" },
  { name: "Social", color: "#8b5cf6", icon: "👥" },
]

export async function seedDefaultCategories(userId: string) {
  await db.insert(categories).values(
    DEFAULTS.map((c) => ({ ...c, userId, isDefault: true })),
  )
}
