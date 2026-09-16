import { execFileSync } from "child_process";
import fs from "fs"; import path from "path"; import os from "os";
const DST = "D:/All Programs/Web Dev/notes-hub-files";
const GS = "C:/Program Files/gs/gs10.07.1/bin/gswin64c.exe";
const SP = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad";
const inv = JSON.parse(fs.readFileSync(`${SP}/blob-inventory.json`, "utf8"));
const drive: { id: string; name: string; folder: string }[] = JSON.parse(fs.readFileSync(`${SP}/drive-rescrape.json`, "utf8"));
const APPLY = process.argv.includes("--apply");

const STOP = new Set(["the","a","an","of","and","or","for","to","in","on","by","1st","year","btech","b","pdf","pptx","ppt","docx","doc","notes","note","set","additional","copy","dr","final","new"]);
const toks = (s: string) => s.toLowerCase()
  .replace(/&amp;/g, " ").replace(/&#39;/g, " ")
  .replace(/\.(pdf|pptx?|docx?)$/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)
  .map(w => w.replace(/s$/, "")).filter(w => w.length > 1 && !STOP.has(w));

const driveTok = drive.map(d => ({ ...d, t: new Set(toks(d.name)) }));

const have = new Set<string>();
const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else have.add(path.relative(DST, p).split(path.sep).join("/")); } };
walk(DST);
const missing = inv.resources.filter((r: any) => r.path && !have.has(r.path));

function best(target: string) {
  const tt = new Set(toks(target));
  let bestScore = 0, bestD = null as any;
  for (const d of driveTok) {
    let inter = 0;
    for (const w of tt) if (d.t.has(w)) inter++;
    const score = inter / Math.max(1, Math.min(tt.size, d.t.size));
    if (score > bestScore) { bestScore = score; bestD = d; }
  }
  return { bestScore, bestD };
}

let dl = 0, fail = 0, low = 0; const lowList: string[] = [];
for (const r of missing) {
  const { bestScore, bestD } = best(r.path.split("/").pop()!);
  if (!bestD || bestScore < 0.55) { low++; lowList.push(`${bestScore.toFixed(2)}  ${r.path}  ~?~  ${bestD?.name ?? "-"}`); continue; }
  if (!APPLY) { console.log(`${bestScore.toFixed(2)}  ${r.path}  <=  ${bestD.name}`); dl++; continue; }
  const out = path.join(DST, r.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = path.join(os.tmpdir(), `ff-${dl}.bin`);
  try {
    execFileSync("curl", ["-sL", "--max-time", "180", "-o", tmp,
      `https://drive.usercontent.google.com/download?id=${bestD.id}&export=download&confirm=t`], { stdio: "ignore" });
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
    dl++; if (dl % 20 === 0) console.log(`...${dl}`);
  } catch { fail++; }
}
console.log(`\n${APPLY ? "downloaded" : "would download"}: ${dl}, failed: ${fail}, below-threshold: ${low}`);
if (!APPLY) { console.log("\n--- BELOW THRESHOLD ---"); lowList.forEach(l => console.log(l)); }
