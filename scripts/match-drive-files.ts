import fs from "fs";
import path from "path";

const SRC = "D:/All Programs/Web Dev/notes-hub";
const missing: any[] = JSON.parse(fs.readFileSync(path.join(SRC, "scripts/missing-from-git.json"), "utf8"));

// Read all drive-manifest*.tsv files
const driveFiles: { id: string; category: string; filename: string; slug: string }[] = [];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[—–[\]()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const tsvFiles = ["drive-manifest.tsv", "drive-manifest-2.tsv", "drive-manifest-3.tsv", "drive-manifest-4.tsv", "drive-manifest-5.tsv"];

for (const tsvFile of tsvFiles) {
  const fullPath = path.join(SRC, "scripts", tsvFile);
  if (!fs.existsSync(fullPath)) continue;
  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    if (parts.length >= 3) {
      const id = parts[0].trim();
      const category = parts[1].trim();
      const filename = parts[2].trim();
      driveFiles.push({
        id,
        category,
        filename,
        slug: slugify(filename.replace(/\.[^/.]+$/, ""))
      });
    }
  }
}

console.log(`Loaded ${driveFiles.length} Drive files from TSV manifests.`);

// Match missing resources against Drive files
let matchedCount = 0;
let unmatchedCount = 0;

const matched: any[] = [];
const unmatched: any[] = [];

for (const m of missing) {
  const rPath = m.rPath; // e.g. "languages/understanding-bharat-reference-material.pdf"
  const category = rPath.split("/")[0];
  const fileBasename = path.basename(rPath);
  const blobSlug = slugify(fileBasename.replace(/\.[^/.]+$/, ""));
  const titleSlug = slugify(m.title || "");

  // Search for matching drive file
  let match = driveFiles.find(d => d.slug === blobSlug);
  if (!match) match = driveFiles.find(d => d.slug === titleSlug);
  if (!match) {
    // Try token overlap matching
    match = driveFiles.find(d => {
      const blobTokens = blobSlug.split("-").filter(t => t.length > 2);
      const driveTokens = d.slug.split("-").filter(t => t.length > 2);
      const overlap = blobTokens.filter(t => driveTokens.includes(t));
      return overlap.length >= Math.min(2, blobTokens.length);
    });
  }

  if (match) {
    matchedCount++;
    matched.push({ resource: m, drive: match });
  } else {
    unmatchedCount++;
    unmatched.push(m);
  }
}

console.log(`Matched with Drive manifests: ${matchedCount} / ${missing.length}`);
console.log(`Unmatched: ${unmatchedCount} / ${missing.length}`);

fs.writeFileSync(path.join(SRC, "scripts/drive-matched.json"), JSON.stringify(matched, null, 2));
fs.writeFileSync(path.join(SRC, "scripts/drive-unmatched.json"), JSON.stringify(unmatched, null, 2));

console.log("\nSample 5 unmatched:");
console.log(unmatched.slice(0, 5));
