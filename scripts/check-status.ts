import fs from "fs";
import path from "path";

const invPath = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/blob-inventory.json";
const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));

const dstDir = "D:/All Programs/Web Dev/notes-hub-files";

console.log("Total resources in inventory:", inv.resources.length);
console.log("Total blobs in Vercel store:", inv.blobs ? inv.blobs.length : 0);

let foundCount = 0;
let missingCount = 0;
const missingResources: any[] = [];
const foundResources: any[] = [];

for (const r of inv.resources) {
  let rPath = r.path;
  if (!rPath && r.fileUrl) {
    const m = r.fileUrl.match(/blob\.vercel-storage\.com\/(.+)$/);
    if (m) rPath = decodeURIComponent(m[1]);
  }
  if (!rPath) {
    missingCount++;
    missingResources.push(r);
    continue;
  }
  const fullDst = path.join(dstDir, rPath);
  if (fs.existsSync(fullDst)) {
    foundCount++;
    foundResources.push({ ...r, dstPath: rPath });
  } else {
    missingCount++;
    missingResources.push({ ...r, dstPath: rPath });
  }
}

console.log(`Staged in notes-hub-files: ${foundCount} / ${inv.resources.length}`);
console.log(`Missing from notes-hub-files: ${missingCount} / ${inv.resources.length}`);

console.log("\nSample missing 5:");
console.log(missingResources.slice(0, 5));
