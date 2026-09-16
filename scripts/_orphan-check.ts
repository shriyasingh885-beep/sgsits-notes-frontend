import fs from "fs"; import path from "path";
const DST = "D:/All Programs/Web Dev/notes-hub-files";
const inv = JSON.parse(fs.readFileSync("C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/blob-inventory.json","utf8"));

const have: string[] = [];
const walk = (d: string) => { for (const f of fs.readdirSync(d)) { const p = path.join(d,f); if (fs.statSync(p).isDirectory()) walk(p); else have.push(path.relative(DST,p).split(path.sep).join("/")); } };
walk(DST);
const haveSet = new Set(have);
const missing = inv.resources.filter((r:any) => r.path && !haveSet.has(r.path));

const norm = (s: string) => s.toLowerCase()
  .replace(/\.(pdf|pptx?|docx?)$/,"")
  .replace(/-(additional-set|additional-copy|set-\d+|version-\d+|v\d+|copy)$/g,"")
  .replace(/[^a-z0-9]/g,"");

const haveNorm = have.map(h => [norm(h.split("/").pop()!), h] as [string,string]);
let sib = 0; const orphans: string[] = [];
for (const r of missing) {
  const n = norm(r.path.split("/").pop()!);
  let hit = haveNorm.find(([hn]) => hn === n)
        || haveNorm.find(([hn]) => hn && n && (hn.includes(n) || n.includes(hn)) && Math.abs(hn.length - n.length) < 10);
  if (hit) sib++; else orphans.push(r.path);
}
console.log(`missing: ${missing.length}, resolvable-to-sibling: ${sib}, true orphans: ${orphans.length}`);
console.log(orphans.join("\n"));
