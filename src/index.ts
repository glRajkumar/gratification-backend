import { Hono } from "hono"
import { authRouter } from "./routes/auth"

const app = new Hono()

app.route("/api/auth", authRouter)

export default app
