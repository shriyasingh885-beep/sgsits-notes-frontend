import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';

/**
 * Route-handler guards. Every mutating API route must call one of these —
 * they were missing entirely on /api/admin/*, which left resource deletion
 * and moderation open to anonymous callers.
 */

export type GuardResult = { session: Session; error?: never } | { session?: never; error: NextResponse };

export async function requireUser(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  }
  return { session };
}

export async function requireAdmin(): Promise<GuardResult> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  }
  if ((session.user as { role?: string }).role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Admins only' }, { status: 403 }) };
  }
  return { session };
}
