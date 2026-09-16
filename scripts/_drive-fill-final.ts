// Final pass: programmatic confident matches (from _drive-fill-v2, minus a
// handful of ambiguous multi-target hits on one generic "Question Bank"
// file) plus a small hand-verified list for folder-scoped items the
// generic scorer was too conservative to trust on its own.
import { execFileSync } from "child_process";
import fs from "fs"; import path from "path"; import os from "os";
const DST = "D:/All Programs/Web Dev/notes-hub-files";
const GS = "C:/Program Files/gs/gs10.07.1/bin/gswin64c.exe";
const SP = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad";
const APPLY = process.argv.includes("--apply");

const MANUAL: Record<string, { id: string; name: string }> = {
  "chemistry/applied-chemistry-practicals.pdf": { id: "1usZaqGYfih3GMXtQhnS4I94LGrwsDqUp", name: "Practicals" },
  "chemistry/water-technology-unit-1-notes.pdf": { id: "1BG6xEDbDUkhtWW6H1PCXOhpeBkdtbKRa", name: "Unit 1 (Water)" },
  "chemistry/applied-chemistry-end-semester-paper-2025.pdf": { id: "1boA3bg1HAVPPcrKHdjvhZQuG7SzRYRe4", name: "Chemistry Endsem 2025 (1)" },
  "math/mathematics-mst-1-solutions.pdf": { id: "1uEZHbZpmuu-WO4sd13UeQq1pQdaSZCP9", name: "math-mst1" },
  "math/mathematics-mst-2-solutions.pdf": { id: "1EvHcvJam4lBkjCWjwg_WBPIrlI0xuNaj", name: "math-mst2" },
  "math/mathematics-end-semester-pyqs-20182024.pdf": { id: "1i6l_zoDAl6fgFENVIyxBMLg98IhIQVA9", name: "endsem(2024-2018)" },
  "math/mathematics-end-semester-paper-april-2025.pdf": { id: "179Yz4Oyx8eN7fRefQaK89a0dlGRPb3pB", name: "endsem-april2025" },
  "math/mathematics-end-semester-paper-december-2025.pdf": { id: "1XmxjvffEdin5rfVM4hwR58tTuFM1afcB", name: "endsem-december2025" },
  "it/fundamentals-of-it-end-semester-paper-2025.pdf": { id: "1royI7-Y34d14oIyjj7jnJA4Vtfedt7_2", name: "Endsem 2025(I)" },
  "it/fundamentals-of-it-end-semester-pyqs-20192024.pdf": { id: "1YyEea2qA3bHj4dJ2P1oERCuP-5m3c0-3", name: "Endsems 2024-2019" },
  "it/dbms-notes-version-1.pdf": { id: "1fstMwKT-CvV7oKr1KUnnaKMDjyNMvoCQ", name: "DBMS Notes version(1)" },
  "it/dbms-notes-version-2.pdf": { id: "1u9pwtd4dLQK8JPahdHYbMFcz0i6dJCkJ", name: "DBMS Notes version(2)" },
  "it/introduction-to-ai-question-bank.pdf": { id: "1HwIOodfFzJNsCLBOe6J_P9QfW_za2Py8", name: "Question Bank (AI)" },
  "physics/applied-physics-end-semester-paper-1-2025.pdf": { id: "1TFt_XPuPJbgg4WitjIgI9eYMgg6UYkUh", name: "EndSem-1 (2025)" },
  "physics/laser-notes-additional-set.pdf": { id: "1nGXAWuQNF2vvYakeLtAqDXE_fRskfyAn", name: "LASER" },
  "physics/applied-physics-full-notes.pdf": { id: "14-7Cn5J21gPteo4T_-mbtx8AVeQT08QH", name: "Full Notes" },
  "physics/quantum-computing-class-slides-ppt-additional-set.pdf": { id: "1Sxp1zRE52hP6IPktOw6nZMX5EnuhRZ8o", name: "Quantum Computing (PPT)" },
  "physics/applied-physics-sample-paper-4-sets.pdf": { id: "1aam2wv0w2KmaE62YHF9DmAE9XZnsdrT1", name: "physics_4sets (2).pdf" },
  "mechanical/mechanical-engineering-end-semester-sample-paper-set-1.pdf": { id: "1ByQnpBnn1Vd-zEM2T05t1wcXDT0xPCye", name: "yes.pdf" },
  "mechanical/mechanical-engineering-end-semester-sample-paper-set-2.pdf": { id: "1yObzZnfoO1iy1PlUAQTgrSbf6gTGRa00", name: "yes 2.pdf" },
  "mechanical/mechanical-engineering-end-semester-sample-paper-set-3.pdf": { id: "1YxCk_WXRPNYlxIxWD3epSHwOgrhWqLKG", name: "yes 3.pdf" },
  "mechanical/mechanical-engineering-end-semester-sample-paper-set-4.pdf": { id: "1hpRy94PNtteQ1HyKVU4vZAewNM9fGLvg", name: "yes 4.pdf" },
  "mechanical/mechanical-engineering-end-semester-sample-paper-set-5.pdf": { id: "1fp17rdFryh2n5CVs6KQ4EiEpsXw1vAHF", name: "yes 5.pdf" },
};

