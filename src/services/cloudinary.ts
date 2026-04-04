import { v2 as cloudinary } from "cloudinary"
import { env } from "../utils/env"

function getCloudinary() {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  return cloudinary
}

export type AttachmentType = "image" | "audio" | "video"

export function detectType(mimeType: string): AttachmentType {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType.startsWith("video/")) return "video"
  return "image"
}

export async function uploadAttachment(
  file: File,
  userId: string,
): Promise<{ url: string; publicId: string }> {
  const buffer = await file.arrayBuffer()
  const nodeBuffer = Buffer.from(buffer)

  const type = detectType(file.type)
  const resourceType = type === "image" ? "image" : "video"
  const cld = getCloudinary()

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cld.uploader.upload_stream(
        {
          folder: `gratification/${userId}`,
          resource_type: resourceType,
          tags: [userId],
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result as { secure_url: string; public_id: string })
        },
      )
      stream.end(nodeBuffer)
    },
  )

  return { url: result.secure_url, publicId: result.public_id }
}

export async function deleteAttachment(
  publicId: string,
  type: AttachmentType,
): Promise<void> {
  const resourceType = type === "image" ? "image" : "video"
  const cld = getCloudinary()
  await cld.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  })
}
