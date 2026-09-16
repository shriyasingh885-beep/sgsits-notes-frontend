import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// A real, honest "active now" count — no accounts, no personal data, just a
// random per-browser id (kept in localStorage) that pings here every ~25s.
// "Active" = a heartbeat within the last 2 minutes. Stale rows are pruned on
// every write so the table never grows unbounded.
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json().catch(() => ({ sessionId: null }));
  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 100) {
    return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  await prisma.presence.upsert({
    where: { sessionId },
    update: { lastSeen: new Date() },
    create: { sessionId },
  });

  // Prune anything stale so the table stays small (cheap, runs on every ping).
  await prisma.presence.deleteMany({
    where: { lastSeen: { lt: new Date(Date.now() - ACTIVE_WINDOW_MS) } },
  });

  const count = await prisma.presence.count();
  return NextResponse.json({ count });
}

export async function GET() {
  const count = await prisma.presence.count({
    where: { lastSeen: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } },
  });
  return NextResponse.json({ count });
}
