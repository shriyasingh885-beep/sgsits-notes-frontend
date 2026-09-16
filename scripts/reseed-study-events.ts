// Reseeds only the college-wide StudyEvent rows (userId: null) with the
// corrected data from prisma/seed.ts — every multi-day window on the
// official calendar (MSTs, Diwali Break, Prep Leave, End-Sem Exams,
// Semester Break, AAROHAN, UDBHAV Part-1) now gets one entry per day so the
// whole span is coloured on the Schedule, not just its first day.
// Idempotent: deletes all userId:null events first, matching seed.ts's own
// pattern, so this is safe to re-run.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function range(title: string, kind: string, startISO: string, endISO: string) {
  const out: { title: string; date: Date; kind: string }[] = [];
  const start = new Date(startISO);
  const end = new Date(endISO);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push({ title, date: new Date(d), kind });
  }
  return out;
}

async function main() {
  await prisma.studyEvent.deleteMany({ where: { userId: null } });

  const data = [
    ...range("UDBHAV (Part 1) — Orientation Program", "REMINDER", "2026-08-04", "2026-08-07"),
    { title: "Classes Begin", date: new Date("2026-08-10"), kind: "REMINDER" },
    { title: "UDAAN '26", date: new Date("2026-08-27"), kind: "REMINDER" },
    ...range("MST-1", "EXAM", "2026-09-23", "2026-09-25"),
    ...range("AAROHAN '26", "REMINDER", "2026-10-09", "2026-10-10"),
    ...range("MST-2", "EXAM", "2026-10-27", "2026-10-29"),
    ...range("Diwali Break", "REMINDER", "2026-11-05", "2026-11-11"),
    ...range("MST-3 (if needed)", "EXAM", "2026-11-17", "2026-11-19"),
    { title: "Classes End", date: new Date("2026-11-19"), kind: "REMINDER" },
    ...range("Preparation Leave", "REMINDER", "2026-11-20", "2026-11-29"),
    ...range("End-Semester Exams (Theory + Practical)", "EXAM", "2026-11-30", "2026-12-19"),
    ...range("SAMARPAN '26", "REMINDER", "2026-12-20", "2026-12-22"),
    ...range("Semester Break", "REMINDER", "2026-12-20", "2026-12-27"),
    // Official list of holidays (dates only, no reason) is from the SGSITS
    // calendar; the reason for each is from the MP govt 2026 holiday
    // notification for Indore/Bhopal (the source PDF names dates only).
    { title: "Holiday — Milad-un-Nabi", date: new Date("2026-08-26"), kind: "REMINDER" },
    { title: "Holiday — Raksha Bandhan", date: new Date("2026-08-28"), kind: "REMINDER" },
    { title: "Holiday — Janmashtami", date: new Date("2026-09-04"), kind: "REMINDER" },
    { title: "Holiday — Ganesh Chaturthi", date: new Date("2026-09-14"), kind: "REMINDER" },
    { title: "Holiday — Gandhi Jayanti", date: new Date("2026-10-02"), kind: "REMINDER" },
    { title: "Holiday — Dussehra", date: new Date("2026-10-20"), kind: "REMINDER" },
    { title: "Holiday — Maharishi Valmiki Jayanti", date: new Date("2026-10-26"), kind: "REMINDER" },
    { title: "Holiday — Govardhan Puja / Vishwakarma Day", date: new Date("2026-11-09"), kind: "REMINDER" },
    { title: "Holiday — Guru Nanak Jayanti", date: new Date("2026-11-24"), kind: "REMINDER" },
  ];

  await prisma.studyEvent.createMany({ data });
  const count = await prisma.studyEvent.count({ where: { userId: null } });
  console.log(`Reseeded. College-wide study events now: ${count}`);
  await prisma.$disconnect();
}

main();
