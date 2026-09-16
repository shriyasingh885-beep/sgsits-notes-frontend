import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(process.cwd(), "private-uploads");

const FILE_TYPE_BY_EXT: Record<string, string> = {
  ".pdf": "PDF",
  ".docx": "DOCX",
  ".pptx": "PPTX",
  ".ppt": "PPT",
};

// ── Official SGSITS B.Tech 1st-Year (4YDC) syllabus, July 2025 onwards ───
// Common for all branches. Names, codes, credits and unit titles are taken
// verbatim from the official syllabus PDF (cross-checked page by page).
type UnitDef = { number: number; title: string };
type SubjectDef = { code: string; name: string; credits: string; semesterNumber: number; units: UnitDef[] };

const SUBJECTS: Record<string, SubjectDef> = {
  MA10021: {
    code: "MA10021",
    name: "Mathematics for Engineers",
    credits: "L2·T1·P0 | 3 Credits",
    semesterNumber: 1,
    units: [
      { number: 1, title: "Evolution of Indian Mathematics & Differential Calculus" },
      { number: 2, title: "Integral Calculus" },
      { number: 3, title: "Matrices" },
      { number: 4, title: "Ordinary Differential Equations" },
      { number: 5, title: "Fuzzy Sets" },
    ],
  },
  HU10181: { code: "HU10181", name: "Understanding Bharat", credits: "L0·T2·P1 | 1 Credit", semesterNumber: 1, units: [] },
  IT10007: {
    code: "IT10007",
    name: "Fundamentals of IT & Artificial Intelligence",
    credits: "L2·T1·P2 | 5 Credits",
    semesterNumber: 1,
    units: [
      { number: 1, title: "Overview of Information Technology" },
      { number: 2, title: "C Fundamentals — Flowcharts to Decisions" },
      { number: 3, title: "Loops, Functions, Arrays & Pointers" },
      { number: 4, title: "Databases & SQL" },
      { number: 5, title: "Artificial Intelligence" },
    ],
  },
  ME10008: {
    code: "ME10008",
    name: "Overview of Mechanical Engineering & Graphics",
    credits: "L2·T0·P2 | 4 Credits",
    semesterNumber: 1,
    units: [
      { number: 1, title: "Engineering Materials & Properties" },
      { number: 2, title: "Mechanisms & Machines" },
      { number: 3, title: "Fluid Kinematics" },
      { number: 4, title: "IC Engines & Automobiles" },
      { number: 5, title: "Engineering Graphics" },
    ],
  },
  PH10009: {
    code: "PH10009",
    name: "Applied Physics",
    credits: "L2·T0·P1 | 3 Credits",
    semesterNumber: 1,
    units: [
      { number: 1, title: "Lasers" },
      { number: 2, title: "Fibre Optics" },
      { number: 3, title: "Special Theory of Relativity" },
      { number: 4, title: "Quantum Theory" },
      { number: 5, title: "Quantum Computation" },
    ],
  },
  CH10010: {
    code: "CH10010",
    name: "Applied Chemistry",
    credits: "L1·T0·P1 | 2 Credits",
    semesterNumber: 1,
    units: [
      { number: 1, title: "Water Technology" },
      { number: 2, title: "Lubricants, Fuels & Combustion" },
    ],
  },
  MA10509: {
    code: "MA10509",
    name: "Mathematics for Data Science",
    credits: "L2·T1·P0 | 3 Credits",
    semesterNumber: 2,
    units: [
      { number: 1, title: "Statistics & Probability Theory" },
      { number: 2, title: "Random Variables" },
      { number: 3, title: "Descriptive & Inferential Statistics" },
      { number: 4, title: "Correlation & Regression" },
      { number: 5, title: "Data Science Tools & Case Studies" },
    ],
  },
  EE10510: {
    code: "EE10510",
    name: "Fundamentals of Electrical & Electronics Engineering",
    credits: "L3·T0·P1 | 4 Credits",
    semesterNumber: 2,
    units: [
      { number: 1, title: "DC Circuit Analysis" },
      { number: 2, title: "AC Circuits & 3-Phase Systems" },
      { number: 3, title: "Magnetic Circuits & Electrical Machines" },
      { number: 4, title: "Semiconductor Devices" },
      { number: 5, title: "Digital Electronics" },
    ],
  },
  HU10512: {
    code: "HU10512",
    name: "Languages for Engineers",
    credits: "L1·T1·P2 | 2 Credits",
    semesterNumber: 2,
    units: [
      { number: 1, title: "Communication Skills" },
      { number: 2, title: "Project Writing" },
      { number: 3, title: "Speaking Skills & Presentation Strategies" },
    ],
  },
  CE10513: {
    code: "CE10513",
    name: "Fundamentals of Civil Engineering & Applied Mechanics",
    credits: "L2·T1·P1 | 4 Credits",
    semesterNumber: 2,
    units: [
      { number: 1, title: "Forces & Equilibrium" },
      { number: 2, title: "Centre of Gravity & Moment of Inertia" },
      { number: 3, title: "Beams — Reactions, SFD & BMD" },
      { number: 4, title: "Introduction to Civil Engineering" },
      { number: 5, title: "Geomatics & Plane Surveying" },
    ],
  },
  PY10514: {
    code: "PY10514",
    name: "Biology for Engineers",
    credits: "L2·T0·P1 | 3 Credits",
    semesterNumber: 2,
    units: [
      { number: 1, title: "Introduction to Biology" },
      { number: 2, title: "Genetics & Molecular Biology" },
      { number: 3, title: "Microbiology & Industrial Applications" },
      { number: 4, title: "Human Physiology & Biomedical Applications" },
      { number: 5, title: "Biomimicry, Systems & Synthetic Biology" },
    ],
  },
  IP10584: {
    code: "IP10584",
    name: "Design Thinking & Manufacturing Practices",
    credits: "L0·T1·P2 | 3 Credits",
    semesterNumber: 2,
    units: [
      { number: 1, title: "Design Thinking & Innovation" },
      { number: 2, title: "Ideation & Prototyping" },
      { number: 3, title: "Woodworking & Foundry" },
      { number: 4, title: "Forging & Welding" },
      { number: 5, title: "Machining & Fitting Practice" },
    ],
  },
};

// Each upload category's default subject.
const CATEGORY_DEFAULT_SUBJECT: Record<string, string> = {
  chemistry: "CH10010",
  physics: "PH10009",
  "mechanical-workshop": "ME10008",
  programming: "IT10007",
  mathematics: "MA10021",
  electronics: "EE10510",
  languages: "HU10512",
  civil: "CE10513",
  // "general" had no real home of its own — every one of its files has been
  // individually reviewed and reclassified into a real subject on production
  // (see the September 2026 cleanup). The file-seeding loop below is also
  // dead code now (private-uploads/ no longer exists — content lives in
  // Vercel Blob), so there is nothing left to route here.
};

