import { Hono } from "hono"
import { dashboardRouter } from "./routes/dashboard"
import { authRouter } from "./routes/auth"
import { categoriesRouter } from "./routes/categories"
import { journalRouter, reflectionsRouter } from "./routes/journal"
import { todosRouter } from "./routes/todos"
import { goalsRouter } from "./routes/goals"
import { analyticsRouter } from "./routes/analytics"
import { streaksRouter } from "./routes/streaks"
import { achievementsRouter } from "./routes/achievements"
import { habitsRouter } from "./routes/habits"
import { exportRouter } from "./routes/export"
import { settingsRouter } from "./routes/settings"
import { attachmentsRouter } from "./routes/attachments"
import { personalityRouter } from "./routes/personality"
import { challengesRouter } from "./routes/challenges"
import { intentionsRouter } from "./routes/intentions"

const app = new Hono()

app.route("/api/auth", authRouter)
app.route("/api/dashboard", dashboardRouter)
app.route("/api/categories", categoriesRouter)
app.route("/api/journal", journalRouter)
app.route("/api/reflections", reflectionsRouter)
app.route("/api/todos", todosRouter)
app.route("/api/goals", goalsRouter)
app.route("/api/analytics", analyticsRouter)
app.route("/api/streaks", streaksRouter)
app.route("/api/achievements", achievementsRouter)
app.route("/api/habits", habitsRouter)
app.route("/api/export", exportRouter)
app.route("/api/settings", settingsRouter)
app.route("/api/attachments", attachmentsRouter)
app.route("/api/analytics", personalityRouter)
app.route("/api/challenges", challengesRouter)
app.route("/api/intentions", intentionsRouter)

export default app
