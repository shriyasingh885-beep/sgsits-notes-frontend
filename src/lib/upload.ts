import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID, createHash } from "crypto";
import path from "path";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
]);

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const R2_ENDPOINT = process.env.R2_ENDPOINT ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET = process.env.R2_BUCKET_NAME ?? "sgsits-notes-vault";
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "https://pub-908078c8607c412a993b79b30d15a84e.r2.dev").replace(/\/$/, "");

function getS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

export class UploadValidationError extends Error {}

/** sha256 of the file's bytes — used to catch the same file uploaded twice. */
export async function hashFile(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Saves uploaded file directly to Cloudflare R2 bucket.
 * The file is served via the Cloudflare R2 public URL with 0 egress fees.
 */
export async function saveUploadedFile(file: File, category: string) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadValidationError("Unsupported file type. Upload a PDF, DOCX, PPTX, PNG, or JPG.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadValidationError("File is too large. Maximum size is 50MB.");
  }
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new UploadValidationError("Storage service is not configured. Please try again later.");
  }

  const ext = path.extname(file.name) || "";
  const key = `${category}/${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    })
  );

  return {
    fileUrl: `${R2_PUBLIC_URL}/${key}`,
    fileType: ext.replace(".", "").toUpperCase() || "FILE",
    fileSize: file.size,
  };
}

/** Delete a resource's underlying file from Cloudflare R2. */
export async function deleteUploadedFile(fileUrl: string) {
  if (!R2_ACCESS_KEY_ID || !fileUrl.startsWith(R2_PUBLIC_URL)) return;
  try {
    const key = fileUrl.slice(R2_PUBLIC_URL.length + 1);
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    );
  } catch {
    /* best-effort cleanup */
  }
}
