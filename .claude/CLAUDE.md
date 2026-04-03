# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime & Commands

- **Runtime:** Bun (not Node.js) — use `bun` for all commands
- `bun run dev` — start dev server with hot reload (`--hot`)
- Add packages with `bun add <pkg>` / `bun add -d <pkg>`

## Stack

- **Runtime:** Bun
- **Framework:** Hono v4
- **Language:** TypeScript (strict mode)
- **JSX:** `hono/jsx` (configured in tsconfig)

## Architecture

Follow the structure defined in the global CLAUDE.md:

```
src/
  index.ts          ← app entry: middleware, DB connect, route mounting
  routes/           ← HTTP method + path + Zod validation → controller
  controllers/      ← business logic, returns JSON
  models/           ← Mongoose schemas
  middlewares/      ← auth, rate-limit, role-check
  services/         ← DB, Redis, external connections
  validations/      ← Zod schemas (consumed by routes via zv())
  utils/            ← JWT, hashing, cookies, enums, helpers
  types/            ← Hono context type augmentations
test/               ← .http files for VS Code REST Client
```

## Key Conventions

- No `.js` extensions needed for local imports — Bun resolves TypeScript natively
- Hono's `c.json()` / `c.text()` for responses
- Validate at the route level with `@hono/zod-validator`'s `zv()` helper; define schemas in `src/validations/`
- All response shapes follow the global conventions (direct data or `{ message }`, never envelopes)
