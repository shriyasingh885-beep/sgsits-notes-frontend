import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// 1. Load environment variables
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || "sgsits-notes-vault";
const UPLOADS_DIR = path.join(process.cwd(), "private-uploads");

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

interface FileEntry {
  localPath: string;
  r2Key: string;
  size: number;
}

function getAllFiles(dir: string, baseDir: string): FileEntry[] {
  const entries: FileEntry[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name === "_archived-duplicates") continue;
      entries.push(...getAllFiles(fullPath, baseDir));
    } else if (item.isFile()) {
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      const stat = fs.statSync(fullPath);
      entries.push({
        localPath: fullPath,
        r2Key: relPath,
        size: stat.size,
      });
    }
  }
  return entries;
}

async function fileExistsInR2(key: string, size: number): Promise<boolean> {
  try {
    const res = await client.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    return res.ContentLength === size;
  } catch {
    return false;
  }
}

async function uploadFile(entry: FileEntry, index: number, total: number) {
  const ext = path.extname(entry.localPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const sizeMb = (entry.size / (1024 * 1024)).toFixed(2);

  const alreadyExists = await fileExistsInR2(entry.r2Key, entry.size);
  if (alreadyExists) {
    console.log(`[${index + 1}/${total}] (Skipped - already in R2) ${entry.r2Key} (${sizeMb} MB)`);
    return;
  }

  console.log(`[${index + 1}/${total}] Uploading ${entry.r2Key} (${sizeMb} MB)...`);
  const fileBuffer = fs.readFileSync(entry.localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: entry.r2Key,
      Body: fileBuffer,
      ContentType: contentType,
    })
  );
  console.log(`[${index + 1}/${total}] Done: ${entry.r2Key}`);
}

async function main() {
  console.log(`Scanning files in ${UPLOADS_DIR}...`);
  const files = getAllFiles(UPLOADS_DIR, UPLOADS_DIR);
  const totalSize = files.reduce((acc, f) => acc + f.size, 0);
  console.log(`Found ${files.length} active files totaling ${(totalSize / (1024 * 1024)).toFixed(2)} MB (${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB).`);
  console.log(`Destination bucket: ${BUCKET}`);
  console.log(`Starting uploads with concurrency = 3...\n`);

  // Concurrency pool of 3
  const concurrency = 3;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < files.length) {
      const idx = currentIndex++;
      const file = files[idx];
      try {
        await uploadFile(file, idx, files.length);
      } catch (err: any) {
        console.error(`Error uploading ${file.r2Key}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log("\nAll files processed successfully!");
}

main().catch(console.error);
