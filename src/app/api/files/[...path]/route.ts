import { NextRequest, NextResponse } from "next/server";

const R2_BASE = (process.env.R2_PUBLIC_URL || "https://pub-908078c8607c412a993b79b30d15a84e.r2.dev").replace(/\/$/, "");

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  if (segments.some((s) => s.includes("..") || s.includes("\\"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const r2Path = segments.join("/");
  // Direct 302 redirect to Cloudflare R2 edge CDN: 0 bytes transferred through Vercel
  return NextResponse.redirect(`${R2_BASE}/${r2Path}`, 302);
}
