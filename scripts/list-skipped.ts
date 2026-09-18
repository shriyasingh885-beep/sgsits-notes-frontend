import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const PRIVATE_UPLOADS = path.join(process.cwd(), "private-uploads");

async function main() {
  // Get all file URLs currently in the database
  const dbFiles = await prisma.resource.findMany({ select: { fileUrl: true } });
  const dbFileUrls = new Set(dbFiles.map(r => r.fileUrl));
  const r2Urls = new Set(dbFiles.map(r => r.fileUrl).filter(u => u.startsWith("http")));

  const skippedFiles: string[] = [];

  // Scan the local folder
  const folders = fs.readdirSync(PRIVATE_UPLOADS, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== "_archived-duplicates");

  for (const dir of folders) {
    const dirPath = path.join(PRIVATE_UPLOADS, dir.name);
    const files = fs.readdirSync(dirPath, { withFileTypes: true }).filter(f => f.isFile());

    for (const f of files) {
      const ext = path.extname(f.name).toLowerCase();
      if (![".pdf", ".pptx", ".ppt", ".docx"].includes(ext)) continue;

      const fileUrl = `/api/files/${dir.name}/${f.name}`;
      const r2Url = `https://pub-908078c8607c412a993b79b30d15a84e.r2.dev/${dir.name}/${f.name}`;

      // If it's not in the DB, it was skipped
      if (!dbFileUrls.has(fileUrl) && !r2Urls.has(r2Url)) {
        skippedFiles.push(`- ${dir.name}/${f.name}`);
      }
    }
  }

  console.log(`\nHere are the ${skippedFiles.length} files that were skipped because they didn't match an existing subject:\n`);
  console.log(skippedFiles.join("\n"));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
