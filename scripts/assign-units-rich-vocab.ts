// Second pass at chapter assignment, using UNIT_VOCAB (real sub-topic
// phrases hand-extracted from the official syllabus, not just each unit's
// short title). Checks the resource's TITLE first (cheap, no download);
// only falls back to downloading + reading content when the title alone
// doesn't give a confident match. Only touches resources still missing a
// unitId. Pass --apply to write; otherwise prints the plan.
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { UNIT_VOCAB } from "./unit-vocab";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function scoreAgainstVocab(text: string, vocab: string[][]): { best: number; score: number } {
  const t = text.toLowerCase();
  let best = -1;
  let bestScore = 0;
  vocab.forEach((phrases, i) => {
    let score = 0;
    for (const phrase of phrases) {
      if (t.includes(phrase.toLowerCase())) score += phrase.split(" ").length; // multi-word phrase hit counts more
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return { best, score: bestScore };
}

async function extractText(fileUrl: string, fileType: string, id: string): Promise<string> {
  if (fileType !== "PDF") return "";
  const tmp = path.join(os.tmpdir(), `rv-${id}.pdf`);
  try {
    const res = await fetch(fileUrl);
    if (!res.ok) return "";
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(tmp, buf);
    let text = "";
    try {
      text = execFileSync("pdftotext", ["-l", "5", tmp, "-"], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    } catch {
      text = "";
    }
    fs.unlinkSync(tmp);
    return text;
  } catch {
    return "";
  }
}

async function main() {
  let assigned = 0;
  let checked = 0;

  for (const [code, vocab] of Object.entries(UNIT_VOCAB)) {
    const subject = await prisma.subject.findFirst({ where: { code }, include: { units: { orderBy: { number: "asc" } } } });
    if (!subject || subject.units.length !== vocab.length) {
      console.log(`SKIP ${code}: unit count mismatch (db=${subject?.units.length}, vocab=${vocab.length})`);
      continue;
    }

    const resources = await prisma.resource.findMany({
      where: { subjectId: subject.id, unitId: null, type: { in: ["NOTES", "HANDWRITTEN_NOTES", "SLIDES"] } },
    });

    for (const r of resources) {
      checked++;

      // Title first — cheap and often enough with the richer vocab.
      const titleResult = scoreAgainstVocab(r.title, vocab);
      let unit = null;
      let via = "";
      if (titleResult.best >= 0 && titleResult.score >= 1) {
        unit = subject.units[titleResult.best];
        via = `title, score=${titleResult.score}`;
      } else {
        const text = await extractText(r.fileUrl, r.fileType, r.id);
        if (text && text.length > 30) {
          const contentResult = scoreAgainstVocab(text, vocab);
          if (contentResult.best >= 0 && contentResult.score >= 4) {
            unit = subject.units[contentResult.best];
            via = `content, score=${contentResult.score}`;
          }
        }
      }

      if (unit) {
        console.log(`${APPLY ? "ASSIGNING" : "WOULD ASSIGN"} [${code}] "${r.title}" -> Unit ${unit.number} (${unit.title})  [${via}]`);
        if (APPLY) await prisma.resource.update({ where: { id: r.id }, data: { unitId: unit.id } });
        assigned++;
      }
    }
  }

  console.log(`\nChecked: ${checked}, ${APPLY ? "assigned" : "would assign"}: ${assigned}`);
  await prisma.$disconnect();
}

main();
