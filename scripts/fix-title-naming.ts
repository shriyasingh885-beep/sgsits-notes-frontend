// Applies the audit-title-naming.ts findings: replaces the raw course code
// at the start of a title with "<Subject Name> — ", matching the em-dash
// convention used everywhere else on the site. Pass --apply to write;
// otherwise just prints the plan.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CODE_RE = /\b([A-Za-z]{2}\d{5})\b/;
const APPLY = process.argv.includes("--apply");

async function main() {
  const resources = await prisma.resource.findMany({ include: { subject: true } });
  let changed = 0;

  for (const r of resources) {
    const m = r.title.match(CODE_RE);
    if (!m) continue;
    const codeInTitle = m[1];
    if (codeInTitle.toUpperCase() !== r.subject.code.toUpperCase()) continue;
    if (r.title.toLowerCase().includes(r.subject.name.toLowerCase())) continue;

    const rest = r.title.replace(new RegExp(`^${codeInTitle}\\s*`, "i"), "").trim();
    const newTitle = `${r.subject.name} — ${rest}`;

    console.log(`${APPLY ? "RENAMING" : "WOULD RENAME"}: "${r.title}"  ->  "${newTitle}"`);
    if (APPLY) {
      await prisma.resource.update({ where: { id: r.id }, data: { title: newTitle } });
    }
    changed++;
  }

  console.log(`\n${APPLY ? "Renamed" : "Would rename"}: ${changed}`);
  await prisma.$disconnect();
}

main();
