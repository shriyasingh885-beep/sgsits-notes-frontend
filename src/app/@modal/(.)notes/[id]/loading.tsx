import { Loader2 } from 'lucide-react';

export default function ModalLoading() {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center">
      {/* Dimmed hub behind, matches the actual ReaderOverlay backdrop */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-hidden />
      
      {/* Loading Spinner */}
      <Loader2 className="relative z-10 h-8 w-8 animate-spin text-white opacity-70" />
    </div>
  );
}
