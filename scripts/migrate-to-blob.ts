// One-time migration: upload every resource's file from the local
// private-uploads/ folder to Vercel Blob, then rewrite its fileUrl to the
// resulting public Blob URL. Safe to re-run — resources whose fileUrl is
// already a Blob URL (https://...blob.vercel-storage.com/...) are skipped.
import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

const UPLOADS_DIR = path.join(process.cwd(), "private-uploads-compressed");

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("Set BLOB_READ_WRITE_TOKEN in the environment before running this script.");
    process.exit(1);
  }

  const resources = await prisma.resource.findMany();
  let migrated = 0;
  let skipped = 0;
  let missing = 0;

  for (const r of resources) {
    if (r.fileUrl.includes("blob.vercel-storage.com")) {
      skipped++;
      continue;
    }
    if (!r.fileUrl.startsWith("/api/files/")) {
      // Anything else (e.g. an already-external URL) — leave untouched.
      skipped++;
      continue;
    }

    const rel = r.fileUrl.replace("/api/files/", "");
    const localPath = path.join(UPLOADS_DIR, rel);
    if (!fs.existsSync(localPath)) {
      console.log("MISSING FILE:", localPath, "for resource", r.id, r.title);
      missing++;
      continue;
    }

    const buffer = fs.readFileSync(localPath);
    const blob = await put(rel, buffer, {
      access: "public",
      addRandomSuffix: false,
      token,
    });

    await prisma.resource.update({ where: { id: r.id }, data: { fileUrl: blob.url } });
    migrated++;
    if (migrated % 25 === 0) console.log(`...${migrated} migrated so far`);
  }

  console.log(`Done. Migrated: ${migrated}, skipped (already blob/external): ${skipped}, missing files: ${missing}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
