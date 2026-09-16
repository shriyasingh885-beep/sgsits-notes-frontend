import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  const { status } = await req.json();
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const resource = await prisma.resource.update({ where: { id }, data: { status } });
  return NextResponse.json(resource);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  await prisma.bookmark.deleteMany({ where: { resourceId: id } });
  await prisma.rating.deleteMany({ where: { resourceId: id } });
  await prisma.report.deleteMany({ where: { resourceId: id } });
  await prisma.resource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
