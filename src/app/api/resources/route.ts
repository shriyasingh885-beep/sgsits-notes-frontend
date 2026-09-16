import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadedFile, UploadValidationError, hashFile } from "@/lib/upload";

// SGSITS NotesVault has no accounts for browsing or uploading — this is the
// system account real anonymous submissions attach to (the FK still needs a
// real User row); the person's actual name comes from the uploaderName
// field below and is stored in tags for attribution instead.
const ANONYMOUS_UPLOADER_EMAIL = "contributor@collegenoteshub.dev";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const title = form.get("title") as string | null;
  const description = (form.get("description") as string | null) ?? "";
  const subjectId = form.get("subjectId") as string | null;
  const unitNumber = form.get("unitNumber") as string | null;
  const type = form.get("type") as string | null;
  const uploaderName = ((form.get("uploaderName") as string | null) ?? "").trim();
  const tags = uploaderName ? `uploader:${uploaderName}` : ((form.get("tags") as string | null) ?? "");
  const academicYearRaw = form.get("academicYear") as string | null;

  if (!file || !title || !subjectId || !type) {
    return NextResponse.json({ error: "File, title, subject and resource type are required." }, { status: 400 });
  }

  const session = await auth();
  const uploadedById = session?.user?.id
    ?? (await prisma.user.findUnique({ where: { email: ANONYMOUS_UPLOADER_EMAIL } }))?.id;
  if (!uploadedById) {
    return NextResponse.json({ error: "Upload is temporarily unavailable — try again shortly." }, { status: 500 });
  }

  // A PYQ with no year attached is useless for "search by year" — required
  // for the exam-paper types, optional (but accepted) for everything else.
  const PYQ_LIKE_TYPES = new Set(["PYQ", "QUESTION_BANK", "IMPORTANT_QUESTIONS"]);
  let academicYear: number | null = null;
  if (academicYearRaw) {
    const n = parseInt(academicYearRaw, 10);
    if (!Number.isNaN(n) && n >= 1990 && n <= new Date().getFullYear() + 1) academicYear = n;
  }
  if (PYQ_LIKE_TYPES.has(type) && !academicYear) {
    return NextResponse.json(
      { error: "Exam year is required for a previous year question paper / question bank." },
      { status: 400 },
    );
  }

  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  // Same file (byte-for-byte), same subject, already here — tell the
  // uploader instead of silently doubling the library.
  const fileHash = await hashFile(file);
  const duplicate = await prisma.resource.findFirst({
    where: { subjectId, fileHash },
    select: { id: true, title: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: `This file is already on the site as "${duplicate.title}". No need to upload it again.`, duplicateId: duplicate.id },
      { status: 409 },
    );
  }

  let saved;
  try {
    saved = await saveUploadedFile(file, subject.code.toLowerCase());
  } catch (err) {
    if (err instanceof UploadValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  let unitId: string | null = null;
  if (unitNumber) {
    const num = parseInt(unitNumber, 10);
    if (num > 0) {
      const unit = await prisma.unit.upsert({
        where: { subjectId_number: { subjectId, number: num } },
        update: {},
        create: { subjectId, number: num, title: `Unit ${num}` },
      });
      unitId = unit.id;
    }
  }

  const resource = await prisma.resource.create({
    data: {
      title,
      description,
      fileUrl: saved.fileUrl,
      fileType: saved.fileType,
      fileSize: saved.fileSize,
      fileHash,
      tags,
      type,
      academicYear,
      status: "APPROVED",
      subjectId,
      unitId,
      uploadedById,
    },
  });

  return NextResponse.json({ id: resource.id, status: resource.status });
}
