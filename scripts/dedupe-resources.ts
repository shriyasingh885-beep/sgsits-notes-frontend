// Finds exact-duplicate resources (same subject + identical fileSize = near-
// certain same file uploaded twice) and, by default, only PRINTS the plan.
// Pass --apply to actually delete the losers (DB row + Blob object) and
// merge their views/downloads onto the keeper so engagement data isn't lost.
//
// Keeper selection prefers title QUALITY over raw usage count — a resource
// titled with the bare course code ("Ch10010 Slides 2") loses to one with
// the real subject/topic in the title ("Water Technology — Class Slides"),
// since that's exactly the naming problem we're also fixing. Only falls
// back to usage/date when title quality is a tie.
import { PrismaClient } from "@prisma/client";
import { del } from "@vercel/blob";

const prisma = new PrismaClient();
const CODE_PREFIXED_RE = /^[A-Za-z]{2}\d{5}\b/; // e.g. "Ch10010 Slides 2"
const APPLY = process.argv.includes("--apply");

function titleScore(title: string): number {
  // Higher is better. A bare-code title is worst; a longer, descriptive
  // title (real words, an em dash separating topic from doc type) is best.
  let score = 0;
  if (!CODE_PREFIXED_RE.test(title)) score += 10;
  if (title.includes("—")) score += 2;
  score += Math.min(title.length / 20, 3);
  return score;
}

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

  let deleted = 0;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  for (const g of dupGroups) {
    const sorted = [...g].sort((a, b) => {
      const sa = titleScore(a.title);
      const sb = titleScore(b.title);
      if (sa !== sb) return sb - sa;
      const usageA = a.views + a.downloads;
      const usageB = b.views + b.downloads;
      if (usageA !== usageB) return usageB - usageA;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    const keep = sorted[0];
    const drop = sorted.slice(1);

    console.log(`[${g[0].subject.code}] size=${g[0].fileSize}B`);
    console.log(`  KEEP:   "${keep.title}" (${keep.type})`);
    for (const d of drop) console.log(`  ${APPLY ? "DELETING" : "DELETE"}: "${d.title}" (${d.type})`);

    if (APPLY) {
      const mergedViews = keep.views + drop.reduce((s, d) => s + d.views, 0);
      const mergedDownloads = keep.downloads + drop.reduce((s, d) => s + d.downloads, 0);
      await prisma.resource.update({
        where: { id: keep.id },
        data: { views: mergedViews, downloads: mergedDownloads },
      });
      for (const d of drop) {
        await prisma.resource.delete({ where: { id: d.id } });
        if (token) {
          try {
            await del(d.fileUrl, { token });
          } catch (e) {
            console.log(`    (blob delete failed, continuing: ${(e as Error).message})`);
          }
        }
        deleted++;
      }
    }
    console.log();
  }

  console.log(`${APPLY ? "Deleted" : "Would delete"}: ${APPLY ? deleted : dupGroups.reduce((s, g) => s + g.length - 1, 0)} resources across ${dupGroups.length} groups.`);
  await prisma.$disconnect();
}

main();