const DATA_SCIENCE_MATH_PATTERN = /unit[45]|hypothesis|sampling|r-programming|r-programs|ms-excel|data-science|ma10501|ma10509|test-statistics/i;

// Workshop-practice files (carpentry, foundry, fitting, smithy, welding,
// casting, cutting fluids, lubricants) belong to IP10584 "Design Thinking &
// Manufacturing Practices" per the official syllabus, not ME10008 (which is
// theory-only: materials, mechanisms, fluid kinematics, IC engines, graphics).
const WORKSHOP_TO_IP10584 = new Set([
  "carpentry-shop.pdf",
  "foundry-shop.pdf",
  "fitting-1.pdf",
  "fitting-shop.pdf",
  "machine-shop.pdf",
  "smithy-shop.pdf",
  "welding-shop.pdf",
  "welding-shop-drive-1.pdf",
  "welding-shop-drive-2.pdf",
  "chapter-3-casting.pptx",
  "cutting-fluids.pptx",
  "oil-waste-disposal-methods.pptx",
  "selection-of-lubricant.pptx",
  "lubricants.pdf",
  "lubricants-study-material.docx",
  "lubricants-study-material-1.docx",
]);

// Explicit unit assignment per file, keyed by "<category>/<filename>" — only
// for files that clearly match one of the official unit titles above. Files
// not listed here stay at the subject level (no fabricated unit).
const UNIT_OVERRIDES: Record<string, number> = {
  // Applied Chemistry (2 official units)
  "chemistry/water.pdf": 1,
  "chemistry/water-chemistry.pdf": 1,
  "chemistry/chemistry-unit1-water-notes.pdf": 1,
  "chemistry/chemistry-water-slides.pdf": 1,
  "chemistry/chemistry-unit2-lubricants-notes.pdf": 2,
  "chemistry/chemistry-lubricants-slides.pdf": 2,

  // Applied Physics
  "physics/laser-notes.pdf": 1,
  "physics/fibre-optics-notes-v1.pdf": 2,
  "physics/fiber-optics-slides.pdf": 2,
  "physics/special-theory-of-relativity.pdf": 3,
  "physics/quantum-theory-notes-v1.pdf": 4,
  "physics/quantum-theory-slides.pdf": 4,
  "physics/quantum-computing-notes.pdf": 5,
  "physics/quantum-computing-slides.pptx": 5,

  // Fundamentals of IT & AI
  "programming/unit1-basic-concepts-of-it.pdf": 1,
  "programming/intro-to-hardware-and-software.pdf": 1,
  "programming/intro-to-computer-networks.pdf": 1,
  "programming/overview-of-operating-system.pdf": 1,
  "programming/unit1-it-question-bank.pdf": 1,
  "programming/number-system-notes.pdf": 1,
  "programming/flowcharts-and-algorithms.pdf": 2,
  "programming/basics-of-c-language-semA.pdf": 2,
  "programming/chapter-2-instructions-and-operators.pdf": 2,
  "programming/chapter-3-conditional-instructions.pdf": 2,
  "programming/chapter-3-boolean-algebra.pptx": 2,
  "programming/c-language-book-semA.pdf": 2,
  "programming/arrays-and-strings.pdf": 3,
  "programming/functions-and-recursion.pdf": 3,
  "programming/pointers-in-c-part1.pdf": 3,
  "programming/c-language-question-bank-1.pdf": 3,
  "programming/c-language-question-bank-2.pdf": 3,
  "programming/dbms-notes-1.pdf": 4,
  "programming/dbms-notes-2.pdf": 4,
  "programming/dbms-question-bank.pdf": 4,
  "programming/intro-to-ai-notes-1.pdf": 5,
  "programming/intro-to-ai-notes-2.pdf": 5,
  "programming/intro-to-ai-question-bank.pdf": 5,

  // Overview of Mechanical Engineering & Graphics (theory only)
  "mechanical-workshop/properties-of-materials-notes.pdf": 1,
  "mechanical-workshop/unit1-mechanical-properties-slides.pdf": 1,
  "mechanical-workshop/mechanical-properties-question-bank.pdf": 1,
  "mechanical-workshop/strength-of-material.pdf": 1,
  "mechanical-workshop/theory-of-machines-notes.pdf": 2,
  "mechanical-workshop/unit2-theory-of-machines-slides.pdf": 2,
  "mechanical-workshop/fluid-kinematics-notes.pdf": 3,
  "mechanical-workshop/fluid-kinematics-question-bank.pdf": 3,
  "mechanical-workshop/unit3-fluid-kinematics-slides.pdf": 3,
  "mechanical-workshop/fluid-mechanics.pdf": 3,
  "mechanical-workshop/ic-engine-automobiles-question-bank.pdf": 4,
  "mechanical-workshop/unit4-ic-engines-automobiles-slides.pdf": 4,

  // Design Thinking & Manufacturing Practices (workshop files, reassigned above)
  "mechanical-workshop/carpentry-shop.pdf": 3,
  "mechanical-workshop/foundry-shop.pdf": 3,
  "mechanical-workshop/chapter-3-casting.pptx": 3,
  "mechanical-workshop/smithy-shop.pdf": 4,
  "mechanical-workshop/welding-shop.pdf": 4,
  "mechanical-workshop/welding-shop-drive-1.pdf": 4,
  "mechanical-workshop/welding-shop-drive-2.pdf": 4,
  "mechanical-workshop/fitting-1.pdf": 5,
  "mechanical-workshop/fitting-shop.pdf": 5,
  "mechanical-workshop/machine-shop.pdf": 5,
  "mechanical-workshop/cutting-fluids.pptx": 5,
  "mechanical-workshop/oil-waste-disposal-methods.pptx": 5,
  "mechanical-workshop/selection-of-lubricant.pptx": 5,
  "mechanical-workshop/lubricants.pdf": 5,
  "mechanical-workshop/lubricants-study-material.docx": 5,
  "mechanical-workshop/lubricants-study-material-1.docx": 5,

  // Mathematics for Engineers
  "mathematics/indian-mathematicians-unit1.pdf": 1,
  "mathematics/successive-differentiation.pdf": 1,
  "mathematics/mclaurin-taylor-series.pdf": 1,
  "mathematics/maxima-minima-jacobian-taylor.pdf": 1,
  "mathematics/beta-gamma-functions.pdf": 2,
  "mathematics/double-integrals.pdf": 2,
  "mathematics/integration.pdf": 2,
  "mathematics/matrices-1.pdf": 3,
  "mathematics/matrices-2.pdf": 3,
  "mathematics/matrices-3.pdf": 3,
  "mathematics/matrices-semA.pdf": 3,
  "mathematics/differential-equations-1.pdf": 4,
  "mathematics/differential-equations-2.pdf": 4,
  "mathematics/fuzzy-sets.pdf": 5,

  // Mathematics for Data Science
  "mathematics/test-statistics.pdf": 3,
  "mathematics/unit4-hypothesis-testing.pdf": 3,
  "mathematics/unit4-sampling.pdf": 3,
  "mathematics/unit5-r-programming.pdf": 5,
  "mathematics/unit5-list-of-r-programs.pdf": 5,
  "mathematics/unit5-ms-excel.pdf": 5,
  "mathematics/assignment-2-unit-5.pdf": 5,

  // Fundamentals of Electrical & Electronics Engineering
  "electronics/assignment-unit1-dc-circuits.pdf": 1,
  "electronics/practice-sheet-2-ac-3-phase.pdf": 2,
  "electronics/transformer.pdf": 3,
  "electronics/unit4-dc-motor.pdf": 3,
  "electronics/eee-analog-cheatsheet.pdf": 4,
  "electronics/eee-digital-cheatsheet.pdf": 5,

  // Languages for Engineers
  "languages/communication-notes.docx": 1,
  "languages/ppt-communication-skills.pptx": 1,
  "languages/lsrw-notes.pdf": 1,
  "languages/sound-spelling-chart.pdf": 1,
  "languages/linguistics.pdf": 1,
  "languages/language-skills.docx": 1,
  "languages/sq3r-method-notes.pdf": 1,
  "languages/project-writing-notes.pdf": 2,
  "languages/project-report-sample-document.pdf": 2,
  "languages/oral-presentation-notes.pdf": 3,
  "languages/ppt-public-speaking.ppt": 3,

  // Fundamentals of Civil Engineering & Applied Mechanics
  "civil/introduction-to-civil-engineering.pdf": 4,
  "civil/history-of-civil-engineering.pdf": 4,
  "civil/technology-and-civil-engineering.pdf": 4,
  "civil/kailasa-temple-case-study.pdf": 4,
  "civil/chain-surveying-notes.pdf": 5,
  "civil/types-of-surveys-detailed-notes.pdf": 5,
  "civil/surveying-example-questions.pdf": 5,
};

