import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.resource.count();
  const approvedCount = await prisma.resource.count({ where: { status: 'APPROVED' } });
  
  console.log(`Total DB Resources: ${count}`);
  console.log(`Approved DB Resources: ${approvedCount}`);
  
  // Also check if some files in private-uploads aren't in the DB
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
