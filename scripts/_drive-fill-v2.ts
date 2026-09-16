import { execFileSync } from "child_process";
import fs from "fs"; import path from "path"; import os from "os";
const DST = "D:/All Programs/Web Dev/notes-hub-files";
const GS = "C:/Program Files/gs/gs10.07.1/bin/gswin64c.exe";
const SP = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad";
const inv = JSON.parse(fs.readFileSync(`${SP}/blob-inventory.json`, "utf8"));
const drive: { id: string; name: string; folder: string }[] = JSON.parse(fs.readFileSync(`${SP}/drive-all-v2.json`, "utf8"));
const APPLY = process.argv.includes("--apply");

// category (blob path prefix) -> folder-path keywords that indicate the same subject
const CATEGORY_HINTS: Record<string, string[]> = {
  chemistry: ["chemistry"],
  civil: ["civil"],
  electronics: ["electrical", "electronics", "feee"],
  general: [],
  languages: ["language", "hu10512", "languages for engineers"],
  math: ["math"],
  mathematics: ["math"],
  mechanical: ["mechanical"],
  "mechanical-workshop": ["mechanical"],
  physics: ["physics"],
  programming: ["information technology", "it10007", "computer programming"],
  it: ["information technology", "it10007", "computer programming"],
  biology: ["biology", "py10514"],
};

const STOP = new Set(["the","a","an","of","and","or","for","to","in","on","by","1st","year","btech","b","pdf","pptx","ppt","docx","doc","notes","note","set","sets","additional","copy","dr","final","new","unit","paper","papers","detailed","version"]);
const toks = (s: string) => s.toLowerCase()
  .replace(/&amp;/g, " ").replace(/&#39;/g, " ")
  .replace(/\.(pdf|pptx?|docx?)$/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)
  .map(w => w.replace(/s$/, "")).filter(w => w.length > 1 && !STOP.has(w));

const driveEntries = drive.map(d => ({ ...d, nameTok: new Set(toks(d.name)), folderTok: new Set(toks(d.folder)) }));

const have = new Set<string>();
const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === ".git") continue; if (fs.statSync(p).isDirectory()) walk(p); else have.add(path.relative(DST, p).split(path.sep).join("/")); } };
walk(DST);
const missing = inv.resources.filter((r: any) => r.path && !have.has(r.path));

// Reject textbook/reference-book scans outright — never substitute a
// pirated textbook for a student's own notes.
const isBookFolder = (folder: string) => /\bbooks?\b/i.test(folder);

function scoreMatch(target: string, category: string, d: typeof driveEntries[0]) {
  const tt = new Set(toks(target));
  let nameHit = 0;
  for (const w of tt) if (d.nameTok.has(w)) nameHit++;
  const minSize = Math.min(tt.size, d.nameTok.size || 1);
  const nameScore = minSize > 0 ? nameHit / minSize : 0;
  const hints = CATEGORY_HINTS[category] || [];
  const folderStr = d.folder.toLowerCase();
  // drive2 is a flat, single well-curated dump (already spot-checked) with
  // no subject subfolders to hint from — trust name-only for it.
  const catHit = d.folder === "drive2" || hints.length === 0 || hints.some(h => folderStr.includes(h));
  return { nameScore, catHit, nameHit, tokSize: tt.size, dTokSize: d.nameTok.size };
}

const results: { path: string; bestScore: number; drive: any }[] = [];
for (const r of missing) {
  const category = r.path.split("/")[0];
  const target = r.path.split("/").pop()!;
  let best: any = null, bestScore = -1;
  for (const d of driveEntries) {
    if (isBookFolder(d.folder)) continue; // never substitute a textbook scan
    const { nameScore, catHit, nameHit, tokSize, dTokSize } = scoreMatch(target, category, d);
    // Require real overlap (>=2 meaningful words) and a near-total match on
    // the smaller side, plus the drive item living under a folder that
    // actually belongs to this subject (when we have a hint for it).
    if (nameHit < 2 || nameScore < 0.8 || !catHit) continue;
    if (nameScore > bestScore) { bestScore = nameScore; best = d; }
  }
  if (best) results.push({ path: r.path, bestScore, drive: best });
}
const missingPaths = new Set(missing.map((r: any) => r.path));
const matchedPaths = new Set(results.map(r => r.path));
const confident = results;
const low = [...missingPaths].filter(p => !matchedPaths.has(p)).map(p => ({ path: p, bestScore: 0, drive: null }));
console.log(`missing: ${missing.length}, confident matches: ${confident.length}, below threshold: ${low.length}\n`);
confident.forEach(r => console.log(`${r.bestScore.toFixed(2)}  ${r.path}  <=  [${r.drive.folder}] ${r.drive.name}`));

if (APPLY) {
  let dl = 0, fail = 0;
  for (const r of confident) {
    const out = path.join(DST, r.path);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const tmp = path.join(os.tmpdir(), `fv2-${dl}.bin`);
    try {
      execFileSync("curl", ["-sL", "--max-time", "180", "-o", tmp,
        `https://drive.usercontent.google.com/download?id=${r.drive.id}&export=download&confirm=t`], { stdio: "ignore" });
      const sz = fs.statSync(tmp).size;
      if (sz < 1200) { fail++; fs.unlinkSync(tmp); continue; }
      if (r.path.toLowerCase().endsWith(".pdf")) {
        try {
          execFileSync(GS, ["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook",
            "-dNOPAUSE", "-dQUIET", "-dBATCH", "-dDetectDuplicateImages=true",
            "-dColorImageResolution=140", "-dGrayImageResolution=140", "-dMonoImageResolution=200",
            `-sOutputFile=${out}`, tmp], { stdio: "ignore", timeout: 75000, killSignal: "SIGKILL" });
        } catch { fs.copyFileSync(tmp, out); }
        if (!fs.existsSync(out) || fs.statSync(out).size >= sz) fs.copyFileSync(tmp, out);
      } else fs.copyFileSync(tmp, out);
      fs.unlinkSync(tmp);
      dl++;
    } catch { fail++; }
  }
  console.log(`\ndownloaded: ${dl}, failed: ${fail}`);
} else {
  console.log("\n--- BELOW THRESHOLD (not downloaded) ---");
  low.forEach(r => console.log(`${r.bestScore.toFixed(2)}  ${r.path}  ~?~  ${r.drive ? `[${r.drive.folder}] ${r.drive.name}` : "-"}`));
}
