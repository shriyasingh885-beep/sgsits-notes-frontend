// Rewrites resource.fileUrl from the (blocked) Vercel Blob host to
// raw.githubusercontent.com for every file we successfully recovered into
// the notes-hub-files repo. Resources whose file is NOT in that repo are
// left untouched (their Blob URL self-recovers when the store unblocks
// 2026-10-10). Pass --apply to write.
import { PrismaClient } from "@prisma/client";
import fs from "fs"; import path from "path";
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const FILES_DIR = "D:/All Programs/Web Dev/notes-hub-files";
const RAW = "https://raw.githubusercontent.com/animeshagrawal13/notes-hub-files/main";
const BLOB_HOST = "fr0cg5ys41r4psru.public.blob.vercel-storage.com";

const have = new Set<string>();
const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === ".git") continue; if (fs.statSync(p).isDirectory()) walk(p); else have.add(path.relative(FILES_DIR, p).split(path.sep).join("/")); } };
walk(FILES_DIR);

async function main() {
const all = await prisma.resource.findMany({ select: { id: true, fileUrl: true, title: true } });
let hit = 0, miss = 0, skip = 0;
for (const r of all) {
  if (!r.fileUrl.includes(BLOB_HOST)) { skip++; continue; }
  const blobPath = decodeURIComponent(new URL(r.fileUrl).pathname.replace(/^\/+/, ""));
  if (have.has(blobPath)) {
    const next = `${RAW}/${blobPath.split("/").map(encodeURIComponent).join("/")}`;
    if (APPLY) await prisma.resource.update({ where: { id: r.id }, data: { fileUrl: next } });
    hit++;
  } else {
    miss++;
    if (miss <= 200) console.log(`  no file yet: ${blobPath}`);
  }
}
console.log(`\n${APPLY ? "rewrote" : "would rewrite"}: ${hit}, still on blob (recover Oct 10): ${miss}, already non-blob: ${skip}`);
await prisma.$disconnect();
}
main();
