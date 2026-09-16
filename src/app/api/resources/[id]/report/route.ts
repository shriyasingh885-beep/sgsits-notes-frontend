import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in to report" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (!body.reason) return NextResponse.json({ error: "Reason is required" }, { status: 400 });

  await prisma.report.create({
    data: {
      resourceId: id,
      userId: session.user.id,
      reason: body.reason,
      details: body.details ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
