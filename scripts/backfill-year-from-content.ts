// For PYQ-family resources still missing academicYear after the title-only
// pass: download the actual PDF, run pdftotext, and look for a single
// unambiguous year in the real exam-paper content (session line, footer
// date, etc.) — the info the title just didn't happen to repeat.
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const prisma = new PrismaClient();

function parseYearFromText(text: string): number | null {
  const regex = /\b(19[89]\d|20[0-4]\d)\b/g;
  const years = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    const y = Number(m[1]);
    if (y >= 1990 && y <= new Date().getFullYear() + 1) years.add(y);
  }
  if (years.size !== 1) return null;
  return [...years][0];
}

async function main() {
  const missing = await prisma.resource.findMany({
    where: { type: { in: ["PYQ", "QUESTION_BANK", "IMPORTANT_QUESTIONS"] }, academicYear: null },
  });

  let filled = 0;
  let skipped = 0;
  const tmpDir = os.tmpdir();

  for (const r of missing) {
    if (r.fileType !== "PDF") {
      skipped++;
      continue;
    }
    try {
      const res = await fetch(r.fileUrl);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const pdfPath = path.join(tmpDir, `year-${r.id}.pdf`);
      fs.writeFileSync(pdfPath, buf);
      let text = "";
      try {
        text = execFileSync("pdftotext", ["-l", "2", pdfPath, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
      } catch {
        text = "";
      }
      fs.unlinkSync(pdfPath);

      const year = parseYearFromText(text);
      if (year) {
        await prisma.resource.update({ where: { id: r.id }, data: { academicYear: year } });
        console.log(`FILLED ${year}: "${r.title}"`);
        filled++;
      } else {
        console.log(`no unambiguous year found: "${r.title}"`);
      }
    } catch (e) {
      console.log(`ERROR on "${r.title}": ${(e as Error).message}`);
    }
  }

  console.log(`\nFilled: ${filled}, skipped (non-PDF): ${skipped}, total checked: ${missing.length}`);
  await prisma.$disconnect();
}

main();
