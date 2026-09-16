'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError('Incorrect email or password.');
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card elevated className="w-full max-w-md p-8">
        <img src="/sgsits-logo.webp" alt="SGSITS crest" className="mb-5 h-11 w-11 rounded-full object-cover shadow-sm" />
        <h1 className="mb-1 text-page font-heading tracking-[-0.01em] text-ink">Welcome back</h1>
        <p className="mb-7 text-body-lg text-secondary">Sign in to your SGSITS NotesVault account.</p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-input border border-[color:var(--danger)] bg-[color:var(--tint-terracotta)] px-3 py-2.5 text-body text-[color:var(--danger)]">
            <AlertCircle size={15} className="shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoComplete="email"
            className="w-full h-11 px-3.5 rounded-input border border-border bg-surface text-body outline-none focus:ring-2 focus:ring-sage-500"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            className="w-full h-11 px-3.5 rounded-input border border-border bg-surface text-body outline-none focus:ring-2 focus:ring-sage-500"
            required
          />
          <Button variant="primary" size="lg" className="w-full justify-center" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-meta text-secondary">
          Browsing SGSITS NotesVault doesn&rsquo;t need an account —{' '}
          <Link href="/" className="font-semibold text-sage-600 hover:underline">
            go to the notes
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
