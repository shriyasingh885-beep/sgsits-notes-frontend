import { execSync } from "child_process";
import fs from "fs";

const SRC = "D:/All Programs/Web Dev/notes-hub";
const PARENT = "ca7069fd6a827c88aa9b2af00a4124560d1d2471";

const invPath = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/blob-inventory.json";
const inv = JSON.parse(fs.readFileSync(invPath, "utf8"));

// Get all files in git commit in one shot
const gitFilesOutput = execSync(`git ls-tree -r --name-only ${PARENT}:private-uploads`, { cwd: SRC, encoding: "utf8" });
const gitFilesSet = new Set(gitFilesOutput.split(/\r?\n/).map(line => line.trim()).filter(Boolean));

console.log(`Total files in git commit private-uploads: ${gitFilesSet.size}`);

let inGitCount = 0;
let notInGitCount = 0;
const notInGitList: any[] = [];
const inGitList: any[] = [];

for (const r of inv.resources) {
  let rPath = r.path;
  if (!rPath && r.fileUrl) {
    const m = r.fileUrl.match(/blob\.vercel-storage\.com\/(.+)$/);
    if (m) rPath = decodeURIComponent(m[1]);
  }
  if (!rPath) {
    notInGitCount++;
    notInGitList.push(r);
    continue;
  }

  if (gitFilesSet.has(rPath)) {
    inGitCount++;
    inGitList.push({ ...r, rPath });
  } else {
    notInGitCount++;
    notInGitList.push({ ...r, rPath });
  }
}

console.log(`Resources in Git: ${inGitCount}`);
console.log(`Resources NOT in Git: ${notInGitCount}`);

fs.writeFileSync("D:/All Programs/Web Dev/notes-hub/scripts/missing-from-git.json", JSON.stringify(notInGitList, null, 2));
fs.writeFileSync("D:/All Programs/Web Dev/notes-hub/scripts/in-git.json", JSON.stringify(inGitList, null, 2));
