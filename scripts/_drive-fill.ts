import { execFileSync } from "child_process";
import fs from "fs"; import path from "path"; import os from "os";
const DST = "D:/All Programs/Web Dev/notes-hub-files";
const GS = "C:/Program Files/gs/gs10.07.1/bin/gswin64c.exe";
const inv = JSON.parse(fs.readFileSync("C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/blob-inventory.json","utf8"));

// build manifest lookups
const byFull = new Map<string,string>(), byName = new Map<string,string>();
for (const f of fs.readdirSync("scripts").filter(x=>/^drive-manifest.*\.tsv$/.test(x))) {
  for (const ln of fs.readFileSync(path.join("scripts",f),"utf8").split(/\r?\n/)) {
    const [id,cat,name] = ln.split("\t");
    if (!id||!name) continue;
    byFull.set(`${cat}/${name}`.toLowerCase(), id);
    if (!byName.has(name.toLowerCase())) byName.set(name.toLowerCase(), id);
  }
}

const missing = inv.resources.filter((r:any)=> r.path && !(fs.existsSync(path.join(DST,r.path)) && fs.statSync(path.join(DST,r.path)).size>0));
console.log(`Missing on disk: ${missing.length}`);
let matched=0, dl=0, fail=0; const unmatched:string[]=[];
for (const r of missing) {
  const p = r.path.toLowerCase();
  const base = p.split("/").pop()!;
  const id = byFull.get(p) || byName.get(base);
  if (!id) { unmatched.push(r.path); continue; }
  matched++;
  const out = path.join(DST, r.path);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const tmp = path.join(os.tmpdir(), `df-${dl}.bin`);
  try {
    execFileSync("curl", ["-sL","--max-time","180","-o",tmp,
      `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`], { stdio:"ignore" });
    const sz = fs.statSync(tmp).size;
    if (sz < 1000) { fail++; fs.unlinkSync(tmp); continue; }
    if (p.endsWith(".pdf")) {
      try {
        execFileSync(GS, ["-sDEVICE=pdfwrite","-dCompatibilityLevel=1.4","-dPDFSETTINGS=/ebook",
          "-dNOPAUSE","-dQUIET","-dBATCH","-dDetectDuplicateImages=true",
          "-dColorImageResolution=140","-dGrayImageResolution=140","-dMonoImageResolution=200",
          `-sOutputFile=${out}`, tmp], { stdio:"ignore", timeout:75000, killSignal:"SIGKILL" });
      } catch { fs.copyFileSync(tmp, out); }
      if (!fs.existsSync(out) || fs.statSync(out).size >= sz) fs.copyFileSync(tmp, out);
    } else fs.copyFileSync(tmp, out);
    fs.unlinkSync(tmp);
    dl++; if (dl%20===0) console.log(`...${dl} downloaded`);
  } catch(e){ fail++; }
}
console.log(`\nMatched: ${matched}, downloaded ok: ${dl}, failed: ${fail}`);
console.log(`Unmatched (${unmatched.length}):`); unmatched.forEach(u=>console.log("  "+u));
