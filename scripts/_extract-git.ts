import { execFileSync, execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const SRC = "D:/All Programs/Web Dev/notes-hub";
const DST = "D:/All Programs/Web Dev/notes-hub-files";
const PARENT = "ca7069fd6a827c88aa9b2af00a4124560d1d2471";
const GS = "C:/Program Files/gs/gs10.07.1/bin/gswin64c.exe";
const inv = JSON.parse(fs.readFileSync("C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/blob-inventory.json", "utf8"));

let ok = 0, skip = 0, copied = 0;
for (const r of inv.resources) {
  if (!r.path) { skip++; continue; }
  const ghPath = `private-uploads/${r.path}`;
  try { execFileSync("git", ["cat-file", "-e", `${PARENT}:${ghPath}`], { cwd: SRC, stdio: "ignore" }); }
  catch { skip++; continue; }

  const outPath = path.join(DST, r.path);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) { ok++; continue; }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const raw = execFileSync("git", ["show", `${PARENT}:${ghPath}`], { cwd: SRC, maxBuffer: 200 * 1024 * 1024 });

  if (r.path.toLowerCase().endsWith(".pdf")) {
    const tmp = path.join(os.tmpdir(), `xg-${ok}.pdf`);
    fs.writeFileSync(tmp, raw);
    try {
      execFileSync(GS, [
        "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook",
        "-dNOPAUSE", "-dQUIET", "-dBATCH", "-dDetectDuplicateImages=true",
        "-dColorImageResolution=140", "-dGrayImageResolution=140", "-dMonoImageResolution=200",
        `-sOutputFile=${outPath}`, tmp,
      ], { stdio: "ignore", timeout: 75000, killSignal: "SIGKILL" });
    } catch { fs.writeFileSync(outPath, raw); }
    fs.unlinkSync(tmp);
    // keep whichever is smaller
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size >= raw.length) fs.writeFileSync(outPath, raw);
    ok++;
    if (ok % 20 === 0) console.log(`...${ok} pdfs done`);
  } else {
    fs.writeFileSync(outPath, raw);
    copied++;
  }
}
// total size
let total = 0;
const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); s.isDirectory() ? walk(p) : (total += s.size); } };
walk(DST);
console.log(`\nExtracted: ${ok} PDFs (compressed) + ${copied} other. Skipped (not in git): ${skip}. Total staged: ${(total / 1e6).toFixed(0)} MB`);
