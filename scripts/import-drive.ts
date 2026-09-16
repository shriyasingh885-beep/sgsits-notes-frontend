import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const SCRATCH = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/drive-import";

// filename fragment (unique substring of the on-disk name) -> subject code, type, clean title
const MANIFEST: [string, string, string, string][] = [
  // Chemistry
  ["chemistry-endsem-2025", "CH10010", "PYQ", "Applied Chemistry — End-Semester Paper (2025)"],
  ["chemistry-lab-manual__", "CH10010", "LAB_MANUAL", "Applied Chemistry — Lab Manual"],
  ["chemistry-practicals", "CH10010", "PRACTICAL", "Applied Chemistry — Practicals"],
  ["intro-to-lubricants-class-slides", "CH10010", "SLIDES", "Lubricants — Class Slides"],
  ["mst-1-chemistry", "CH10010", "PYQ", "Applied Chemistry — MST 1 Question Paper"],
  ["mst-2-chemistry", "CH10010", "PYQ", "Applied Chemistry — MST 2 Question Paper"],
  ["unit-1-water-notes", "CH10010", "NOTES", "Water Technology — Unit 1 Notes"],
  ["unit-2-lubricants-notes", "CH10010", "NOTES", "Lubricants — Unit 2 Notes"],
  ["water-class-slides", "CH10010", "SLIDES", "Water Technology — Class Slides"],

  // IT
  ["basic-concepts-of-it__", "IT10007", "NOTES", "Basic Concepts of IT — Notes"],
  ["basics-of-c-language", "IT10007", "NOTES", "Basics of C Language — Notes"],
  ["c-language-book", "IT10007", "REFERENCE_MATERIAL", "C Language — Reference Notes"],
  ["c-language-question-bank-1", "IT10007", "QUESTION_BANK", "C Language — Question Bank 1"],
  ["c-language-question-bank-2", "IT10007", "QUESTION_BANK", "C Language — Question Bank 2"],
  ["dbms-notes-version-1", "IT10007", "NOTES", "DBMS — Notes (Version 1)"],
  ["dbms-notes-version-2", "IT10007", "NOTES", "DBMS — Notes (Version 2)"],
  ["dbms-question-bank", "IT10007", "QUESTION_BANK", "DBMS — Question Bank"],
  ["dogshit", "IT10007", "NOTES", "MST-1 Syllabus Coverage Sheet"],
  ["endsem-2025-i", "IT10007", "PYQ", "Fundamentals of IT — End-Semester Paper (2025)"],
  ["endsems-2019-2024", "IT10007", "PYQ", "Fundamentals of IT — End-Semester PYQs (2019–2024)"],
  ["flowcharts-and-algorithms", "IT10007", "NOTES", "Flowcharts & Algorithms — Notes"],
  ["intro-to-ai-notes-1", "IT10007", "NOTES", "Introduction to AI — Notes (Set 1)"],
  ["intro-to-ai-notes-2", "IT10007", "NOTES", "Introduction to AI — Notes (Set 2)"],
  ["intro-to-ai-question-bank", "IT10007", "QUESTION_BANK", "Introduction to AI — Question Bank"],
  ["intro-to-computer-networks", "IT10007", "NOTES", "Computer Networks — Notes"],
  ["intro-to-hardware-and-software", "IT10007", "NOTES", "Hardware & Software — Notes"],
  ["mst-1-it", "IT10007", "PYQ", "Fundamentals of IT — MST 1 Question Paper"],
  ["mst-1-solutions", "IT10007", "PYQ", "Fundamentals of IT — MST 1 Solutions"],
  ["mst-2-it", "IT10007", "PYQ", "Fundamentals of IT — MST 2 Question Paper"],
  ["overview-of-operating-system", "IT10007", "NOTES", "Operating System — Overview Notes"],
  ["unit-1-question-bank", "IT10007", "QUESTION_BANK", "Unit 1 (Basic Concepts of IT) — Question Bank"],

  // Math
  ["beta-gamma-functions", "MA10021", "NOTES", "Beta & Gamma Functions — Notes"],
  ["differential-equations-v1", "MA10021", "NOTES", "Differential Equations — Notes (Set 1)"],
  ["differential-equations-v2", "MA10021", "NOTES", "Differential Equations — Notes (Set 2)"],
  ["double-integrals", "MA10021", "NOTES", "Double Integrals — Notes"],
  ["fuzzy-sets", "MA10021", "NOTES", "Fuzzy Sets — Notes"],
  ["math-endsem-2018-2024", "MA10021", "PYQ", "Mathematics — End-Semester PYQs (2018–2024)"],
  ["math-endsem-april-2025", "MA10021", "PYQ", "Mathematics — End-Semester Paper (April 2025)"],
  ["math-endsem-december-2025", "MA10021", "PYQ", "Mathematics — End-Semester Paper (December 2025)"],
  ["math-mst-1", "MA10021", "PYQ", "Mathematics — MST 1 Question Paper"],
  ["math-mst-2", "MA10021", "PYQ", "Mathematics — MST 2 Question Paper"],
  ["matrices-extra", "MA10021", "NOTES", "Matrices — Notes (Additional Set)"],
  ["maxima-minima-jacobian-taylor", "MA10021", "NOTES", "Maxima, Minima, Jacobians & Taylor's Theorem — Notes"],
  ["unit-1-indian-mathematicians", "MA10021", "NOTES", "Contributions of Indian Mathematicians — Unit 1 Notes"],

  // Mechanical
  ["fluid-kinematics-notes-extra", "ME10008", "NOTES", "Fluid Kinematics — Notes (Additional Set)"],
  ["fluid-kinematics-question-bank", "ME10008", "QUESTION_BANK", "Fluid Kinematics — Question Bank"],
  ["ic-engine-automobiles-question-bank", "ME10008", "QUESTION_BANK", "IC Engines & Automobiles — Question Bank"],
  ["mechanical-endsem-2025", "ME10008", "PYQ", "Mechanical Engineering — End-Semester Paper (2025)"],
  ["mechanical-mst-1", "ME10008", "PYQ", "Mechanical Engineering — MST 1 Question Paper"],
  ["mechanical-mst-2", "ME10008", "PYQ", "Mechanical Engineering — MST 2 Question Paper"],
  ["mechanical-properties-question-bank-extra", "ME10008", "QUESTION_BANK", "Mechanical Properties of Materials — Question Bank (Additional Set)"],
  ["properties-of-materials-notes-extra", "ME10008", "NOTES", "Mechanical Properties of Materials — Notes (Additional Set)"],
  ["theory-of-machines-notes-extra", "ME10008", "NOTES", "Theory of Machines — Notes (Additional Set)"],
  ["unit-1-mechanical-properties-slides", "ME10008", "SLIDES", "Unit 1 — Mechanical Properties of Materials — Class Slides"],
  ["unit-2-theory-of-machines-slides", "ME10008", "SLIDES", "Unit 2 — Theory of Machines — Class Slides"],
  ["unit-3-fluid-kinematics-slides", "ME10008", "SLIDES", "Unit 3 — Fluid Kinematics — Class Slides"],
  ["unit-4-ic-engines-automobiles-slides", "ME10008", "SLIDES", "Unit 4 — IC Engines & Automobiles — Class Slides"],
  ["yes1__", "ME10008", "PYQ", "Mechanical Engineering — End-Semester Sample Paper (Set 1)"],
  ["yes2__", "ME10008", "PYQ", "Mechanical Engineering — End-Semester Sample Paper (Set 2)"],
  ["yes3__", "ME10008", "PYQ", "Mechanical Engineering — End-Semester Sample Paper (Set 3)"],
  ["yes4__", "ME10008", "PYQ", "Mechanical Engineering — End-Semester Sample Paper (Set 4)"],
  ["yes5__", "ME10008", "PYQ", "Mechanical Engineering — End-Semester Sample Paper (Set 5)"],

  // Physics
  ["1st-year-physics-complete", "PH10009", "NOTES", "Applied Physics — Complete First-Year Notes (Set 3)"],
  ["fiber-optics-slides-extra", "PH10009", "SLIDES", "Fiber Optics — Class Slides (Additional Set)"],
  ["fibre-optics-notes-extra", "PH10009", "NOTES", "Fibre Optics — Notes (Additional Set)"],
  ["full-notes__", "PH10009", "NOTES", "Applied Physics — Full Notes"],
  ["laser-notes-extra", "PH10009", "NOTES", "LASER — Notes (Additional Set)"],
  ["physics-4sets", "PH10009", "QUESTION_BANK", "Applied Physics — Sample Paper (4 Sets)"],
  ["physics-endsem-1-2025", "PH10009", "PYQ", "Applied Physics — End-Semester Paper 1 (2025)"],
  ["physics-mst-2", "PH10009", "PYQ", "Applied Physics — MST 2 Question Paper"],
  ["quantum-computing-ppt", "PH10009", "SLIDES", "Quantum Computing — Class Slides (PPT, Additional Set)"],
  ["quantum-computing-slides-extra", "PH10009", "SLIDES", "Quantum Computing — Class Slides (Additional Set)"],
  ["quantum-theory-notes-extra", "PH10009", "NOTES", "Quantum Theory — Notes (Additional Set)"],
  ["quantum-theory-slides-extra", "PH10009", "SLIDES", "Quantum Theory — Class Slides (Additional Set)"],
  ["special-theory-of-relativity-extra", "PH10009", "NOTES", "Special Theory of Relativity — Notes (Additional Set)"],
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[—–[\]]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("Set BLOB_READ_WRITE_TOKEN first.");
    process.exit(1);
  }

  const contributor = await prisma.user.findUnique({ where: { email: "contributor@collegenoteshub.dev" } });
  if (!contributor) throw new Error("contributor user not found");

  const subjectCache = new Map<string, string>();
  async function subjectId(code: string) {
    if (subjectCache.has(code)) return subjectCache.get(code)!;
    const s = await prisma.subject.findFirst({ where: { code } });
    if (!s) throw new Error(`subject not found: ${code}`);
    subjectCache.set(code, s.id);
    return s.id;
  }

  const categories = ["chemistry", "it", "math", "mechanical", "physics"];
  let created = 0;
  let skipped = 0;
  let notMatched = 0;

  for (const category of categories) {
    const dir = path.join(SCRATCH, category);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".pdf"));

    for (const filename of files) {
      const entry = MANIFEST.find(([fragment]) => filename.includes(fragment));
      if (!entry) {
        console.log("NO MANIFEST MATCH, skipping:", category, filename);
        notMatched++;
        continue;
      }
      const [, subjectCode, type, title] = entry;

      const blobPath = `${category}/${slugify(title)}.pdf`;
      const buffer = fs.readFileSync(path.join(dir, filename));
      const blob = await put(blobPath, buffer, { access: "public", addRandomSuffix: false, token });

      const existing = await prisma.resource.findFirst({ where: { fileUrl: blob.url } });
      if (existing) {
        skipped++;
        continue;
      }

      await prisma.resource.create({
        data: {
          title,
          description: "",
          fileUrl: blob.url,
          fileType: "PDF",
          fileSize: buffer.length,
          tags: "",
          type,
          status: "APPROVED",
          subjectId: await subjectId(subjectCode),
          uploadedById: contributor.id,
          views: 0,
          downloads: 0,
        },
      });
      created++;
      if (created % 10 === 0) console.log(`...${created} created`);
    }
  }

  console.log(`\nDone. Created: ${created}, already existed: ${skipped}, no manifest match: ${notMatched}`);
  await prisma.$disconnect();
}

main();
