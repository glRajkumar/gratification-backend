export function isScheduledDay(
  habit: { frequency: string; customDays: string | null },
  date: string,
): boolean {
  const dayOfWeek = new Date(date + "T12:00:00").getDay() // 0=Sun, 6=Sat
  if (habit.frequency === "daily") return true
  if (habit.frequency === "weekdays") return dayOfWeek >= 1 && dayOfWeek <= 5
  if (habit.frequency === "weekends") return dayOfWeek === 0 || dayOfWeek === 6
  if (habit.frequency === "custom" && habit.customDays) {
    const days = habit.customDays.split(",").map(Number)
    return days.includes(dayOfWeek)
  }
  return true
}
