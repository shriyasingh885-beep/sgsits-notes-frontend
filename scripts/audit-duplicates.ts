// Read-only: finds exact-duplicate resources (same subject + identical
// fileSize = near-certain same file uploaded twice under different titles).
// Groups only within a subject so coincidental cross-subject size matches
// don't get flagged. Prints a keep/delete recommendation per group; nothing
// is written here.
import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const resources = await prisma.resource.findMany({
    include: { subject: true },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof resources>();
  for (const r of resources) {
    const key = `${r.subjectId}::${r.fileSize}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  let totalDeletable = 0;
  const plan: { keep: string; deleteIds: string[]; deleteUrls: string[] }[] = [];

  console.log(`Found ${dupGroups.length} exact-duplicate groups (same subject + same fileSize):\n`);
  for (const g of dupGroups) {
    // Keep whichever has more real usage (views+downloads); tie-break by
    // earliest createdAt (the one other things are more likely to already
    // reference / the one closer to the original curated import).
    const sorted = [...g].sort((a, b) => {
      const usageA = a.views + a.downloads;
      const usageB = b.views + b.downloads;
      if (usageA !== usageB) return usageB - usageA;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    const keep = sorted[0];
    const drop = sorted.slice(1);
    totalDeletable += drop.length;
    console.log(`[${g[0].subject.code}] size=${g[0].fileSize}B`);
    console.log(`  KEEP:   "${keep.title}" (${keep.type}, views=${keep.views}, dl=${keep.downloads}) ${keep.fileUrl}`);
    for (const d of drop) {
      console.log(`  DELETE: "${d.title}" (${d.type}, views=${d.views}, dl=${d.downloads}) ${d.fileUrl}`);
    }
    console.log();
    plan.push({ keep: keep.id, deleteIds: drop.map((d) => d.id), deleteUrls: drop.map((d) => d.fileUrl) });
  }

  console.log(`\nTotal resources that would be deleted: ${totalDeletable}`);
  fs.writeFileSync(
    "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/dedup-plan.json",
    JSON.stringify(plan, null, 1),
  );
  console.log("Plan written to scratchpad/dedup-plan.json");
  await prisma.$disconnect();
}

main();
