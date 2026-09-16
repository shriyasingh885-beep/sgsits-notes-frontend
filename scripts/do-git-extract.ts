import { execSync, execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const SRC = "D:/All Programs/Web Dev/notes-hub";
const DST = "D:/All Programs/Web Dev/notes-hub-files";
const PARENT = "ca7069fd6a827c88aa9b2af00a4124560d1d2471";
const GS = "C:/Program Files/gs/gs10.07.1/bin/gswin64c.exe";

const inGitList: any[] = JSON.parse(fs.readFileSync(path.join(SRC, "scripts/in-git.json"), "utf8"));

console.log(`Starting extraction for ${inGitList.length} files from Git...`);

let ok = 0;
let skipped = 0;
let compressedCount = 0;
let rawCount = 0;

for (let i = 0; i < inGitList.length; i++) {
  const item = inGitList[i];
  const rPath = item.rPath;
  const outPath = path.join(DST, rPath);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    skipped++;
    continue;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const ghPath = `private-uploads/${rPath}`;
  let raw: Buffer;
  try {
    raw = execFileSync("git", ["show", `${PARENT}:${ghPath}`], { cwd: SRC, maxBuffer: 200 * 1024 * 1024 });
  } catch (err: any) {
    console.error(`Failed to show git path ${ghPath}:`, err.message);
    continue;
  }

  if (rPath.toLowerCase().endsWith(".pdf")) {
    const tmp = path.join(os.tmpdir(), `xg-${Date.now()}-${i}.pdf`);
    fs.writeFileSync(tmp, raw);
    let compressed = false;

    if (fs.existsSync(GS)) {
      try {
        execFileSync(GS, [
          "-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook",
          "-dNOPAUSE", "-dQUIET", "-dBATCH", "-dDetectDuplicateImages=true",
          "-dColorImageResolution=140", "-dGrayImageResolution=140", "-dMonoImageResolution=200",
          `-sOutputFile=${outPath}`, tmp,
        ], { stdio: "ignore", timeout: 15000 }); // 15s timeout per file
        
        if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0 && fs.statSync(outPath).size < raw.length) {
          compressed = true;
          compressedCount++;
        }
      } catch (e) {
        // Ghostscript failed or timed out, fallback to raw
      }
    }

    if (!compressed) {
      fs.writeFileSync(outPath, raw);
      rawCount++;
    }

    try { fs.unlinkSync(tmp); } catch {}
  } else {
    fs.writeFileSync(outPath, raw);
    rawCount++;
  }

  ok++;
  if ((ok + skipped) % 10 === 0 || i === inGitList.length - 1) {
    console.log(`[${i + 1}/${inGitList.length}] Processed: ${ok} newly extracted (${compressedCount} compressed, ${rawCount} raw), ${skipped} already existed.`);
  }
}

console.log("Git extraction complete!");
