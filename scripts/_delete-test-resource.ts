import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const id = process.argv[2];
async function main() {
  const r = await prisma.resource.delete({ where: { id } });
  console.log("deleted:", r.title, r.fileUrl);
  await prisma.$disconnect();
}
main();
