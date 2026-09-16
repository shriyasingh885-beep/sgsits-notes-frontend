"""
Shared PDF / PPTX / DOCX content extraction for the classification overhaul.

Text is the source of truth for classification (see the taxonomy prompt), so
this module tries, in order:
  1. embedded PDF text via `pdftotext`
  2. OCR of rendered pages via RapidOCR (for scanned / handwritten PDFs)
  3. slide / document text for .pptx / .docx

Nothing here writes to the database. It only reads files and returns text.
"""

from __future__ import annotations

import hashlib
import os
import subprocess
from dataclasses import dataclass, field

# Lazily-initialised OCR engine — construction loads ONNX models (~0.6s) and we
# only want to pay that once per process, and only if a scan actually needs it.
_OCR = None


def _get_ocr():
    global _OCR
    if _OCR is None:
        from rapidocr_onnxruntime import RapidOCR

        _OCR = RapidOCR()
    return _OCR


# A PDF page yielding fewer than this many characters of embedded text is
# treated as a scan and sent to OCR instead.
MIN_EMBEDDED_CHARS = 250
# Pages to sample for OCR on long documents. For Phase A we only need enough
# text to identify subject + document type, so we stay cheap: cover, an early
# page, a middle page, and the last page.
MAX_OCR_PAGES = 4
OCR_DPI = 144
# Never hand OCR an image wider than this (px) — downscale instead. Keeps
# 30 MB+ phone-camera scans from blowing up render time / memory.
OCR_MAX_WIDTH = 1600


@dataclass
class Extraction:
    file_hash: str | None = None
    page_count: int | None = None
    text: str = ""
    source: str = "none"  # pdftext | ocr | pdftext+ocr | pptx | docx | unsupported | missing | remote
    ocr_pages: list[int] = field(default_factory=list)
    error: str | None = None

    @property
    def chars(self) -> int:
        return len(self.text)


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _pdftotext(path: str, last_page: int | None = None) -> str:
    cmd = ["pdftotext", "-q"]
    if last_page:
        cmd += ["-l", str(last_page)]
    cmd += [path, "-"]
    try:
        out = subprocess.run(cmd, capture_output=True, timeout=120).stdout
        return out.decode("utf-8", "ignore")
    except Exception:
        return ""


def _sample_pages(n: int) -> list[int]:
    if n <= MAX_OCR_PAGES:
        return list(range(n))
    picks = {0, n - 1}
    # even spread across the interior
    step = (n - 1) / (MAX_OCR_PAGES - 1)
    for i in range(1, MAX_OCR_PAGES - 1):
        picks.add(round(i * step))
    return sorted(picks)


def _render_png(page, dpi: int = OCR_DPI) -> bytes:
    import pymupdf

    pix = page.get_pixmap(dpi=dpi)
    if pix.width > OCR_MAX_WIDTH:
        scale = OCR_MAX_WIDTH / pix.width
        pix = page.get_pixmap(matrix=pymupdf.Matrix(dpi / 72 * scale, dpi / 72 * scale))
    return pix.tobytes("png")


def _ocr_pdf(path: str, pages: list[int]) -> str:
    import pymupdf

    ocr = _get_ocr()
    doc = pymupdf.open(path)
    chunks: list[str] = []
    for pno in pages:
        if pno >= doc.page_count:
            continue
        res, _ = ocr(_render_png(doc[pno]))
        if res:
            chunks.append(f"[page {pno + 1}]\n" + "\n".join(line[1] for line in res))
    doc.close()
    return "\n\n".join(chunks)


def extract_pdf(path: str) -> Extraction:
    import pymupdf

    ex = Extraction(file_hash=sha256_file(path))
    try:
        doc = pymupdf.open(path)
        ex.page_count = doc.page_count
        doc.close()
    except Exception as e:
        ex.error = f"pymupdf open: {e}"

    embedded = _pdftotext(path, last_page=10).strip()
    if len(embedded) >= MIN_EMBEDDED_CHARS:
        # Grab the whole document's embedded text (bounded later by the caller).
        full = _pdftotext(path).strip()
        ex.text = full or embedded
        ex.source = "pdftext"
        return ex

    # Scanned / image-only — OCR sampled pages.
    n = ex.page_count or 1
    pages = _sample_pages(n)
    try:
        ocr_text = _ocr_pdf(path, pages)
    except Exception as e:
        ex.error = f"ocr: {e}"
        ocr_text = ""
    ex.ocr_pages = [p + 1 for p in pages]
    if embedded and ocr_text:
        ex.text = embedded + "\n\n" + ocr_text
        ex.source = "pdftext+ocr"
    elif ocr_text:
        ex.text = ocr_text
        ex.source = "ocr"
    else:
        ex.text = embedded
        ex.source = "pdftext" if embedded else "none"
    return ex


def extract_pptx(path: str) -> Extraction:
    from pptx import Presentation

    ex = Extraction(file_hash=sha256_file(path), source="pptx")
    try:
        prs = Presentation(path)
        ex.page_count = len(prs.slides)
        parts: list[str] = []
        for slide in prs.slides:
            for shape in slide.shapes:
                if shape.has_text_frame and shape.text_frame.text.strip():
                    parts.append(shape.text_frame.text)
        ex.text = "\n".join(parts)
    except Exception as e:
        ex.error = str(e)
    return ex


def extract_docx(path: str) -> Extraction:
    import docx

    ex = Extraction(file_hash=sha256_file(path), source="docx")
    try:
        d = docx.Document(path)
        parts = [p.text for p in d.paragraphs if p.text.strip()]
        for table in d.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    parts.append(" | ".join(cells))
        ex.text = "\n".join(parts)
    except Exception as e:
        ex.error = str(e)
    return ex


def extract_any(path: str) -> Extraction:
    if not os.path.exists(path):
        return Extraction(source="missing", error="file not found")
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        return extract_pdf(path)
    if ext == ".pptx":
        return extract_pptx(path)
    if ext == ".docx":
        return extract_docx(path)
    # .ppt (legacy binary) and anything else — hash only.
    try:
        return Extraction(file_hash=sha256_file(path), source="unsupported")
    except Exception as e:
        return Extraction(source="unsupported", error=str(e))
