import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { betterAuth } from "better-auth"

import * as schema from '../db/schema/auth'
import { db } from "./db"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    usePlural: true,
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
})