// ── Hand-written, student-friendly titles for every seeded file ──────────
// Keyed by "<category>/<filename>" so identical filenames across
// categories (rare) don't collide. Pattern: "Chapter/Topic — Resource Type".
const TITLE_OVERRIDES: Record<string, string> = {
  // chemistry
  "chemistry/aas-gta-reading-material.pdf": "Atomic Absorption Spectroscopy — Reading Material",
  "chemistry/aas.pdf": "Atomic Absorption Spectroscopy — Notes",
  "chemistry/atomic-absorption-spectroscopy-notes.pdf": "Atomic Absorption Spectroscopy — Detailed Notes",
  "chemistry/basic-chem.pdf": "Applied Chemistry — Basic Concepts",
  "chemistry/catalysis.pdf": "Catalysis — Notes",
  "chemistry/chem-cheat-sheet-1.pdf": "Applied Chemistry — Cheat Sheet 1",
  "chemistry/chem-cheat-sheet-2.pdf": "Applied Chemistry — Cheat Sheet 2",
  "chemistry/chemistry-1st-mst.pdf": "Applied Chemistry — MST 1 Question Paper",
  "chemistry/chemistry-endsem-2025.pdf": "Applied Chemistry — End-Semester Paper (2025)",
  "chemistry/chemistry-lab-manual-be-1st-year.pdf": "Applied Chemistry — Lab Manual (B.E. First Year)",
  "chemistry/chemistry-lab-manual-semA.pdf": "Applied Chemistry — Lab Manual",
  "chemistry/chemistry-lubricants-slides.pdf": "Lubricants — Class Slides",
  "chemistry/chemistry-mst1-semA.pdf": "Applied Chemistry — MST 1 Question Paper (Alt. Copy)",
  "chemistry/chemistry-mst2-semA.pdf": "Applied Chemistry — MST 2 Question Paper",
  "chemistry/chemistry-notes.pdf": "Applied Chemistry — Complete Notes",
  "chemistry/chemistry-practical-1.pdf": "Applied Chemistry — Practical 1",
  "chemistry/chemistry-practical-2.pdf": "Applied Chemistry — Practical 2",
  "chemistry/chemistry-practical-3.pdf": "Applied Chemistry — Practical 3",
  "chemistry/chemistry-practicals-semA.pdf": "Applied Chemistry — Practical Record",
  "chemistry/chemistry-previous-years-2.pdf": "Applied Chemistry — Previous Year Questions (Set 2)",
  "chemistry/chemistry-previous-years.pdf": "Applied Chemistry — Previous Year Questions (Set 1)",
  "chemistry/chemistry-unit1-water-notes.pdf": "Water Technology — Unit 1 Notes",
  "chemistry/chemistry-unit2-lubricants-notes.pdf": "Lubricants — Unit 2 Notes",
  "chemistry/chemistry-water-slides.pdf": "Water Technology — Class Slides",
  "chemistry/chromatography-notes.pdf": "Chromatography — Notes",
  "chemistry/corrosion-1.pdf": "Corrosion Science — Notes (Part 1)",
  "chemistry/corrosion-2.pdf": "Corrosion Science — Notes (Part 2)",
  "chemistry/corrosion-4-rotated.pdf": "Corrosion Science — Notes (Part 3)",
  "chemistry/corrosion-5-rotated.pdf": "Corrosion Science — Notes (Part 4)",
  "chemistry/corrosion-science-notes.pdf": "Corrosion Science — Summary Notes",
  "chemistry/environmental-pollution.pdf": "Environmental Pollution — Notes",
  "chemistry/ethics-for-corrosion-control.docx": "Corrosion Control — Ethics Discussion",
  "chemistry/green-chemistry.pdf": "Green Chemistry — Notes",
  "chemistry/infrared-spectroscopy.pdf": "Infrared (IR) Spectroscopy — Notes",
  "chemistry/ir-spectroscopy-2.pdf": "Infrared (IR) Spectroscopy — Notes (Set 2)",
  "chemistry/lech206.pdf": "Applied Chemistry — Lab Manual (LECH206)",
  "chemistry/nmr-notes.pdf": "NMR Spectroscopy — Notes",
  "chemistry/polymers.pdf": "Polymers — Notes",
  "chemistry/spectroscopy.pdf": "Spectroscopy — Overview Notes",
  "chemistry/unit1-organic-inorganic-physical-chemistry.pdf": "Organic, Inorganic & Physical Chemistry — Unit 1 Notes",
  "chemistry/water-chemistry.pdf": "Water Technology — Notes (Set 2)",
  "chemistry/water.pdf": "Water Technology — Complete Notes",

  // civil
  "civil/ce-assignment-1.pdf": "Civil Engineering — Assignment 1",
  "civil/chain-surveying-notes.pdf": "Chain Surveying — Notes",
  "civil/history-of-civil-engineering.pdf": "History of Civil Engineering — Notes",
  "civil/introduction-to-civil-engineering.pdf": "Introduction to Civil Engineering — Notes",
  "civil/kailasa-temple-case-study.pdf": "Kailasa Temple — Architecture Case Study",
  "civil/surveying-example-questions.pdf": "Surveying — Practice Questions",
  "civil/technology-and-civil-engineering.pdf": "Technology & Civil Engineering — Notes",
  "civil/types-of-surveys-detailed-notes.pdf": "Types of Surveys — Detailed Notes",

  // electronics
  "electronics/assignment-1-unit-2.pdf": "Electrical & Electronics Engineering — Assignment (Unit 2)",
  "electronics/assignment-electrical.pdf": "Electrical & Electronics Engineering — Assignment",
  "electronics/assignment-unit1-dc-circuits.pdf": "DC Circuits — Assignment (Unit 1)",
  "electronics/ec-unit-1.pdf": "Electronics — Unit 1 Notes",
  "electronics/ece-syllabus.pdf": "Electronics & Communication — Syllabus",
  "electronics/ee-notes.pdf": "Electrical & Electronics Engineering — Complete Notes",
  "electronics/eee-analog-cheatsheet.pdf": "Analog Electronics — Cheat Sheet",
  "electronics/eee-digital-cheatsheet.pdf": "Digital Electronics — Cheat Sheet",
  "electronics/et-unit1.pdf": "Electrical Technology — Unit 1 Notes",
  "electronics/et-unit2-part1.pdf": "Electrical Technology — Unit 2 Notes (Part 1)",
  "electronics/et-unit2-part2.pdf": "Electrical Technology — Unit 2 Notes (Part 2)",
  "electronics/et-unit3-part1.pdf": "Electrical Technology — Unit 3 Notes (Part 1)",
  "electronics/et-unit3-part2.pdf": "Electrical Technology — Unit 3 Notes (Part 2)",
  "electronics/lecture-6.pdf": "Electrical & Electronics Engineering — Lecture 6",
  "electronics/lecture-7-dr-sks-ee10510.pdf": "Electrical & Electronics Engineering — Lecture 7",
  "electronics/lecture-8-dr-sks.pdf": "Electrical & Electronics Engineering — Lecture 8",
  "electronics/lecture-9-dr-sks.pdf": "Electrical & Electronics Engineering — Lecture 9",
  "electronics/practice-sheet-2-ac-3-phase.pdf": "AC Three-Phase Circuits — Practice Sheet",
  "electronics/practice-sheet-2.pdf": "Electrical & Electronics Engineering — Practice Sheet 2",
  "electronics/syllabus-mst2.pdf": "Electrical & Electronics Engineering — MST 2 Syllabus",
  "electronics/transformer.pdf": "Transformers — Notes",
  "electronics/unit4-dc-motor.pdf": "DC Motor — Unit 4 Notes",

  // general
  "general/adobe-scan-2022.pdf": "Handwritten Notes — Scanned Copy (2022)",
  "general/btech-2nd-year-it-applied-maths-syllabus.pdf": "B.Tech 2nd Year IT — Applied Maths Syllabus",
  "general/camscanner-1905084940.pdf": "Handwritten Notes — Scanned Set 1",
  "general/camscanner-2405132557.pdf": "Handwritten Notes — Scanned Set 2",
  "general/camscanner-2405132920.pdf": "Handwritten Notes — Scanned Set 3",
  "general/camscanner-2705070337.pdf": "Handwritten Notes — Scanned Set 4",
  "general/divyanshu-ab-19063.pdf": "Student Assignment Submission (Roll No. AB-19063)",
  "general/endsem-2015-19-compilation.pdf": "End-Semester PYQs — Compilation (2015–2019)",
  "general/endsem-2022-paper1.pdf": "End-Semester Exam Paper — 2022 (Set 1)",
  "general/endsem-2022-paper2.pdf": "End-Semester Exam Paper — 2022 (Set 2)",
  "general/endsem-pyq-compilation.pdf": "End-Semester Previous Year Questions — Compilation",
  "general/lab-manual-unlabeled.pdf": "Lab Manual (Subject Unspecified)",
  "general/paper.pdf": "Question Paper (Subject Unspecified)",
  "general/scan-2.pdf": "Handwritten Notes — Scan A",
  "general/scan-3.pdf": "Handwritten Notes — Scan B",
  "general/scan-4.pdf": "Handwritten Notes — Scan C",
  "general/scan-5-alt.pdf": "Handwritten Notes — Scan D",
  "general/scan-5.pdf": "Handwritten Notes — Scan E",
  "general/sem2-syllabus.pdf": "Semester 2 — Syllabus",
  "general/semA-syllabus.pdf": "First Year — Syllabus Overview",
  "general/sgsits-papers.pdf": "SGSITS — Previous Year Question Papers (Multiple Subjects)",
  "general/sgsits-syllabus-btech-1st-year-2025.pdf": "SGSITS B.Tech First Year Syllabus (2025)",
  "general/syllabus-2nd-sem.pdf": "Semester 2 — Syllabus (Alternate Copy)",
  "general/unlabeled-assignment-a1.pdf": "Assignment 1 (Subject Unspecified)",
  "general/unlabeled-doc-1.docx": "Miscellaneous Notes (Unspecified Subject)",

  // languages
  "languages/ab-15096-eng-labmanual.pdf": "Communication Skills — Lab Manual (AB-15096)",
  "languages/communication-notes.docx": "Communication Skills — Notes",
  "languages/eng-lab-manual.pdf": "English Lab Manual",
  "languages/english-lab-manual-google-docs.pdf": "English Lab Manual (Alternate Copy)",
  "languages/english-lab-tanmay-mehta.pdf": "English Lab Record — Sample Submission",
  "languages/english-practical.pdf": "English — Practical Record",
  "languages/lab-manual-english.pdf": "English Lab Manual (Set 2)",
  "languages/language-skills.docx": "Language Skills — Notes",
  "languages/linguistics.pdf": "Linguistics — Notes",
  "languages/lsrw-notes.pdf": "Listening, Speaking, Reading & Writing (LSRW) — Notes",
  "languages/oral-presentation-notes.pdf": "Oral Presentation — Notes",
  "languages/ppt-communication-skills.pptx": "Communication Skills — Class Slides",
  "languages/ppt-public-speaking.ppt": "Public Speaking — Class Slides",
  "languages/project-report-sample-document.pdf": "Project Report — Sample Document",
  "languages/project-writing-notes.pdf": "Project Writing — Notes",
  "languages/sgsits-english-proficiency-test.pdf": "SGSITS English Proficiency Test — Sample Paper",
  "languages/sound-spelling-chart.pdf": "Sound & Spelling Chart",
  "languages/sq3r-method-notes.pdf": "SQ3R Reading Method — Notes",
  "languages/technical-english-mst1.pdf": "Technical English — MST 1 Question Paper",
  "languages/unit2-technical-english-notes.pdf": "Technical English — Unit 2 Notes",

  // mathematics
  "mathematics/all-pyq-last-year-compilation.pdf": "Complete Previous Year Question Papers — All Subjects (Compilation)",
  "mathematics/all-theorems.pdf": "Mathematics I — All Theorems Compilation",
  "mathematics/asymptotes-and-curve-tracing.pdf": "Asymptotes & Curve Tracing — Notes",
  "mathematics/beta-gamma-functions.pdf": "Beta & Gamma Functions — Notes",
  "mathematics/curvature-1.pdf": "Curvature — Notes (Part 1)",
  "mathematics/curvature-2.pdf": "Curvature — Notes (Part 2)",
  "mathematics/differential-equations-1.pdf": "Differential Equations — Notes (Part 1)",
  "mathematics/differential-equations-2.pdf": "Differential Equations — Notes (Part 2)",
  "mathematics/double-integrals.pdf": "Double Integrals — Notes",
  "mathematics/fuzzy-sets.pdf": "Fuzzy Sets — Notes",
  "mathematics/hyperbolic-functions.pdf": "Hyperbolic Functions — Notes",
  "mathematics/indian-mathematicians-unit1.pdf": "Contributions of Indian Mathematicians — Unit 1 Notes",
  "mathematics/infinite-series-1.pdf": "Infinite Series — Notes (Part 1)",
  "mathematics/infinite-series-2.pdf": "Infinite Series — Notes (Part 2)",
  "mathematics/integration.pdf": "Integration — Notes",
  "mathematics/m02-previous-years-2.pdf": "Mathematics I — Previous Year Questions (Set 2)",
  "mathematics/m02-previous-years.pdf": "Mathematics I — Previous Year Questions (Set 1)",
  "mathematics/math-endsem-2018-2024.pdf": "Mathematics I — End-Semester PYQs (2018–2024)",
  "mathematics/math-endsem-april2025.pdf": "Mathematics I — End-Semester Paper (April 2025)",
  "mathematics/math-endsem-december2025.pdf": "Mathematics I — End-Semester Paper (December 2025)",
  "mathematics/math-mst1-semA.pdf": "Mathematics I — MST 1 Question Paper",
  "mathematics/math-mst2-semA.pdf": "Mathematics I — MST 2 Question Paper",
  "mathematics/matrices-1.pdf": "Matrices — Notes (Part 1)",
  "mathematics/matrices-2.pdf": "Matrices — Notes (Part 2)",
  "mathematics/matrices-3.pdf": "Matrices — Notes (Part 3)",
  "mathematics/matrices-semA.pdf": "Matrices — Notes (Set 2)",
  "mathematics/maxima-minima-jacobian-taylor.pdf": "Maxima, Minima, Jacobians & Taylor's Theorem — Notes",
  "mathematics/mclaurin-taylor-series.pdf": "Maclaurin & Taylor Series — Notes",
  "mathematics/practice-questions-unit-5.pdf": "Mathematics II — Unit 5 Practice Questions",
  "mathematics/practice-sheet-1-first-year.pdf": "Mathematics I — Practice Sheet 1",
  "mathematics/successive-differentiation.pdf": "Successive Differentiation — Notes",
  "mathematics/test-statistics.pdf": "Test Statistics — Notes",
  "mathematics/assignment-1-ma10509.pdf": "Mathematics II — Assignment 1",
  "mathematics/assignment-2-ma10501-data-science.pdf": "Mathematics for Data Science — Assignment 2",
  "mathematics/assignment-2-sk.pdf": "Mathematics II — Assignment 2",
  "mathematics/assignment-2-unit-5.pdf": "Mathematics II — Unit 5 Assignment",
  "mathematics/mathematics-2-mst1.pdf": "Mathematics II — MST 1 Question Paper",
  "mathematics/unit4-hypothesis-testing.pdf": "Hypothesis Testing — Unit 4 Notes",
  "mathematics/unit4-sampling.pdf": "Sampling Theory — Unit 4 Notes",
  "mathematics/unit5-list-of-r-programs.pdf": "R Programming — List of Programs (Unit 5)",
  "mathematics/unit5-ms-excel.pdf": "MS Excel for Data Analysis — Unit 5 Notes",
  "mathematics/unit5-r-programming.pdf": "R Programming — Unit 5 Notes",
  "mathematics/maths-cheat-sheet.pdf": "Mathematics — Cheat Sheet",

  // mechanical-workshop
  "mechanical-workshop/bme-first-sem-complete-theory.pdf": "Basic Mechanical Engineering — Complete Theory",
  "mechanical-workshop/carpentry-shop.pdf": "Carpentry Shop — Workshop Notes",
  "mechanical-workshop/chapter-3-casting.pptx": "Casting — Chapter 3 Slides",
  "mechanical-workshop/cutting-fluids.pptx": "Cutting Fluids — Slides",
  "mechanical-workshop/fitting-1.pdf": "Fitting Shop — Practical Notes (Part 1)",
  "mechanical-workshop/fitting-shop.pdf": "Fitting Shop — Workshop Notes",
  "mechanical-workshop/fluid-kinematics-notes.pdf": "Fluid Kinematics — Notes",
  "mechanical-workshop/fluid-kinematics-question-bank.pdf": "Fluid Kinematics — Question Bank",
  "mechanical-workshop/fluid-mechanics.pdf": "Fluid Mechanics — Notes",
  "mechanical-workshop/fme-mst1-paper.pdf": "Fundamentals of Mechanical Engineering — MST 1 Paper",
  "mechanical-workshop/fme-notes-ravi-jatola.pdf": "Fundamentals of Mechanical Engineering — Notes",
  "mechanical-workshop/foundry-shop.pdf": "Foundry Shop — Workshop Notes",
  "mechanical-workshop/ic-engine-automobiles-question-bank.pdf": "IC Engines & Automobiles — Question Bank",
  "mechanical-workshop/intro-to-mechanics.pdf": "Introduction to Mechanics — Notes",
  "mechanical-workshop/lubricants-study-material-1.docx": "Lubricants — Study Material (Set 1)",
  "mechanical-workshop/lubricants-study-material.docx": "Lubricants — Study Material",
  "mechanical-workshop/lubricants.pdf": "Lubricants — Notes",
  "mechanical-workshop/machine-shop.pdf": "Machine Shop — Workshop Notes",
  "mechanical-workshop/manufacturing-process.pdf": "Manufacturing Processes — Notes",
  "mechanical-workshop/me-boiler-notes.pdf": "Boilers — Notes",
  "mechanical-workshop/mechanical-endsem-2025.pdf": "Mechanical Engineering — End-Semester Paper (2025)",
  "mechanical-workshop/mechanical-mst1-semA.pdf": "Mechanical Engineering — MST 1 Question Paper",
  "mechanical-workshop/mechanical-mst2-semA.pdf": "Mechanical Engineering — MST 2 Question Paper",
  "mechanical-workshop/mechanical-properties-question-bank.pdf": "Mechanical Properties of Materials — Question Bank",
  "mechanical-workshop/mechanical-sample-paper-1.pdf": "Mechanical Engineering — Sample Paper 1",
  "mechanical-workshop/mechanical-sample-paper-2.pdf": "Mechanical Engineering — Sample Paper 2",
  "mechanical-workshop/mechanical-sample-paper-3.pdf": "Mechanical Engineering — Sample Paper 3",
  "mechanical-workshop/mechanical-sample-paper-4.pdf": "Mechanical Engineering — Sample Paper 4",
  "mechanical-workshop/mechanical-sample-paper-5.pdf": "Mechanical Engineering — Sample Paper 5",
  "mechanical-workshop/oil-waste-disposal-methods.pptx": "Oil Waste Disposal Methods — Slides",
  "mechanical-workshop/properties-of-materials-notes.pdf": "Mechanical Properties of Materials — Notes",
  "mechanical-workshop/selection-of-lubricant.pptx": "Selection of Lubricants — Slides",
  "mechanical-workshop/smithy-shop.pdf": "Smithy Shop — Workshop Notes",
  "mechanical-workshop/strength-of-material.pdf": "Strength of Materials — Notes",
  "mechanical-workshop/theory-of-machines-notes.pdf": "Theory of Machines — Notes",
  "mechanical-workshop/thermodynamics.pdf": "Thermodynamics — Notes",
  "mechanical-workshop/unit1-mechanical-properties-slides.pdf": "Mechanical Properties of Materials — Unit 1 Slides",
  "mechanical-workshop/unit2-theory-of-machines-slides.pdf": "Theory of Machines — Unit 2 Slides",
  "mechanical-workshop/unit3-fluid-kinematics-slides.pdf": "Fluid Kinematics — Unit 3 Slides",
  "mechanical-workshop/unit4-ic-engines-automobiles-slides.pdf": "IC Engines & Automobiles — Unit 4 Slides",
  "mechanical-workshop/welding-shop-drive-1.pdf": "Welding Shop — Workshop Notes (Set 1)",
  "mechanical-workshop/welding-shop-drive-2.pdf": "Welding Shop — Workshop Notes (Set 2)",
  "mechanical-workshop/welding-shop.pdf": "Welding Shop — Workshop Notes",

  // physics
  "physics/fiber-optics-slides.pdf": "Fiber Optics — Class Slides",
  "physics/fibre-optics-notes-v1.pdf": "Fiber Optics — Notes",
  "physics/interference.pdf": "Interference — Notes",
  "physics/laser-notes.pdf": "LASER — Notes",
  "physics/physics-1st-year-complete-v2.pdf": "Engineering Physics — Complete First-Year Notes (Set 2)",
  "physics/physics-endsem-1-2025.pdf": "Engineering Physics — End-Semester Paper (2025)",
  "physics/physics-full-notes.pdf": "Engineering Physics — Complete Notes",
  "physics/physics-mst2-semA.pdf": "Engineering Physics — MST 2 Question Paper",
  "physics/physics-notes-op-thakur.pdf": "Engineering Physics — Notes",
  "physics/physics-sample-papers-4sets.pdf": "Engineering Physics — Sample Papers (4 Sets)",
  "physics/quantum-computing-notes.pdf": "Quantum Computing — Notes",
  "physics/quantum-computing-slides.pptx": "Quantum Computing — Class Slides",
  "physics/quantum-theory-notes-v1.pdf": "Quantum Theory — Notes",
  "physics/quantum-theory-slides.pdf": "Quantum Theory — Class Slides",
  "physics/special-theory-of-relativity.pdf": "Special Theory of Relativity — Notes",

  // programming
  "programming/arrays-and-strings.pdf": "Arrays & Strings — Notes",
  "programming/basics-of-c-language-semA.pdf": "C Programming — Basics Notes",
  "programming/c-language-book-semA.pdf": "Computer Programming: Theory & Practicals — Textbook",
  "programming/c-language-question-bank-1.pdf": "C Programming — Question Bank (Set 1)",
  "programming/c-language-question-bank-2.pdf": "C Programming — Question Bank (Set 2)",
  "programming/chapter-2-instructions-and-operators.pdf": "Instructions & Operators — Chapter 2 Notes",
  "programming/chapter-3-boolean-algebra.pptx": "Boolean Algebra — Chapter 3 Slides",
  "programming/chapter-3-conditional-instructions.pdf": "Conditional Instructions — Chapter 3 Notes",
  "programming/co10504-lab-assignment-3.pdf": "Computer Programming Lab — Assignment 3",
  "programming/co10504-lab-assignment-4.pdf": "Computer Programming Lab — Assignment 4",
  "programming/co10504-lab-assignment-5.pdf": "Computer Programming Lab — Assignment 5",
  "programming/computer-organization-syllabus.pdf": "Computer Organization & Architecture — Syllabus",
  "programming/cp-notes.pdf": "Computer Programming — Notes",
  "programming/dbms-notes-1.pdf": "DBMS — Notes (Set 1)",
  "programming/dbms-notes-2.pdf": "DBMS — Notes (Set 2)",
  "programming/dbms-question-bank.pdf": "DBMS — Question Bank",
  "programming/flowcharts-and-algorithms.pdf": "Flowcharts & Algorithms — Notes",
  "programming/functions-and-recursion.pdf": "Functions & Recursion — Notes",
  "programming/intro-to-ai-notes-1.pdf": "Introduction to AI — Notes (Set 1)",
  "programming/intro-to-ai-notes-2.pdf": "Introduction to AI — Notes (Set 2)",
  "programming/intro-to-ai-question-bank.pdf": "Introduction to AI — Question Bank",
  "programming/intro-to-computer-networks.pdf": "Computer Networks — Introductory Notes",
  "programming/intro-to-hardware-and-software.pdf": "Computer Hardware & Software — Introductory Notes",
  "programming/it-endsem-2019-2024.pdf": "Fundamentals of IT — End-Semester PYQs (2019–2024)",
  "programming/it-endsem-2025.pdf": "Fundamentals of IT — End-Semester Paper (2025)",
  "programming/it-mst1-solutions.pdf": "Fundamentals of IT — MST 1 Solutions",
  "programming/it-mst1.pdf": "Fundamentals of IT — MST 1 Question Paper",
  "programming/it-mst2.pdf": "Fundamentals of IT — MST 2 Question Paper",
  "programming/lab-assignment-0.pdf": "Programming Lab — Assignment 0",
  "programming/lab-assignment-1.pdf": "Programming Lab — Assignment 1",
  "programming/lab-assignment-2.pdf": "Programming Lab — Assignment 2",
  "programming/number-system-notes.pdf": "Number Systems — Notes",
  "programming/overview-of-operating-system.pdf": "Operating Systems — Overview Notes",
  "programming/pointers-in-c-part1.pdf": "Pointers in C — Notes (Part 1)",
  "programming/programming-mst1.pdf": "Fundamentals of IT — MST 1 Question Paper",
  "programming/python-cheat-sheet.pdf": "Python — Cheat Sheet",
  "programming/unit1-basic-concepts-of-it.pdf": "Basic Concepts of IT — Unit 1 Notes",
  "programming/unit1-it-question-bank.pdf": "Fundamentals of IT — Unit 1 Question Bank",
};

