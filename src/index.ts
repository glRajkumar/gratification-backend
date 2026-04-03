import { Hono } from "hono"
import { authRouter } from "./routes/auth"
import { categoriesRouter } from "./routes/categories"
import { journalRouter, reflectionsRouter } from "./routes/journal"
import { todosRouter } from "./routes/todos"
import { goalsRouter } from "./routes/goals"

const app = new Hono()

app.route("/api/auth", authRouter)
app.route("/api/categories", categoriesRouter)
app.route("/api/journal", journalRouter)
app.route("/api/reflections", reflectionsRouter)
app.route("/api/todos", todosRouter)
app.route("/api/goals", goalsRouter)

export default app
