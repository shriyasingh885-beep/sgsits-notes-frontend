'use client';

// One place to configure react-pdf / pdf.js. The worker is copied from
// node_modules/pdfjs-dist/build/ into /public at that exact version — keep the
// two in sync when bumping the dependency.

import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Keep it self-contained — no external cmap/font CDN. Latin PDFs (the whole
// collection) render fine; if a CJK doc ever needs cmaps, copy them from
// node_modules/pdfjs-dist/cmaps into /public and point cMapUrl there.
export const PDF_OPTIONS = {} as const;

export { pdfjs };
