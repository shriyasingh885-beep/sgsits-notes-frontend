import { execFileSync } from "child_process";
import fs from "fs"; import path from "path"; import os from "os";
const OUT = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad";

function scrape(id: string): { id: string; name: string; isDir: boolean }[] {
  const html = execFileSync("curl", ["-sL", `https://drive.google.com/embeddedfolderview?id=${id}#list`], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  const out: { id: string; name: string; isDir: boolean }[] = [];
  const re = /flip-entry"\s+id="entry-([A-Za-z0-9_-]+)"[\s\S]*?flip-entry-title">([^<]+)<\/div>/g;
  let m;
  while ((m = re.exec(html))) {
    const isDir = /flip-entry-list-icon">[\s\S]{0,200}?folder/i.test(html.slice(m.index, m.index + 400)) || !/\.\w{2,5}$/.test(m[2].trim());
    out.push({ id: m[1], name: m[2].trim(), isDir });
  }
  return out;
}

const roots = ["1avGyJ9F6U-lpkwjMnxsk_r9OOODHZwzI", "1D8ykpHe6sQwEsCtdhVtkKWUTPwyXkP97"];
const files: { id: string; name: string; folder: string }[] = [];
const seen = new Set<string>();
function crawl(id: string, label: string, depth: number) {
  if (seen.has(id) || depth > 3) return;
  seen.add(id);
  let entries: ReturnType<typeof scrape> = [];
  try { entries = scrape(id); } catch { return; }
  for (const e of entries) {
    if (e.isDir) crawl(e.id, `${label}/${e.name}`, depth + 1);
    else files.push({ id: e.id, name: e.name, folder: label });
  }
}
for (const r of roots) crawl(r, r.slice(0, 6), 0);
fs.writeFileSync(path.join(OUT, "drive-rescrape.json"), JSON.stringify(files, null, 2));
console.log(`Scraped ${files.length} files across ${seen.size} folders`);
files.forEach(f => console.log(`  ${f.folder}\t${f.name}`));
