import { PrismaClient } from "@prisma/client";
import { PDFDocument } from "pdf-lib";

const p = new PrismaClient();

async function main() {
  const resources = await p.resource.findMany({
    where: { pageCount: null, fileUrl: { endsWith: ".pdf" } },
    select: { id: true, fileUrl: true, title: true },
  });
  console.log("PDFs missing pageCount:", resources.length);

  let done = 0;
  let failed = 0;
  for (const r of resources) {
    try {
      const res = await fetch(r.fileUrl);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = await res.arrayBuffer();
      const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
      const pages = pdf.getPageCount();
      await p.resource.update({ where: { id: r.id }, data: { pageCount: pages } });
      done++;
      if (done % 25 === 0) console.log(`...${done} done`);
    } catch (e) {
      failed++;
      console.log("FAILED:", r.title, (e as Error).message);
    }
  }
  console.log(`Done: ${done}, failed: ${failed}`);
  await p.$disconnect();
}

main();
