import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  // Get the most recently uploaded files (we created ~76 of them today)
  const recentResources = await prisma.resource.findMany({
    orderBy: { createdAt: 'desc' },
    take: 80, // grab a bit more just to be safe
    include: { subject: true }
  });

  // Filter to just the ones created today / recently
  // Assuming the import just happened, the newest ones are ours.
  // We can just grab the top 76.
  const ourUploads = recentResources.slice(0, 76);

  console.log(`\nHere is how the 76 newly added files were categorized:\n`);
  
  // Group by Subject Code for readability
  const bySubject: Record<string, typeof ourUploads> = {};
  for (const r of ourUploads) {
    const key = r.subject ? `${r.subject.code} - ${r.subject.name}` : "NO SUBJECT";
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(r);
  }

  for (const subjectName of Object.keys(bySubject).sort()) {
    console.log(`\n======================================================`);
    console.log(`📂 ${subjectName}`);
    console.log(`======================================================`);
    for (const r of bySubject[subjectName]) {
      console.log(`- File  : ${r.originalFilename}`);
      console.log(`  Type  : [${r.type}]`);
      console.log(`  Title : ${r.title}`);
      console.log();
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
