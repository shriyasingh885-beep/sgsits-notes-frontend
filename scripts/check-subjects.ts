import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const subjects = await prisma.subject.findMany();
  console.log("DB Subjects:", subjects.map(s => s.code).join(", "));
  await prisma.$disconnect();
}
main();
