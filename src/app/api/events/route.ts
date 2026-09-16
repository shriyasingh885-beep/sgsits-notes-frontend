import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/events — create a personal reminder for the signed-in user. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, date, kind, subjectId } = await req.json();
  if (!title || !date || !kind) {
    return NextResponse.json({ error: "title, date and kind are required" }, { status: 400 });
  }

  const event = await prisma.studyEvent.create({
    data: {
      title,
      date: new Date(date),
      kind,
      subjectId: subjectId || null,
      userId: session.user.id, // always from session, never from body
    },
  });

  return NextResponse.json(event, { status: 201 });
}

/** DELETE /api/events?id=xxx — delete own reminder only. */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const event = await prisma.studyEvent.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (event.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.studyEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
