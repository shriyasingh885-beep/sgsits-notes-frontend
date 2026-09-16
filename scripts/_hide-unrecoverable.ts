// Temporarily hides resources whose file still lives only in the blocked
// Vercel Blob store (no free copy found in git history or Drive) so the
// site never shows a dead PDF link. Reversible: flip status back to
// APPROVED once the file is recovered (Blob unblocks 2026-10-10, or a
// student re-uploads the same file, which creates a fresh APPROVED row).
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const BLOB_HOST = "fr0cg5ys41r4psru.public.blob.vercel-storage.com";

async function main() {
  const stuck = await prisma.resource.findMany({
    where: { fileUrl: { contains: BLOB_HOST }, status: "APPROVED" },
    select: { id: true, title: true, subjectId: true },
  });
  console.log(`${APPLY ? "hiding" : "would hide"}: ${stuck.length}`);
  stuck.forEach(r => console.log(`  ${r.title}`));
  if (APPLY) {
    await prisma.resource.updateMany({
      where: { id: { in: stuck.map(r => r.id) } },
      data: { status: "UNAVAILABLE" },
    });
  }
  await prisma.$disconnect();
}
main();
