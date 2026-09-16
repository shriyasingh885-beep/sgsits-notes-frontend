'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: string; message: string; tone: ToastTone };
type ToastCtx = { toast: (message: string, tone?: ToastTone) => void };

const Ctx = createContext<ToastCtx>({ toast: () => {} });

export function useToast() {
  return useContext(Ctx);
}

const ICON = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONE_CLS = {
  success: 'bg-[var(--tint-sage)] text-[var(--tint-sage-ink)] border-sage-200',
  error: 'bg-[var(--tint-terracotta)] text-[var(--tint-terracotta-ink)] border-[var(--border)]',
  info: 'bg-surface text-ink border-border',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(({ id, message, tone }) => {
          const Icon = ICON[tone];
          return (
            <div
              key={id}
              className={cn(
                'fade-in flex items-center gap-2.5 rounded-panel border px-4 py-3 shadow-pop text-body-lg max-w-sm pointer-events-auto',
                TONE_CLS[tone]
              )}
            >
              <Icon size={16} strokeWidth={1.8} className="shrink-0" />
              <span className="flex-1">{message}</span>
              <button
                onClick={() => setToasts((p) => p.filter((t) => t.id !== id))}
                aria-label="Dismiss"
                className="p-0.5 rounded hover:bg-black/5 transition"
              >
                <X size={14} strokeWidth={1.8} className="opacity-60 hover:opacity-100" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
