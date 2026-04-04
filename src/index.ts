import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { Hono } from "hono"

import { requireAuth } from "./middlewares/auth"
import { auth } from './lib/auth';
import { env } from './utils/env';

import { journalRouter, reflectionsRouter } from "./routes/journal"
import { achievementsRouter } from "./routes/achievements"
import { attachmentsRouter } from "./routes/attachments"
import { personalityRouter } from "./routes/personality"
import { challengesRouter } from "./routes/challenges"
import { intentionsRouter } from "./routes/intentions"
import { categoriesRouter } from "./routes/categories"
import { dashboardRouter } from "./routes/dashboard"
import { analyticsRouter } from "./routes/analytics"
import { settingsRouter } from "./routes/settings"
import { streaksRouter } from "./routes/streaks"
import { habitsRouter } from "./routes/habits"
import { exportRouter } from "./routes/export"
import { todosRouter } from "./routes/todos"
import { goalsRouter } from "./routes/goals"

const app = new Hono().basePath("/api")

app.use(logger())
app.use(cors({ origin: env.BETTER_AUTH_URL, credentials: true }))
app.use(secureHeaders())
app.use(compress())

app.get("/health", c => c.json({ status: "ok" }))

app.on(["GET", "POST"], "/auth/*", c => auth.handler(c.req.raw))

app.use(requireAuth)

app.route("/dashboard", dashboardRouter)
app.route("/categories", categoriesRouter)
app.route("/journal", journalRouter)
app.route("/reflections", reflectionsRouter)
app.route("/todos", todosRouter)
app.route("/goals", goalsRouter)
app.route("/analytics", analyticsRouter)
app.route("/streaks", streaksRouter)
app.route("/achievements", achievementsRouter)
app.route("/habits", habitsRouter)
app.route("/export", exportRouter)
app.route("/settings", settingsRouter)
app.route("/attachments", attachmentsRouter)
app.route("/analytics", personalityRouter)
app.route("/challenges", challengesRouter)
app.route("/intentions", intentionsRouter)

app.notFound(c => c.json({ message: 'Route not found' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.log(err)
  return c.json({ message: err?.message || "Internal sever eror" }, 500)
})

export default app
