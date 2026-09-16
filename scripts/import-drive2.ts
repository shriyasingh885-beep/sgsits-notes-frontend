import { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const SCRATCH = "C:/Users/OMEN/AppData/Local/Temp/claude/D--All-Programs-Web-Dev/ea65c415-80a9-4dea-99c5-a2fd8f44b9d9/scratchpad/drive-import2";

// filename fragment -> subject code, type, clean title
const MANIFEST: [string, string, string, string][] = [
  // Chemistry
  ["home-assignment-1-semb", "CH10010", "ASSIGNMENT", "Applied Chemistry — Home Assignment 1"],
  ["support-material-acid-base-indicators", "CH10010", "REFERENCE_MATERIAL", "Acid-Base Indicators — Support Material"],
  ["water-notes-2", "CH10010", "NOTES", "Water Technology — Handwritten Notes (Additional Set)"],

  // IT
  ["it10007-mst2-syllabus", "IT10007", "SYLLABUS", "Fundamentals of IT — MST 2 Syllabus"],
  ["it-assignment-789", "IT10007", "ASSIGNMENT", "Fundamentals of IT — Assignment 7, 8 & 9"],
  ["functions-lab", "IT10007", "NOTES", "C Functions — Lab Notes"],
  ["c-handwritten-notes-lucky", "IT10007", "NOTES", "Complete Handwritten Notes on C"],
  ["assignment-4-final", "IT10007", "ASSIGNMENT", "C Programming — Assignment 4"],

  // Math (MA10021 — Mathematics for Engineers)
  ["assignment-1-ma10021", "MA10021", "ASSIGNMENT", "Mathematics — Assignment 1"],
  ["assignment-2-ma10021", "MA10021", "ASSIGNMENT", "Mathematics — Assignment 2"],
  ["ma10021-unit1-indian-mathematicians-2", "MA10021", "NOTES", "Contributions of Indian Mathematicians — Notes (Additional Set)"],
  ["mathematics-2-pyqs", "MA10021", "PYQ", "Mathematics — PYQs (Additional Set)"],
  ["maths-1__", "MA10021", "NOTES", "Mathematics — Notes"],
  ["maths-plain", "MA10021", "NOTES", "Mathematics — Notes (Additional Set 2)"],
  ["maths-assignment-sol", "MA10021", "ASSIGNMENT", "Mathematics — Assignment Solutions"],
  ["mst2-solution-ma10021", "MA10021", "PYQ", "Mathematics — MST 2 Solutions"],
  ["solution-mst1-ma10021", "MA10021", "PYQ", "Mathematics — MST 1 Solutions"],
  ["sem2mst1__", "MA10021", "PYQ", "Mathematics — MST 1 Question Paper (Additional Copy)"],
  ["identical-distri-permutations", "MA10021", "NOTES", "Permutations & Combinations — Example Problems"],

  // Math for Data Science (MA10509)
  ["ass-ii-ma10501-math-for-data-science", "MA10509", "ASSIGNMENT", "Mathematics for Data Science — Assignment 2"],
  ["assignment-i-ma10509", "MA10509", "ASSIGNMENT", "Mathematics for Data Science — Assignment 1"],
  ["maths-random-variable", "MA10509", "NOTES", "Random Variables — Notes"],
  ["maths-2-pa", "MA10509", "NOTES", "Mathematics for Data Science — Notes"],
  ["unit1-parta-abhijay", "MA10509", "NOTES", "Contributions of Indians in Statistics & Data Science — Notes"],
  ["unit-5-intro-to-data-tools", "MA10509", "NOTES", "Introduction to Data Tools — Unit 5 Notes"],
  ["sem1mst2__", "MA10509", "PYQ", "Mathematics for Data Science — MST 2 Question Paper"],

  // Mechanical (ME10008)
  ["mst3-me10008-solution", "ME10008", "PYQ", "Mechanical Engineering — MST 3 Solution"],
  ["sheet-06-isometric-projection", "ME10008", "ASSIGNMENT", "Isometric Projection — Practice Sheet 6"],
  ["practice-sheet-01-orthographic", "ME10008", "ASSIGNMENT", "Orthographic Projections — Practice Sheet 1"],
  ["assignment-plain", "ME10008", "ASSIGNMENT", "Overview of Mechanical Engineering — Assignment 1"],
  ["welding-shop-2", "IP10584", "NOTES", "Welding Shop — Workshop Notes (Additional Set)"],
  ["ip-workshop-manual-lucky", "IP10584", "LAB_MANUAL", "Machine Shop — Lab Manual"],
  ["me10008-unit3-fluid-kinematics-ppt", "ME10008", "SLIDES", "Unit 3 — Fluid Kinematics — Class Slides (Additional Set)"],

  // Electrical & Electronics (EE10510)
  ["ee10510-l1-drsks", "EE10510", "NOTES", "Lecture 1 — Notes"],
  ["ee10510-l3-unit2-drsks", "EE10510", "NOTES", "Lecture 3 (Unit 2) — Notes"],
  ["ee-assignment-2-solved", "EE10510", "ASSIGNMENT", "Assignment 2 — Solved"],
  ["electrical-unit-2", "EE10510", "NOTES", "Unit 2 — Notes (Additional Set)"],
  ["et-unit-1", "EE10510", "NOTES", "Unit 1 — Electrical Technology Notes"],
  ["l-10-drsks", "EE10510", "NOTES", "Lecture 10 — Notes"],
  ["l-7-drsks-ee10510", "EE10510", "NOTES", "Lecture 7 — Notes"],
  ["l-8-dr-sks", "EE10510", "NOTES", "Lecture 8 — Notes"],
  ["l-9-drsks", "EE10510", "NOTES", "Lecture 9 — Notes"],
  ["unit-1-feee", "EE10510", "NOTES", "Unit 1 — FEEE Notes"],
  ["unit-2-feee", "EE10510", "NOTES", "Unit 2 — FEEE Notes"],
  ["unit-4-feee", "EE10510", "NOTES", "Unit 4 — FEEE Notes"],
  ["unit-5-feee", "EE10510", "NOTES", "Unit 5 — FEEE Notes"],
  ["unit-1-voltage-current", "EE10510", "NOTES", "Voltage & Current — Unit 1 Notes"],
  ["unit3-magnetic-ckt-l1-l2", "EE10510", "NOTES", "Magnetic Circuits — Unit 3 Notes (Lectures 1–2)"],
  ["assignment-unit1-dc-circuits-new", "EE10510", "ASSIGNMENT", "DC Circuits — Unit 1 Assignment (Additional Set)"],
  ["tutorial-unit1-dc-circuits-ee10510", "EE10510", "ASSIGNMENT", "DC Circuits — Unit 1 Tutorial Problems"],
  ["firstyear-practice-set", "EE10510", "ASSIGNMENT", "Practice Set 1"],
  ["practice-sheet-2", "EE10510", "ASSIGNMENT", "Practice Sheet 2 — Three-Phase Circuits"],
  ["practise-sheet-1-1st-year-2", "EE10510", "ASSIGNMENT", "Practice Sheet 1 (Additional Copy)"],
  ["assignment-unit-3", "EE10510", "ASSIGNMENT", "Unit 3 Assignment"],
  ["assignment-1-unit-2", "EE10510", "ASSIGNMENT", "Unit 2 Assignment (Three-Phase Circuits)"],
  ["assignment-1-unit-4", "EE10510", "ASSIGNMENT", "Unit 4 Assignment"],
  ["assignment-2-unit-5", "EE10510", "ASSIGNMENT", "Unit 5 Assignment"],
  ["karnaugh-maps-1", "EE10510", "NOTES", "Karnaugh Maps — Notes (Set 1)"],
  ["karnaugh-maps-2", "EE10510", "NOTES", "Karnaugh Maps — Notes (Set 2)"],
  ["half-adder-full-adder", "EE10510", "NOTES", "Half Adder & Full Adder — Notes"],
  ["mst-pyq__", "EE10510", "PYQ", "Fundamentals of Electrical Engineering — Test 1 (March 2025)"],

  // Physics (PH10009)
  ["ph10009-qc", "PH10009", "NOTES", "Quantum Computing — Unit 5 Notes (Additional Set)"],

  // Civil (CE10513)
  ["history-of-civil-engineering-2", "CE10513", "NOTES", "History of Civil Engineering — Notes (Additional Set)"],
  ["intro-to-civil-engineering-2", "CE10513", "NOTES", "Introduction to Civil Engineering — Notes (Additional Set)"],
  ["lecture-on-trusses", "CE10513", "NOTES", "Trusses — Lecture Notes"],

  // Languages (HU10512)
  ["assignment-2-hu10512", "HU10512", "ASSIGNMENT", "Languages for Engineers — Assignment 2"],
  ["hu10512-assignment-1", "HU10512", "ASSIGNMENT", "Languages for Engineers — Assignment 1"],
  ["linguistics-2", "HU10512", "NOTES", "Linguistics — Notes (Additional Set)"],
  ["lsrw-notes-1st-year-2", "HU10512", "NOTES", "LSRW — Notes (Additional Set)"],
  ["sq3r-method-notes-2", "HU10512", "NOTES", "SQ3R Reading Method — Notes (Additional Set)"],
  ["project-report-sample-document-2", "HU10512", "REFERENCE_MATERIAL", "Project Report — Sample Document (Additional Copy)"],
  ["unit-1-question", "HU10512", "QUESTION_BANK", "Unit 1 — Question Bank"],
  ["unit-2-question", "HU10512", "QUESTION_BANK", "Unit 2 — Question Bank"],
  ["sem1mst1__", "HU10512", "PYQ", "Languages for Engineers — MST 1 Question Paper"],

  // Understanding Bharat (HU10181)
  ["understanding-bharat", "HU10181", "REFERENCE_MATERIAL", "Understanding Bharat — Reference Material"],

  // Biology for Engineers (PY10514)
  ["3-genetics-molbio-engineering-applications", "PY10514", "NOTES", "Genetics & Molecular Biology — Engineering Applications"],
  ["bacteriology", "PY10514", "NOTES", "Bacteriology — Notes"],
  ["bio-lect-1st", "PY10514", "NOTES", "Biology — Lecture 1 Notes"],
  ["bioinspired-design", "PY10514", "SLIDES", "Bioinspired Design — Class Slides"],
  ["biology-for-engineering", "PY10514", "SLIDES", "Biology for Engineering — Class Slides"],
  ["biology-systems", "PY10514", "NOTES", "Biological Systems — Notes"],
  ["breathing-and-respiration", "PY10514", "NOTES", "Breathing & Respiration — Notes"],
  ["cardiovascular-respiratory-system", "PY10514", "SLIDES", "Cardiovascular & Respiratory System — Class Slides"],
  ["cardiovascular-system", "PY10514", "SLIDES", "Cardiovascular System — Class Slides (Additional Set)"],
  ["control-of-microorganisms", "PY10514", "SLIDES", "Control of Micro-organisms — Class Slides"],
  ["dna-structure-and-function", "PY10514", "NOTES", "DNA Structure & Function — Notes"],
  ["dna-structure-and-replication", "PY10514", "NOTES", "DNA Structure & Replication — Notes"],
  ["enzymes__", "PY10514", "SLIDES", "Enzymes — Class Slides"],
  ["fungi-structure-reproduction", "PY10514", "NOTES", "Fungi — Structure & Reproduction — Notes"],
  ["microbiology-l2-bacteria-structure", "PY10514", "NOTES", "Basic Structure of Bacteria — Notes"],
  ["microbiology-of-virus", "PY10514", "NOTES", "Microbiology of Virus — Notes"],
  ["nervous-system-1", "PY10514", "SLIDES", "Nervous System — Class Slides (Set 1)"],
  ["nervous-system-2", "PY10514", "SLIDES", "Nervous System — Class Slides (Set 2)"],
  ["recombinant-dna-technology", "PY10514", "NOTES", "Recombinant DNA Technology — Notes"],
  ["structure-function-biomolecules", "PY10514", "SLIDES", "Structure & Function of Biomolecules — Class Slides"],
  ["tissue-engineering-organ-system-1", "PY10514", "SLIDES", "Tissue Engineering & Organ Systems — Class Slides (Set 1)"],
  ["tissue-engineering-organ-systems-2", "PY10514", "SLIDES", "Tissue Engineering & Organ Systems — Class Slides (Set 2)"],
  ["tissue-engineering-organ-systems-3", "PY10514", "SLIDES", "Tissue Engineering & Organ Systems — Class Slides (Set 3)"],
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

  const files = fs.readdirSync(SCRATCH).filter((f) => /\.(pdf|docx|pptx|ppt)$/i.test(f));
  let created = 0;
  let skipped = 0;
  let notMatched = 0;

  for (const filename of files) {
    const entry = MANIFEST.find(([fragment]) => filename.toLowerCase().includes(fragment));
    if (!entry) {
      console.log("NO MANIFEST MATCH, skipping:", filename);
      notMatched++;
      continue;
    }
    const [, subjectCode, type, title] = entry;
    const ext = path.extname(filename).slice(1).toLowerCase();

    const category = subjectCode === "CH10010" ? "chemistry"
      : subjectCode === "IT10007" ? "it"
      : subjectCode === "MA10021" || subjectCode === "MA10509" ? "math"
      : subjectCode === "ME10008" || subjectCode === "IP10584" ? "mechanical"
      : subjectCode === "EE10510" ? "electronics"
      : subjectCode === "PH10009" ? "physics"
      : subjectCode === "CE10513" ? "civil"
      : subjectCode === "HU10512" || subjectCode === "HU10181" ? "languages"
      : subjectCode === "PY10514" ? "biology"
      : "general";

    const blobPath = `${category}/${slugify(title)}.${ext}`;
    const expectedUrl = `https://fr0cg5ys41r4psru.public.blob.vercel-storage.com/${blobPath}`;
    const existing = await prisma.resource.findFirst({ where: { fileUrl: expectedUrl } });
    if (existing) {
      skipped++;
      continue;
    }

    const buffer = fs.readFileSync(path.join(SCRATCH, filename));
    const blob = await put(blobPath, buffer, { access: "public", addRandomSuffix: false, allowOverwrite: true, token });

    await prisma.resource.create({
      data: {
        title,
        description: "",
        fileUrl: blob.url,
        fileType: ext.toUpperCase(),
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

  console.log(`\nDone. Created: ${created}, already existed: ${skipped}, no manifest match: ${notMatched}`);
  await prisma.$disconnect();
}

main();
