import { and, count, eq } from "drizzle-orm"
import type { Context } from "hono"

import type { AppEnv } from "../types/hono"

import { MAX_FILE_SIZE, MAX_ATTACHMENTS_PER_POINT, ALLOWED_MIME_TYPES } from "../utils/attachments"
import { uploadAttachment, deleteAttachment, detectType } from "../services/cloudinary"
import { attachments, journalPoints } from "../db/schema"
import { db } from "../lib/db"

export async function uploadAttachments(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id: journalPointId } = c.req.param()

  // Verify journal point belongs to user
  const [point] = await db
    .select({ id: journalPoints.id })
    .from(journalPoints)
    .where(
      and(eq(journalPoints.id, journalPointId), eq(journalPoints.userId, userId)),
    )
  if (!point) return c.json({ message: "Not found" }, 404)

  // Check existing attachment count
  const [{ count: existingCount }] = await db
    .select({ count: count() })
    .from(attachments)
    .where(eq(attachments.journalPointId, journalPointId))

  const formData = await c.req.formData()
  const files = formData.getAll("files") as File[]

  if (files.length === 0) return c.json({ message: "No files provided" }, 400)

  const remaining = MAX_ATTACHMENTS_PER_POINT - existingCount
  if (remaining <= 0)
    return c.json(
      { message: `Maximum of ${MAX_ATTACHMENTS_PER_POINT} attachments reached` },
      400,
    )

  const toUpload = files.slice(0, remaining)

  const errors: string[] = []
  const valid: File[] = []

  for (const file of toUpload) {
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: exceeds 10 MB limit`)
      continue
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      errors.push(`${file.name}: unsupported file type`)
      continue
    }
    valid.push(file)
  }

  if (valid.length === 0)
    return c.json({ message: errors.join("; ") }, 400)

  const uploaded = await Promise.all(
    valid.map(async (file) => {
      const { url, publicId } = await uploadAttachment(file, userId)
      const [row] = await db
        .insert(attachments)
        .values({
          journalPointId,
          userId,
          type: detectType(file.type),
          url,
          publicId,
          filename: file.name,
          size: file.size,
        })
        .returning()
      return row
    }),
  )

  return c.json(
    { attachments: uploaded, skipped: errors },
    201,
  )
}

export async function deleteAttachmentById(c: Context<AppEnv>) {
  const userId = c.get("userId")
  const { id } = c.req.param()

  const [row] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.userId, userId)))

  if (!row) return c.json({ message: "Not found" }, 404)

  await deleteAttachment(row.publicId, row.type)
  await db.delete(attachments).where(eq(attachments.id, id))

  return c.json({ message: "Deleted" })
}
