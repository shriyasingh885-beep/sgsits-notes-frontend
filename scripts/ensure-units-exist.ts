// Ensures every official syllabus unit (from prisma/seed.ts's SUBJECTS map)
// actually exists as a Unit row — several subjects were missing some units
// entirely because Unit rows were only ever lazily created by the upload
// API (unit.upsert on first use), never pre-seeded. That silently made
// certain units impossible to ever assign a resource to. Idempotent
// (upsert), safe to re-run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUBJECT_UNITS: Record<string, string[]> = {
  MA10021: ["Evolution of Indian Mathematics & Differential Calculus", "Integral Calculus", "Matrices", "Ordinary Differential Equations", "Fuzzy Sets"],
  IT10007: ["Overview of Information Technology", "C Fundamentals — Flowcharts to Decisions", "Loops, Functions, Arrays & Pointers", "Databases & SQL", "Artificial Intelligence"],
  ME10008: ["Engineering Materials & Properties", "Mechanisms & Machines", "Fluid Kinematics", "IC Engines & Automobiles", "Engineering Graphics"],
  PH10009: ["Lasers", "Fibre Optics", "Special Theory of Relativity", "Quantum Theory", "Quantum Computation"],
  CH10010: ["Water Technology", "Lubricants, Fuels & Combustion"],
  MA10509: ["Statistics & Probability Theory", "Random Variables", "Descriptive & Inferential Statistics", "Correlation & Regression", "Data Science Tools & Case Studies"],
  EE10510: ["DC Circuit Analysis", "AC Circuits & 3-Phase Systems", "Magnetic Circuits & Electrical Machines", "Semiconductor Devices", "Digital Electronics"],
  HU10512: ["Communication Skills", "Project Writing", "Speaking Skills & Presentation Strategies"],
  CE10513: ["Forces & Equilibrium", "Centre of Gravity & Moment of Inertia", "Beams — Reactions, SFD & BMD", "Introduction to Civil Engineering", "Geomatics & Plane Surveying"],
  PY10514: ["Introduction to Biology", "Genetics & Molecular Biology", "Microbiology & Industrial Applications", "Human Physiology & Biomedical Applications", "Biomimicry, Systems & Synthetic Biology"],
  IP10584: ["Design Thinking & Innovation", "Ideation & Prototyping", "Woodworking & Foundry", "Forging & Welding", "Machining & Fitting Practice"],
};

async function main() {
  let created = 0;
  for (const [code, titles] of Object.entries(SUBJECT_UNITS)) {
    const subject = await prisma.subject.findFirst({ where: { code } });
    if (!subject) {
      console.log(`SKIP (subject not found): ${code}`);
      continue;
    }
    for (let i = 0; i < titles.length; i++) {
      const number = i + 1;
      const existing = await prisma.unit.findUnique({ where: { subjectId_number: { subjectId: subject.id, number } } });
      if (existing) continue;
      await prisma.unit.create({ data: { subjectId: subject.id, number, title: titles[i] } });
      console.log(`CREATED [${code}] Unit ${number}: ${titles[i]}`);
      created++;
    }
  }
  console.log(`\nCreated ${created} missing unit rows.`);
  await prisma.$disconnect();
}

main();
