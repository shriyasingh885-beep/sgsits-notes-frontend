// For every NOTES/HANDWRITTEN_NOTES/SLIDES resource: download the actual
// file, extract real text (first 2 pages), and match it against this
// subject's official syllabus units (Unit.title, seeded verbatim from the
// SGSITS syllabus) using the file's real content — not just its title.
// Writes a confident match to Resource.unitId. Never touches a resource
// whose unitId is already set by a human. Pass --apply to write; otherwise
// prints the plan only.
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const UNIT_NUMBER_RE = /\bunit\s*-?\s*([1-9])\b/i;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "to", "in", "for", "on", "with", "is", "are", "by", "from",
  "as", "at", "into", "notes", "note", "unit", "class", "slides", "slide", "additional", "set",
  "engineering", "engineers", "fundamentals", "fundamental", "introduction", "overview", "basic",
  "basics", "applied", "general", "first", "year", "chapter", "page", "sgsits", "semester",
]);

function words(s: string): string[] {
  return (s.toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !STOPWORDS.has(w));
}
function stem(w: string): string {
  const s = w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w;
  return s.length > 6 ? s.slice(0, 6) : s;
}

async function extractText(fileUrl: string, fileType: string, id: string): Promise<string> {
  if (fileType !== "PDF") return "";
  const tmp = path.join(os.tmpdir(), `unit-${id}.pdf`);
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
  const subjects = await prisma.subject.findMany({ include: { units: { orderBy: { number: "asc" } } } });

  let assigned = 0;
  let checked = 0;
  let noContent = 0;

  for (const subject of subjects) {
    if (subject.units.length === 0) continue;
    const unitVocab = subject.units.map((u) => ({ ...u, stems: new Set(words(u.title).map(stem)) }));

    const resources = await prisma.resource.findMany({
      where: {
        subjectId: subject.id,
        unitId: null,
        type: { in: ["NOTES", "HANDWRITTEN_NOTES", "SLIDES"] },
      },
    });

    for (const r of resources) {
      checked++;

      // An explicit "Unit N" already in the title is a stronger, more
      // direct signal than a content guess from a 2-page sample — trust it
      // outright rather than risk a conflicting content-based override.
      const titleUnitMatch = r.title.match(UNIT_NUMBER_RE);
      const titleUnit = titleUnitMatch ? unitVocab.find((u) => u.number === Number(titleUnitMatch[1])) : null;
      if (titleUnit) {
        console.log(`${APPLY ? "ASSIGNING" : "WOULD ASSIGN"} [${subject.code}] "${r.title}" -> Unit ${titleUnit.number} (${titleUnit.title})  (from title)`);
        if (APPLY) await prisma.resource.update({ where: { id: r.id }, data: { unitId: titleUnit.id } });
        assigned++;
        continue;
      }

      const text = await extractText(r.fileUrl, r.fileType, r.id);
      if (!text || text.length < 30) {
        noContent++;
        continue;
      }
      const contentStems = words(text).map(stem);
      const freq = new Map<string, number>();
      for (const s of contentStems) freq.set(s, (freq.get(s) || 0) + 1);

      let best = -1;
      let bestScore = 0;
      unitVocab.forEach((u, i) => {
        let score = 0;
        for (const s of u.stems) score += freq.get(s) || 0;
        // Normalize a little by unit-keyword count so a unit with more
        // words in its title isn't just favoured for having more chances.
        score = score / Math.sqrt(u.stems.size || 1);
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      });

      // Require a real signal — a handful of on-topic word hits, not one
      // stray coincidental match.
      if (best >= 0 && bestScore >= 5) {
        const unit = unitVocab[best];
        console.log(`${APPLY ? "ASSIGNING" : "WOULD ASSIGN"} [${subject.code}] "${r.title}" -> Unit ${unit.number} (${unit.title})  score=${bestScore.toFixed(1)}`);
        if (APPLY) {
          await prisma.resource.update({ where: { id: r.id }, data: { unitId: unit.id } });
        }
        assigned++;
      }
    }
  }

  console.log(`\nChecked: ${checked}, no readable content: ${noContent}, ${APPLY ? "assigned" : "would assign"}: ${assigned}`);
  await prisma.$disconnect();
}

main();