// Ambiguous — same generic drive file was the top match for several
// unrelated targets; drop rather than guess which (if any) is right.
const DROP = new Set([
  "it/unit-1-basic-concepts-of-it-question-bank.pdf",
  "languages/unit-1-question-bank.docx",
  "languages/unit-2-question-bank.docx",
]);

const inv = JSON.parse(fs.readFileSync(`${SP}/blob-inventory.json`, "utf8"));
const drive: { id: string; name: string; folder: string }[] = JSON.parse(fs.readFileSync(`${SP}/drive-all-v2.json`, "utf8"));

const CATEGORY_HINTS: Record<string, string[]> = {
  chemistry: ["chemistry"], civil: ["civil"], electronics: ["electrical", "electronics", "feee"],
  general: [], languages: ["language", "hu10512", "languages for engineers"], math: ["math"],
  mathematics: ["math"], mechanical: ["mechanical"], "mechanical-workshop": ["mechanical"],
  physics: ["physics"], programming: ["information technology", "it10007", "computer programming"],
  it: ["information technology", "it10007", "computer programming"], biology: ["biology", "py10514"],
};
const STOP = new Set(["the","a","an","of","and","or","for","to","in","on","by","1st","year","btech","b","pdf","pptx","ppt","docx","doc","notes","note","set","sets","additional","copy","dr","final","new","unit","paper","papers","detailed","version"]);
const toks = (s: string) => s.toLowerCase().replace(/&amp;/g, " ").replace(/&#39;/g, " ")
  .replace(/\.(pdf|pptx?|docx?)$/g, "").replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/)
  .map(w => w.replace(/s$/, "")).filter(w => w.length > 1 && !STOP.has(w));
const isBookFolder = (folder: string) => /\bbooks?\b/i.test(folder);
const driveEntries = drive.map(d => ({ ...d, nameTok: new Set(toks(d.name)) }));

const have = new Set<string>();
const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f === ".git") continue; if (fs.statSync(p).isDirectory()) walk(p); else have.add(path.relative(DST, p).split(path.sep).join("/")); } };
walk(DST);
const missing = inv.resources.filter((r: any) => r.path && !have.has(r.path));

const plan: { targetPath: string; id: string; label: string }[] = [];
for (const r of missing) {
  const target = r.path as string;
  if (DROP.has(target)) continue;
  if (MANUAL[target]) { plan.push({ targetPath: target, id: MANUAL[target].id, label: MANUAL[target].name }); continue; }
  const category = target.split("/")[0];
  const base = target.split("/").pop()!;
  const tt = new Set(toks(base));
  let best: any = null, bestScore = -1;
  for (const d of driveEntries) {
    if (isBookFolder(d.folder)) continue;
    const nameHit = [...tt].filter(w => d.nameTok.has(w)).length;
    const minSize = Math.min(tt.size, d.nameTok.size || 1);
    const nameScore = minSize > 0 ? nameHit / minSize : 0;
    const hints = CATEGORY_HINTS[category] || [];
    const catHit = d.folder === "drive2" || hints.length === 0 || hints.some(h => d.folder.toLowerCase().includes(h));
    if (nameHit < 2 || nameScore < 0.8 || !catHit) continue;
    if (nameScore > bestScore) { bestScore = nameScore; best = d; }
  }
  if (best && !(best.folder.includes("Unit 2/3 C language") && best.name === "Question Bank 1")) {
    plan.push({ targetPath: target, id: best.id, label: best.name });
  }
}

console.log(`missing: ${missing.length}, planned: ${plan.length}\n`);
plan.forEach(p => console.log(`${p.targetPath}  <=  ${p.label}`));

if (APPLY) {
  let dl = 0, fail = 0;
  for (const p of plan) {
    const out = path.join(DST, p.targetPath);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const tmp = path.join(os.tmpdir(), `ff-final-${dl}.bin`);
    try {
      execFileSync("curl", ["-sL", "--max-time", "180", "-o", tmp,
        `https://drive.usercontent.google.com/download?id=${p.id}&export=download&confirm=t`], { stdio: "ignore" });
      const sz = fs.statSync(tmp).size;
      if (sz < 1200) { fail++; console.log(`FAILED (too small): ${p.targetPath}`); fs.unlinkSync(tmp); continue; }
      if (p.targetPath.toLowerCase().endsWith(".pdf")) {
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
      if (dl % 20 === 0) console.log(`...${dl}`);
    } catch (e) { fail++; console.log(`FAILED: ${p.targetPath}`); }
  }
  console.log(`\ndownloaded: ${dl}, failed: ${fail}`);
}
