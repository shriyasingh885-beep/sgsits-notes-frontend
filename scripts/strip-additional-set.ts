// Removes the "(Additional Set)" suffix from resource titles — it was
// useful internally to disambiguate imports but is just clutter to
// students. Pass --apply to write; otherwise prints the plan.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
function stripAdditionalSet(title: string): string {
  let t = title;
  // ", Additional Set" or "Additional Set" with an optional trailing number,
  // wherever it sits inside a parenthetical (alone or alongside other text).
  t = t.replace(/,?\s*Additional Set\s*\d*/gi, "");
  t = t.replace(/\(\s*\)/g, ""); // now-empty parens, e.g. "(PPT, Additional Set)" -> "(PPT)" already handled above; this catches "()"
  t = t.replace(/\s+—\s*$/, "");
  t = t.replace(/\s{2,}/g, " ").trim();
  return t;
}

async function main() {
  const resources = await prisma.resource.findMany({ where: { title: { contains: "Additional Set" } } });
  let changed = 0;
  for (const r of resources) {
    const newTitle = stripAdditionalSet(r.title);
    console.log(`${APPLY ? "RENAMING" : "WOULD RENAME"}: "${r.title}"  ->  "${newTitle}"`);
    if (APPLY) await prisma.resource.update({ where: { id: r.id }, data: { title: newTitle } });
    changed++;
  }
  console.log(`\n${APPLY ? "Renamed" : "Would rename"}: ${changed}`);
  await prisma.$disconnect();
}

main();
