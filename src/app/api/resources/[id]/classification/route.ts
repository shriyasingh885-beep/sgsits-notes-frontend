import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

/**
 * PATCH /api/resources/[id]/classification — the review queue's write path.
 *
 * Every change is appended to ClassificationLog with a before/after snapshot,
 * same as the automated migration, so a human decision is as auditable and
 * reversible as a machine one.
 */
const bodySchema = z.object({
  action: z.enum(["VERIFY", "UNCLASSIFY", "EDIT"]),
  subjectId: z.string().optional().nullable(),
  documentType: z.string().optional().nullable(),
  academicYear: z.coerce.number().int().min(1900).max(2100).optional().nullable(),
  examType: z.string().optional().nullable(),
  title: z.string().min(1).max(300).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const actor = guard.session.user.email ?? guard.session.user.id ?? "admin";

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { action, ...fields } = parsed.data;

  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const before = {
    title: existing.title,
    subjectId: existing.subjectId,
    documentType: existing.documentType,
    academicYear: existing.academicYear,
    examType: existing.examType,
    classificationStatus: existing.classificationStatus,
    needsReview: existing.needsReview,
  };

  const data: Record<string, unknown> = {};
  if (fields.title !== undefined) data.title = fields.title;
  if (fields.subjectId) data.subjectId = fields.subjectId;
  if (fields.documentType !== undefined) data.documentType = fields.documentType;
  if (fields.academicYear !== undefined) data.academicYear = fields.academicYear;
  if (fields.examType !== undefined) data.examType = fields.examType;

  if (action === "UNCLASSIFY") {
    data.classificationStatus = "UNCLASSIFIED";
    data.needsReview = false;
    data.classificationReason = "left unclassified by reviewer";
  } else {
    // VERIFY and EDIT both end in a human-confirmed record.
    data.classificationStatus = "VERIFIED";
    data.needsReview = false;
    data.classificationReason = action === "EDIT" ? "corrected by reviewer" : "confirmed by reviewer";
  }

  const updated = await prisma.resource.update({ where: { id }, data });

  await prisma.classificationLog.create({
    data: {
      resourceId: id,
      action: action === "UNCLASSIFY" ? "REVIEW_KEEP_UNCLASSIFIED" : action === "EDIT" ? "REVIEW_EDIT" : "REVIEW_APPROVE",
      actor,
      before: JSON.stringify(before),
      after: JSON.stringify({
        title: updated.title,
        subjectId: updated.subjectId,
        documentType: updated.documentType,
        academicYear: updated.academicYear,
        examType: updated.examType,
        classificationStatus: updated.classificationStatus,
        needsReview: updated.needsReview,
      }),
      reason: data.classificationReason as string,
    },
  });

  return NextResponse.json({ ok: true, id: updated.id, status: updated.classificationStatus });
}
