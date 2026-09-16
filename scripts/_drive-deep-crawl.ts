import { execFileSync } from "child_process";
import fs from "fs";

const OUT = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad";

function fetchHtml(id: string): string {
  return execFileSync("curl", ["-sL", `https://drive.google.com/embeddedfolderview?id=${id}#list`], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
}

function parseEntries(html: string): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const p of html.split('flip-entry"').slice(1)) {
    const idm = p.match(/id="entry-([A-Za-z0-9_-]+)"/);
    const nm = p.match(/flip-entry-title">([^<]+)</);
    if (idm && nm) out.push({ id: idm[1], name: nm[1].trim() });
  }
  return out;
}

const files: { id: string; name: string; folder: string }[] = [];
const seen = new Set<string>();

function crawl(id: string, label: string, depth: number) {
  if (seen.has(id) || depth > 4) return;
  seen.add(id);
  let html = "";
  try { html = fetchHtml(id); } catch { return; }
  const entries = parseEntries(html);
  for (const e of entries) {
    const looksLikeFile = /\.[A-Za-z0-9]{2,5}$/.test(e.name);
    if (looksLikeFile) {
      files.push({ id: e.id, name: e.name, folder: label });
    } else {
      crawl(e.id, `${label}/${e.name}`, depth + 1);
    }
  }
}

// The 5 named subfolders inside drive1 (excluding "Channels and Info" / "Syllabus" — not note content)
const targets: [string, string][] = [
  ["1x4kbCkZ1vbGn1kXVL9Ct2fbxaoo5Z9a5", "Chemistry"],
  ["10pEdNN98m5FURmd6LXULNs4qf-rD3Pm0", "Information Technology"],
  ["1JPzELjqkZzFMG8_JXMHlbsAil-NYt2MM", "Math"],
  ["1K1ylqrWZmmi24gcukmVQn28nVpvk0BUV", "Mechanical"],
  ["1Z6yrvHdX5ux_I6-qaEFjpUvEJeYO9Y3B", "Physics"],
];
for (const [id, label] of targets) crawl(id, label, 0);

fs.writeFileSync(`${OUT}/drive1-deep.json`, JSON.stringify(files, null, 2));
console.log(`Found ${files.length} files across ${seen.size} folders visited`);
const byFolder: Record<string, number> = {};
files.forEach(f => byFolder[f.folder] = (byFolder[f.folder] || 0) + 1);
console.log(byFolder);
files.forEach(f => console.log(`  [${f.folder}] ${f.name}`));
