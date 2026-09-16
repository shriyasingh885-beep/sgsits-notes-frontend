// Reliable Drive crawler: distinguishes file vs folder using the anchor
// href (drive/folders/ = folder, file/d/ = file), which the previous
// extension-guessing heuristic got wrong for Drive items whose display
// name has no visible extension (silently dropping real files).
import { execFileSync } from "child_process";
import fs from "fs";

const OUT = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad";

function fetchHtml(id: string): string {
  return execFileSync("curl", ["-sL", `https://drive.google.com/embeddedfolderview?id=${id}#list`], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
}

function parseEntries(html: string): { id: string; name: string; isFolder: boolean }[] {
  const out: { id: string; name: string; isFolder: boolean }[] = [];
  for (const p of html.split('flip-entry"').slice(1)) {
    const idm = p.match(/id="entry-([A-Za-z0-9_-]+)"/);
    const nm = p.match(/flip-entry-title">([^<]+)</);
    const isFolder = /href="https:\/\/drive\.google\.com\/drive\/folders\//.test(p);
    if (idm && nm) out.push({ id: idm[1], name: nm[1].trim(), isFolder });
  }
  return out;
}

const files: { id: string; name: string; folder: string }[] = [];
const seen = new Set<string>();

function crawl(id: string, label: string, depth: number) {
  if (seen.has(id) || depth > 6) return;
  seen.add(id);
  let html = "";
  try { html = fetchHtml(id); } catch { return; }
  const entries = parseEntries(html);
  for (const e of entries) {
    if (e.isFolder) crawl(e.id, `${label}/${e.name}`, depth + 1);
    else files.push({ id: e.id, name: e.name, folder: label });
  }
}

const roots: [string, string][] = [
  ["1avGyJ9F6U-lpkwjMnxsk_r9OOODHZwzI", "drive1"],
  ["1D8ykpHe6sQwEsCtdhVtkKWUTPwyXkP97", "drive2"],
  ["1ntyo8oxicbrZoI5L46CfJDqgbKKZ_V4x", "driveA"],
  ["19ZQlDuURIYZzQb3iAAPj3sA1m16ZNBmN", "driveB"],
  ["1Sv3vOpDmEB2iA3fm6kB3dp3N8PNrf68X", "driveC"],
  ["1ThQNyEv2BtSE-u6MAksOXFjmqKneCi2c", "driveD"],
  ["1uNlkvKKNItRtxW2VFq3l4pPKGHNSC2i5", "driveE"],
  ["14-kRze54Hn210NbFH0XiYVCMLVXN45qu", "driveF"],
];
for (const [id, label] of roots) crawl(id, label, 0);

fs.writeFileSync(`${OUT}/drive-all-v2.json`, JSON.stringify(files, null, 2));
console.log(`Found ${files.length} files across ${seen.size} folders visited`);
