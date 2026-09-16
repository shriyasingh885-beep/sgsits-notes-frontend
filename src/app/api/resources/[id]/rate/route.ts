import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sign in to rate" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const stars = Number(body.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  await prisma.rating.upsert({
    where: { userId_resourceId: { userId: session.user.id, resourceId: id } },
    update: { stars, review: body.review ?? null },
    create: { userId: session.user.id, resourceId: id, stars, review: body.review ?? null },
  });

  const ratings = await prisma.rating.findMany({ where: { resourceId: id }, select: { stars: true } });
  return NextResponse.json({ count: ratings.length, average: ratings.reduce((s, r) => s + r.stars, 0) / ratings.length });
}
