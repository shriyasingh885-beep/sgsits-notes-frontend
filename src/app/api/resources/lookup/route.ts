import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Resolve a list of resource ids to the fields the note list needs.
 *
 * Bookmarks live in the visitor's browser (lib/use-bookmarks), so the saved
 * page knows ids but not titles — this is how it fills them in. Public by
 * design: it returns only approved resources and only the same metadata
 * already shown on /notes, so it exposes nothing the listing pages don't.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ids') ?? '';
  const ids = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 200);

  if (ids.length === 0) return NextResponse.json({ resources: [] });

  const resources = await prisma.resource.findMany({
    where: { id: { in: ids }, status: 'APPROVED' },
    select: {
      id: true,
      title: true,
      type: true,
      fileType: true,
      views: true,
      createdAt: true,
      updatedAt: true,
      documentType: true,
      subject: { select: { id: true, name: true, code: true } },
      uploadedBy: { select: { name: true } },
    },
  });

  // Preserve the caller's order (most recently saved first) — findMany does
  // not guarantee the order of an `in` filter.
  const byId = new Map(resources.map((r) => [r.id, r]));
  return NextResponse.json({
    resources: ids.map((id) => byId.get(id)).filter(Boolean),
  });
}