function inferResourceType(filename: string): string {
  const f = filename.toLowerCase();
  if (/pyq|endsem|previous.?years?|mst|paper/.test(f)) return "PYQ";
  if (/question.?bank/.test(f)) return "QUESTION_BANK";
  if (/assignment/.test(f)) return "ASSIGNMENT";
  if (/lab.?manual|manual/.test(f)) return "LAB_MANUAL";
  if (/practical/.test(f)) return "PRACTICAL";
  if (/syllabus/.test(f)) return "SYLLABUS";
  if (/slides|ppt/.test(f)) return "SLIDES";
  if (/cheat.?sheet/.test(f)) return "CHEAT_SHEET";
  if (/scan|camscanner|adobe.?scan|unlabeled/.test(f)) return "HANDWRITTEN_NOTES";
  return "NOTES";
}

function cleanTitle(category: string, filename: string): string {
  const key = `${category}/${filename}`;
  if (TITLE_OVERRIDES[key]) return TITLE_OVERRIDES[key];

  let base = filename.replace(path.extname(filename), "");
  base = base
    .replace(/\bsema\b/gi, "")
    .replace(/\bv(\d)\b/gi, "(Version $1)")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  base = base
    .replace(/\bpyq\b/gi, "Previous Year Questions")
    .replace(/\bmst(\d)\b/gi, "Mid-Semester Test $1")
    .replace(/\bmst\b/gi, "Mid-Semester Test")
    .replace(/\bqb\b/gi, "Question Bank")
    .replace(/\bdc\b/g, "DC")
    .replace(/\bac\b/g, "AC")
    .replace(/\bee\b/gi, "Electrical Engineering")
    .replace(/\bit\b/gi, "IT")
    .replace(/\bdbms\b/gi, "DBMS")
    .replace(/\bai\b/gi, "AI");

  return base.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s{2,}/g, " ").trim();
}

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@collegenoteshub.dev" },
    update: {},
    create: { name: "Platform Admin", email: "admin@collegenoteshub.dev", passwordHash: adminPassword, role: "ADMIN" },
  });

  const studentPassword = await bcrypt.hash("Student@123", 10);
  // Every seeded resource is attributed to this account. It is not a real
  // person — the library was assembled by the project team — so it carries a
  // team label. Real contributors who upload through the site get their own
  // name (the "Your name" field on /uploads) and show up individually.
  const contributor = await prisma.user.upsert({
    where: { email: "contributor@collegenoteshub.dev" },
    update: { name: "NotesVault Team" },
    create: { name: "NotesVault Team", email: "contributor@collegenoteshub.dev", passwordHash: studentPassword, role: "STUDENT" },
  });

  await prisma.user.upsert({
    where: { email: "student@collegenoteshub.dev" },
    update: {},
    create: { name: "Demo Student Account", email: "student@collegenoteshub.dev", passwordHash: studentPassword, role: "STUDENT" },
  });

  // This site is SGSITS-only — DAVV/IIT Indore placeholder colleges from an
  // earlier multi-college draft were removed from production; don't reseed them.
  const sgsits = await prisma.college.upsert({
    where: { slug: "sgsits" },
    update: {},
    create: { name: "Shri G. S. Institute of Technology and Science (SGSITS)", slug: "sgsits", city: "Indore" },
  });

  // First-year semesters: common to all branches, so branchId stays null.
  const semesterCache = new Map<number, string>();
  async function getFirstYearSemester(number: number) {
    if (semesterCache.has(number)) return semesterCache.get(number)!;
    let sem = await prisma.semester.findFirst({
      where: { collegeId: sgsits.id, branchId: null, year: 1, number },
    });
    if (!sem) {
      sem = await prisma.semester.create({
        data: { collegeId: sgsits.id, branchId: null, year: 1, number },
      });
    }
    semesterCache.set(number, sem.id);
    return sem.id;
  }

  // Branches exist for Year 2+ (architecture-ready; no content yet).
  const branchDefs = [
    { slug: "cse", name: "Computer Science & Engineering" },
    { slug: "it", name: "Information Technology" },
    { slug: "ei", name: "Electronics & Instrumentation" },
    { slug: "mech", name: "Mechanical Engineering" },
    { slug: "ee", name: "Electrical Engineering" },
    { slug: "civil", name: "Civil Engineering" },
  ];
  for (const b of branchDefs) {
    await prisma.branch.upsert({
      where: { collegeId_slug: { collegeId: sgsits.id, slug: b.slug } },
      update: {},
      create: { name: b.name, slug: b.slug, collegeId: sgsits.id },
    });
  }

  const subjectsByCode = new Map<string, string>();
  async function getOrCreateSubject(code: string) {
    if (subjectsByCode.has(code)) return subjectsByCode.get(code)!;
    const def = SUBJECTS[code];
    const semesterId = await getFirstYearSemester(def.semesterNumber);
    const subject = await prisma.subject.upsert({
      where: { semesterId_code: { semesterId, code: def.code } },
      update: { name: def.name, credits: def.credits },
      create: { name: def.name, code: def.code, credits: def.credits, semesterId },
    });
    subjectsByCode.set(code, subject.id);
    return subject.id;
  }

  // Create every official subject up front (including ones with no uploaded
  // files yet, e.g. Understanding Bharat, Biology) so the full syllabus shows.
  for (const code of Object.keys(SUBJECTS)) {
    await getOrCreateSubject(code);
  }

  const unitCache = new Map<string, string>();
  async function getOrCreateUnit(subjectId: string, subjectCode: string, number: number) {
    const key = `${subjectId}-${number}`;
    if (unitCache.has(key)) return unitCache.get(key)!;
    const title = SUBJECTS[subjectCode].units.find((u) => u.number === number)?.title || `Unit ${number}`;
    const unit = await prisma.unit.upsert({
      where: { subjectId_number: { subjectId, number } },
      update: { title },
      create: { subjectId, number, title },
    });
    unitCache.set(key, unit.id);
    return unit.id;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const category of Object.keys(CATEGORY_DEFAULT_SUBJECT)) {
    const dir = path.join(UPLOADS_DIR, category);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());

    for (const filename of files) {
      const ext = path.extname(filename).toLowerCase();
      const fileType = FILE_TYPE_BY_EXT[ext] ?? (ext.replace(".", "").toUpperCase() || "FILE");
      const stat = fs.statSync(path.join(dir, filename));
      const overrideKey = `${category}/${filename}`;

      let subjectCode = CATEGORY_DEFAULT_SUBJECT[category];
      if (category === "mechanical-workshop" && WORKSHOP_TO_IP10584.has(filename)) subjectCode = "IP10584";
      else if (category === "mathematics" && DATA_SCIENCE_MATH_PATTERN.test(filename)) subjectCode = "MA10509";
      const def = SUBJECTS[subjectCode];
      const subjectId = await getOrCreateSubject(subjectCode);

      let unitId: string | null = null;
      const unitNumber = UNIT_OVERRIDES[overrideKey];
      if (unitNumber) unitId = await getOrCreateUnit(subjectId, subjectCode, unitNumber);

      const title = cleanTitle(category, filename);
      const type = inferResourceType(filename);
      const r2Base = (process.env.R2_PUBLIC_URL || "https://pub-908078c8607c412a993b79b30d15a84e.r2.dev").replace(/\/$/, "");
      const fileUrl = `${r2Base}/${category}/${filename}`;
      const description = `${title} — study material for ${def.name} (First Year, common to all branches).`;

      const existing = await prisma.resource.findFirst({ where: { fileUrl } });
      if (existing) {
        if (existing.title !== title || existing.subjectId !== subjectId || existing.unitId !== unitId) {
          await prisma.resource.update({
            where: { id: existing.id },
            data: { title, description, subjectId, unitId, topicId: null },
          });
          updated++;
        } else {
          skipped++;
        }
        continue;
      }

      await prisma.resource.create({
        data: {
          title,
          description,
          fileUrl,
          fileType,
          fileSize: stat.size,
          tags: [category, type.toLowerCase()].join(","),
          type,
          status: "APPROVED",
          subjectId,
          unitId,
          uploadedById: contributor.id,
          views: Math.floor(Math.random() * 200),
          downloads: Math.floor(Math.random() * 80),
        },
      });
      created++;
    }
  }

  console.log(`Seed complete. Resources created: ${created}, titles updated: ${updated}, unchanged: ${skipped}`);

  // ── Study events (college-wide) ────────────────────────────────────────
  // Real dates from the official SGSITS Academic Calendar — Semester A
  // (July-Dec 2026), UG/PG-I Year column (this site's audience). Replaces
  // the old placeholder sample events entirely on every seed run. Every
  // multi-day window on the official calendar (MSTs, Diwali Break, Prep
  // Leave, End-Sem Exams, Semester Break, AAROHAN, UDBHAV Part-1) gets one
  // entry per day so the whole span is coloured on the Schedule page, not
  // just its first day.
  function studyEventRange(title: string, kind: string, startISO: string, endISO: string) {
    const out: { title: string; date: Date; kind: string }[] = [];
    const start = new Date(startISO);
    const end = new Date(endISO);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      out.push({ title, date: new Date(d), kind });
    }
    return out;
  }

  await prisma.studyEvent.deleteMany({ where: { userId: null } });
  await prisma.studyEvent.createMany({
    data: [
      ...studyEventRange("UDBHAV (Part 1) — Orientation Program", "REMINDER", "2026-08-04", "2026-08-07"),
      { title: "Classes Begin", date: new Date("2026-08-10"), kind: "REMINDER" },
      { title: "UDAAN '26", date: new Date("2026-08-27"), kind: "REMINDER" },
      ...studyEventRange("MST-1", "EXAM", "2026-09-23", "2026-09-25"),
      ...studyEventRange("AAROHAN '26", "REMINDER", "2026-10-09", "2026-10-10"),
      ...studyEventRange("MST-2", "EXAM", "2026-10-27", "2026-10-29"),
      ...studyEventRange("Diwali Break", "REMINDER", "2026-11-05", "2026-11-11"),
      ...studyEventRange("MST-3 (if needed)", "EXAM", "2026-11-17", "2026-11-19"),
      { title: "Classes End", date: new Date("2026-11-19"), kind: "REMINDER" },
      ...studyEventRange("Preparation Leave", "REMINDER", "2026-11-20", "2026-11-29"),
      ...studyEventRange("End-Semester Exams (Theory + Practical)", "EXAM", "2026-11-30", "2026-12-19"),
      ...studyEventRange("SAMARPAN '26", "REMINDER", "2026-12-20", "2026-12-22"),
      ...studyEventRange("Semester Break", "REMINDER", "2026-12-20", "2026-12-27"),
      // Official list of holidays (in each month), from the same calendar.
      // Dates are from the SGSITS calendar (names only); the reason for
      // each is from the MP govt 2026 holiday notification (Indore/Bhopal).
      { title: "Holiday — Milad-un-Nabi", date: new Date("2026-08-26"), kind: "REMINDER" },
      { title: "Holiday — Raksha Bandhan", date: new Date("2026-08-28"), kind: "REMINDER" },
      { title: "Holiday — Janmashtami", date: new Date("2026-09-04"), kind: "REMINDER" },
      { title: "Holiday — Ganesh Chaturthi", date: new Date("2026-09-14"), kind: "REMINDER" },
      { title: "Holiday — Gandhi Jayanti", date: new Date("2026-10-02"), kind: "REMINDER" },
      { title: "Holiday — Dussehra", date: new Date("2026-10-20"), kind: "REMINDER" },
      { title: "Holiday — Maharishi Valmiki Jayanti", date: new Date("2026-10-26"), kind: "REMINDER" },
      { title: "Holiday — Govardhan Puja / Vishwakarma Day", date: new Date("2026-11-09"), kind: "REMINDER" },
      { title: "Holiday — Guru Nanak Jayanti", date: new Date("2026-11-24"), kind: "REMINDER" },
    ],
  });
  console.log("Study events seeded from the official Sem A 2026-27 academic calendar.");

  console.log(`Admin login: admin@collegenoteshub.dev / Admin@123`);
  console.log(`Student login: student@collegenoteshub.dev / Student@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
