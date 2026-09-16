// Read-only diagnostic for the "some papers say 'Applied Physics', others
// say 'Ph10009'" feedback. Finds every resource whose title uses the raw
// course code instead of the subject's human name, so a student searching
// the subject name misses them. Prints suggested renames (code -> name);
// nothing is written here.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CODE_RE = /\b([A-Za-z]{2}\d{5})\b/;

async function main() {
  const resources = await prisma.resource.findMany({
    include: { subject: true },
    orderBy: [{ subject: { code: "asc" } }, { title: "asc" }],
  });

  let offenders = 0;
  for (const r of resources) {
    const m = r.title.match(CODE_RE);
    if (!m) continue;
    const codeInTitle = m[1];
    // Only flag it if the code in the title actually refers to this
    // resource's own subject (not, say, a legitimate mention of a different
    // course) and the human subject name isn't already also present.
    if (codeInTitle.toUpperCase() !== r.subject.code.toUpperCase()) continue;
    if (r.title.toLowerCase().includes(r.subject.name.toLowerCase())) continue;
    offenders++;
    const suggested = r.title.replace(new RegExp(codeInTitle, "i"), r.subject.name);
    console.log(`[${r.subject.code}] "${r.title}"  ->  "${suggested}"   (id=${r.id})`);
  }
  console.log(`\nTotal resources using course code instead of subject name in title: ${offenders}`);
  await prisma.$disconnect();
}

main();
