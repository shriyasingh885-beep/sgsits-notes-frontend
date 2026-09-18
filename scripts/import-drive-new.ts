/**
 * Phase 3 — Import newly downloaded Drive files into Neon PostgreSQL.
 *
 * For every file in private-uploads/ that has no matching Resource row,
 * creates an APPROVED Resource record with auto-detected subject, type and title.
 *
 * Run:  npx ts-node scripts/import-drive-new.ts
 *       npx ts-node scripts/import-drive-new.ts --dry   (print plan, write nothing)
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

// ── Load .env ────────────────────────────────────────────────────────────────
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const idx = t.indexOf("=");
    let val = t.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    process.env[t.slice(0, idx).trim()] = val;
  }
}

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

const PRIVATE_UPLOADS = path.join(process.cwd(), "private-uploads");
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://pub-908078c8607c412a993b79b30d15a84e.r2.dev";

// ── Subject code → subject code lookup map (folder → default code) ────────────
const FOLDER_TO_CODE: Record<string, string> = {
  mathematics: "MA10021",
  physics: "PH10009",
  chemistry: "CH10010",
  programming: "IT10007",
  "mechanical-workshop": "ME10008",
  electronics: "EE10510",
  civil: "CE10513",
  languages: "HU10512",
  general: "GN00001",
};

// Fine-grained overrides: if filename contains these patterns, use that code
const FILENAME_CODE_OVERRIDES: [RegExp, string][] = [
  [/ma10509|math.*data.*sci|data.*sci.*math|random.*var|unit4.*hypoth|unit4.*sampl|unit5.*excel|unit5.*r.*prog/i, "MA10509"],
  [/ip10584|workshop.*manual|welding.*shop|machine.*shop/i, "IP10584"],
  [/hu10181|understanding.*bharat|bharat/i, "HU10181"],
  [/py10514|biology|genetics|microbio|bacteria|virus|fungi|dna|enzyme|cardiovascular|nervous|respiration|tissue.*eng|biomolecule/i, "PY10514"],
  [/ma10021|math(?!.*data)|matrices|calculus|integral|differentiat|series|fourier|laplace|probability|statistics|fuzzy/i, "MA10021"],
];

// ── Document type detection ───────────────────────────────────────────────────
type ResourceType =
  | "NOTES" | "HANDWRITTEN_NOTES" | "PYQ" | "QUESTION_BANK" | "ASSIGNMENT"
  | "PRACTICAL" | "LAB_MANUAL" | "REFERENCE_MATERIAL" | "IMPORTANT_QUESTIONS"
  | "CHEAT_SHEET" | "SYLLABUS" | "SLIDES";

const TYPE_RULES: [RegExp, ResourceType][] = [
  [/pyq|previous.year|endsem|end.sem|mst\d?|mid.sem|question.paper|sample.paper|model.paper/i, "PYQ"],
  [/question.bank|qbank/i, "QUESTION_BANK"],
  [/assignment/i, "ASSIGNMENT"],
  [/lab.manual|labmanual|laboratory.manual/i, "LAB_MANUAL"],
  [/practical|lab.record/i, "PRACTICAL"],
  [/syllabus|scheme|course.outline/i, "SYLLABUS"],
  [/cheat.sheet|cheatsheet|formula.sheet|all.theorems/i, "CHEAT_SHEET"],
  [/slides?|\.pptx?$/i, "SLIDES"],
  [/reference|reading.material/i, "REFERENCE_MATERIAL"],
  [/important.question|imp.question/i, "IMPORTANT_QUESTIONS"],
  [/handwritten|scan|camscanner|adobe.scan/i, "HANDWRITTEN_NOTES"],
];

function detectType(filename: string): ResourceType {
  for (const [re, type] of TYPE_RULES) {
    if (re.test(filename)) return type;
  }
  return "NOTES";
}

// ── Title generation ──────────────────────────────────────────────────────────
function makeTitle(filename: string, subjectName: string, type: ResourceType): string {
  // Strip extension and clean up
  let base = path.basename(filename, path.extname(filename));
  // Convert kebab/snake to words
  base = base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  // Capitalise first letter of each word
  base = base.replace(/\b\w/g, (c) => c.toUpperCase());

  const typeLabel: Record<ResourceType, string> = {
    PYQ: "Previous Year Paper",
    QUESTION_BANK: "Question Bank",
    ASSIGNMENT: "Assignment",
    LAB_MANUAL: "Lab Manual",
    PRACTICAL: "Lab Record",
    SYLLABUS: "Syllabus",
    CHEAT_SHEET: "Cheat Sheet",
    SLIDES: "Slides",
    REFERENCE_MATERIAL: "Reference Material",
    IMPORTANT_QUESTIONS: "Important Questions",
    HANDWRITTEN_NOTES: "Handwritten Notes",
    NOTES: "Notes",
  };

  // If the base already contains the subject name, don't prepend it
  const subjectWords = subjectName.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const baseLC = base.toLowerCase();
  const hasSubject = subjectWords.some((w) => baseLC.includes(w));

  if (hasSubject) {
    return base;
  }
  return `${subjectName} — ${typeLabel[type]} (${base})`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[—–[\]]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

interface FileEntry {
  localPath: string;
  folder: string;      // e.g. "mathematics"
  filename: string;    // basename
  fileUrl: string;     // /api/files/<folder>/<filename>
  r2Url: string;       // R2 CDN URL
  ext: string;
  sizeBytes: number;
}

function scanUploads(): FileEntry[] {
  const entries: FileEntry[] = [];
  if (!fs.existsSync(PRIVATE_UPLOADS)) return entries;

  const folders = fs.readdirSync(PRIVATE_UPLOADS, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "_archived-duplicates");

  for (const dir of folders) {
    const folder = dir.name;
    const dirPath = path.join(PRIVATE_UPLOADS, folder);
    const files = fs.readdirSync(dirPath, { withFileTypes: true }).filter((f) => f.isFile());

    for (const f of files) {
      const ext = path.extname(f.name).toLowerCase();
      if (![".pdf", ".pptx", ".ppt", ".docx"].includes(ext)) continue;
      const localPath = path.join(dirPath, f.name);
      const stat = fs.statSync(localPath);
      entries.push({
        localPath,
        folder,
        filename: f.name,
        fileUrl: `/api/files/${folder}/${f.name}`,
        r2Url: `${R2_PUBLIC_URL}/${folder}/${f.name}`,
        ext: ext.slice(1).toUpperCase(),
        sizeBytes: stat.size,
      });
    }
  }
  return entries;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`import-drive-new.ts  ${DRY ? "[DRY RUN]" : "[LIVE]"}`);
  console.log(`${"=".repeat(60)}\n`);

  // Load contributor user
  const contributor = await prisma.user.findFirst({
    where: { email: "contributor@collegenoteshub.dev" },
  });
  if (!contributor) {
    console.error('ERROR: contributor user "contributor@collegenoteshub.dev" not found in DB.');
    console.error("       Make sure you have run the seed first.");
    process.exit(1);
  }

  // Load all subjects
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true, code: true } });
  const byCode = new Map(subjects.map((s) => [s.code, s]));

  // Load existing fileUrls from DB to skip already-imported files
  const existing = new Set(
    (await prisma.resource.findMany({ select: { fileUrl: true } })).map((r) => r.fileUrl)
  );

  // Also index by R2 URL (some old records used R2 URLs)
  const existingR2 = new Set(
    (await prisma.resource.findMany({ select: { fileUrl: true } }))
      .map((r) => r.fileUrl)
      .filter((u) => u.startsWith("http"))
  );

  const allFiles = scanUploads();
  console.log(`Found ${allFiles.length} files in private-uploads/\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of allFiles) {
    // Skip if already in DB
    if (existing.has(entry.fileUrl) || existingR2.has(entry.r2Url)) {
      skipped++;
      continue;
    }

    // Determine subject code
    let subjectCode = FOLDER_TO_CODE[entry.folder] ?? "GN00001";
    for (const [re, code] of FILENAME_CODE_OVERRIDES) {
      if (re.test(entry.filename)) { subjectCode = code; break; }
    }

    const subject = byCode.get(subjectCode);
    if (!subject) {
      // Fallback to GN00001
      const fallback = byCode.get("GN00001");
      if (!fallback) {
        console.warn(`  WARN: no subject found for code ${subjectCode}, skipping ${entry.filename}`);
        errors++;
        continue;
      }
      console.warn(`  WARN: subject ${subjectCode} not in DB, falling back to GN00001 for ${entry.filename}`);
    }

    const resolvedSubject = subject ?? byCode.get("GN00001")!;
    const type = detectType(entry.filename);
    const title = makeTitle(entry.filename, resolvedSubject.name, type);

    console.log(`  ${DRY ? "[DRY]" : "[CREATE]"}  ${entry.folder}/${entry.filename}`);
    console.log(`          subject: ${resolvedSubject.code} — ${resolvedSubject.name}`);
    console.log(`          type: ${type}  |  title: ${title}`);

    if (!DRY) {
      try {
        await prisma.resource.create({
          data: {
            title,
            description: "",
            fileUrl: entry.fileUrl,
            fileType: entry.ext,
            fileSize: entry.sizeBytes,
            tags: "",
            type,
            status: "APPROVED",
            subjectId: resolvedSubject.id,
            uploadedById: contributor.id,
            originalFilename: entry.filename,
            classificationStatus: "UNCLASSIFIED",
            views: 0,
            downloads: 0,
          },
        });
        created++;
      } catch (err: any) {
        console.error(`  ERROR creating record for ${entry.filename}: ${err.message}`);
        errors++;
      }
    } else {
      created++;  // count as "would create" in dry mode
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`${DRY ? "DRY RUN — nothing written" : "Done"}: ${created} ${DRY ? "would be created" : "created"}, ${skipped} already existed, ${errors} errors`);
  console.log(`\nNext step: npx ts-node scripts/upload_to_r2.ts`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
