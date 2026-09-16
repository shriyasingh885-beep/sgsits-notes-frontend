import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guards";
import { deleteUploadedFile } from "@/lib/upload";

/**
 * DELETE /api/resources/[id] — remove one of your own uploads (admins may
 * remove any). Also drops the dependent bookmark/rating/report rows and the
 * underlying Blob object.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireUser();
  if (guard.error) return guard.error;
  const user = guard.session.user as { id: string; role?: string };

  const { id } = await params;
  const resource = await prisma.resource.findUnique({ where: { id } });
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = resource.uploadedById === user.id;
  const isAdmin = user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "You can only delete your own uploads" }, { status: 403 });
  }

  await prisma.bookmark.deleteMany({ where: { resourceId: id } });
  await prisma.rating.deleteMany({ where: { resourceId: id } });
  await prisma.report.deleteMany({ where: { resourceId: id } });
  await prisma.classificationLog.deleteMany({ where: { resourceId: id } });
  await prisma.resource.delete({ where: { id } });

  await deleteUploadedFile(resource.fileUrl);

  return NextResponse.json({ ok: true });
}
