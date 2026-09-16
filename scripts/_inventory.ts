import { list } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
const token = "vercel_blob_rw_fR0CG5Ys41R4PSrU_tp7hY8IkLVXAXHL5KmvqfdVmXuNoMO";
const prisma = new PrismaClient();
async function main() {
  // full blob listing
  let cursor: string | undefined;
  const blobs: { pathname: string; size: number; url: string }[] = [];
  do {
    const res = await list({ token, limit: 1000, cursor });
    blobs.push(...res.blobs.map(b => ({ pathname: b.pathname, size: b.size, url: b.url })));
    cursor = res.hasMore ? res.cursor : undefined;
  } while (cursor);
  const totalMB = (blobs.reduce((s,b)=>s+b.size,0)/1e6).toFixed(1);
  console.log(`Blob store: ${blobs.length} files, ${totalMB} MB total`);

  // resources and their blob paths
  const resources = await prisma.resource.findMany({ select: { id: true, fileUrl: true, title: true } });
  const resBlobPaths = new Set(resources.map(r => {
    const m = r.fileUrl.match(/blob\.vercel-storage\.com\/(.+)$/);
    return m ? decodeURIComponent(m[1]) : r.fileUrl;
  }));
  console.log(`Resources in DB: ${resources.length}`);

  fs.writeFileSync("C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/blob-inventory.json",
    JSON.stringify({ blobs, resources: resources.map(r => ({ id: r.id, path: [...resBlobPaths].find(p => r.fileUrl.includes(encodeURI(p))) || null, fileUrl: r.fileUrl, title: r.title })) }, null, 1));
  console.log("written to scratchpad/blob-inventory.json");
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
