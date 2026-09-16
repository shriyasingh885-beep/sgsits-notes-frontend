// Resets views/downloads to 0 for every resource. The original seeded
// library had random fake counts; even after the later real-content
// imports, a duplicate-merge pass combined some genuine 0-start counts with
// leftover fake numbers from deleted duplicates. There's no reliable way to
// separate real traffic from fake at this point, so the honest fix is a
// clean reset — every number on the live site from here on is real.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.resource.updateMany({ data: { views: 0, downloads: 0 } });
  console.log(`Reset views/downloads to 0 on ${result.count} resources.`);
  await prisma.$disconnect();
}
main();
