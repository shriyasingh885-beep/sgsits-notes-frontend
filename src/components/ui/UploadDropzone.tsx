'use client';
import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/cn';

export function UploadDropzone({
  file,
  onChange,
  accept = '.pdf,.docx,.pptx,.png,.jpg,.jpeg',
  className,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.files?.[0] ?? null);
  };

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        'flex w-full flex-col items-center gap-3 rounded-card border-2 border-dashed bg-sage-50 px-6 py-10 text-center transition duration-calm ease-calm',
        dragging ? 'border-sage-500 bg-sage-100' : 'border-sage-200 hover:border-sage-400 hover:bg-sage-100',
        className
      )}
      aria-label="Click or drag a file to upload"
    >
      <UploadCloud size={28} strokeWidth={1.6} className="text-sage-500" />
      <span className="text-body-lg font-semibold text-sage-800">
        {file ? file.name : 'Click to choose or drag a file here'}
      </span>
      <span className="text-meta text-muted">PDF, DOCX, PPTX, images up to 15 MB</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onFileChange}
      />
    </button>
  );
}

export default UploadDropzone;

