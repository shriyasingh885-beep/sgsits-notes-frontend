// Backfills Resource.academicYear from the title (and tags), using the exact
// same single-year heuristic as src/lib/format.ts#parseExamYear — kept as an
// inline copy here so this script has zero dependency on the Next.js build
// graph. Only ever fills a currently-null academicYear; never overwrites one
// a human (or the upload form) already set.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function parseExamYear(title: string, tags?: string | null): number | null {
  const haystack = `${title} ${tags ?? ""}`;
  const regex = /\b(19[89]\d|20[0-4]\d)\b/g;
  const years: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(haystack)) !== null) years.push(Number(m[1]));
  if (years.length !== 1) return null;
  const year = years[0];
  if (year < 1990 || year > new Date().getFullYear() + 1) return null;
  return year;
}

async function main() {
  const resources = await prisma.resource.findMany({
    where: { academicYear: null },
    select: { id: true, title: true, tags: true, type: true },
  });

  let filled = 0;
  let stillMissing = 0;
  const missingByType: Record<string, number> = {};

  for (const r of resources) {
    const year = parseExamYear(r.title, r.tags);
    if (year) {
      await prisma.resource.update({ where: { id: r.id }, data: { academicYear: year } });
      filled++;
    } else {
      stillMissing++;
      missingByType[r.type] = (missingByType[r.type] || 0) + 1;
    }
  }

  console.log(`Scanned ${resources.length} resources with no academicYear.`);
  console.log(`Filled from title: ${filled}`);
  console.log(`Still missing (ambiguous/no year in title): ${stillMissing}`);
  console.log("Still-missing breakdown by type:", missingByType);
  await prisma.$disconnect();
}

main();
