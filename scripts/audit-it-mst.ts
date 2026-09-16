// Read-only diagnostic for the "3+ near-identical MST 1 entries" feedback on
// Fundamentals of IT & AI (IT10007). Prints every PYQ/QB-family resource for
// that subject with fileUrl + fileSize so we can tell real duplicates
// (identical/near-identical file size, same content) from genuinely
// different papers that just share a generic title.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const subject = await prisma.subject.findFirst({ where: { code: "IT10007" } });
  if (!subject) throw new Error("IT10007 not found");

  const resources = await prisma.resource.findMany({
    where: { subjectId: subject.id },
    orderBy: { title: "asc" },
    select: { id: true, title: true, type: true, fileUrl: true, fileSize: true, academicYear: true, createdAt: true, uploadedBy: { select: { name: true } } },
  });

  console.log(`\n=== ${subject.name} (${subject.code}) — ${resources.length} resources ===\n`);
  for (const r of resources) {
    console.log(`[${r.type}]${r.academicYear ? ` (${r.academicYear})` : ""} "${r.title}" — ${r.fileSize}B — ${r.uploadedBy.name} — ${r.fileUrl}`);
  }
  await prisma.$disconnect();
}

main();
