/**
 * Canonical taxonomy for the Notes Hub — the single source of truth for
 * document classification. Frontend filters, API validation, the classifier
 * pipeline and the seed script all import from here so the vocabulary can
 * never drift (§13 / §22 of the taxonomy plan).
 *
 * Rule: store the stable `id` in the database, show the `label` in the UI.
 */

// ── Level 1: Academic area ─────────────────────────────────────────────────
export const ACADEMIC_AREAS = {
  mathematics: 'Mathematics',
  physics: 'Physics',
  chemistry: 'Chemistry',
  computing: 'Computing (IT & AI)',
  electrical_electronics: 'Electrical & Electronics',
  mechanical: 'Mechanical & Workshop',
  civil: 'Civil',
  languages: 'Languages & Communication',
  general: 'General / Miscellaneous',
} as const;

export type AcademicAreaId = keyof typeof ACADEMIC_AREAS;

/** Upload-folder / seed-category name -> academic area. */
export const CATEGORY_TO_AREA: Record<string, AcademicAreaId> = {
  mathematics: 'mathematics',
  physics: 'physics',
  chemistry: 'chemistry',
  programming: 'computing',
  electronics: 'electrical_electronics',
  'mechanical-workshop': 'mechanical',
  civil: 'civil',
  languages: 'languages',
  general: 'general',
};

// ── Level 3: Document type ────────────────────────────────────────────────
type DocTypeDef = {
  label: string;
  /** Lower-cased strings that map onto this id — legacy `Resource.type`
   *  values and filename/plain-text aliases. */
  aliases: string[];
};

export const DOCUMENT_TYPES = {
  previous_year_question_paper: {
    label: 'Previous Year Question Paper',
    aliases: ['pyq', 'previous year', 'previous years', 'question paper', 'end semester examination', 'mid semester test', 'endsem', 'mst'],
  },
  question_bank: { label: 'Question Bank', aliases: ['question_bank', 'question bank', 'qb'] },
  important_questions: { label: 'Important Questions', aliases: ['important_questions', 'important questions', 'imp questions'] },
  practice_questions: { label: 'Practice Questions', aliases: ['practice questions', 'practice sheet', 'practice problems'] },
  tutorial_sheet: { label: 'Tutorial Sheet', aliases: ['tutorial', 'tutorial sheet'] },
  assignment: { label: 'Assignment', aliases: ['assignment', 'lab assignment'] },
  class_notes: { label: 'Class Notes', aliases: ['notes', 'class notes', 'lecture notes', 'typed notes'] },
  handwritten_notes: { label: 'Handwritten Notes', aliases: ['handwritten_notes', 'handwritten notes', 'scan', 'camscanner', 'adobe scan', 'docscanner'] },
  slides: { label: 'Lecture Slides', aliases: ['slides', 'ppt', 'pptx', 'presentation'] },
  formula_sheet: { label: 'Formula Sheet', aliases: ['formula sheet', 'formulae', 'all theorems'] },
  cheat_sheet: { label: 'Cheat Sheet', aliases: ['cheat_sheet', 'cheat sheet', 'cheatsheet'] },
  revision_notes: { label: 'Revision Notes', aliases: ['revision', 'revision notes', 'quick revision'] },
  lab_manual: { label: 'Lab Manual', aliases: ['lab_manual', 'lab manual', 'laboratory manual'] },
  lab_record: { label: 'Lab Record / Practical File', aliases: ['practical', 'lab record', 'practical file', 'practicals'] },
  syllabus: { label: 'Syllabus', aliases: ['syllabus', 'course outline', 'scheme'] },
  reference_material: { label: 'Reference Material', aliases: ['reference_material', 'reference material', 'reading material'] },
  book_extract: { label: 'Textbook / Book Extract', aliases: ['book', 'textbook', 'e-books', 'chapter'] },
  solved_paper: { label: 'Solved Paper', aliases: ['solved paper', 'solutions', 'mst1 solutions', 'solved'] },
  answer_key: { label: 'Answer Key', aliases: ['answer key', 'answers', 'key'] },
  misc: { label: 'Miscellaneous', aliases: ['misc', 'miscellaneous', 'general academic'] },
} as const satisfies Record<string, DocTypeDef>;

export type DocumentTypeId = keyof typeof DOCUMENT_TYPES;

/** Legacy `Resource.type` (UPPER_SNAKE) -> canonical documentType id. */
export const LEGACY_TYPE_TO_DOCUMENT_TYPE: Record<string, DocumentTypeId> = {
  NOTES: 'class_notes',
  HANDWRITTEN_NOTES: 'handwritten_notes',
  PYQ: 'previous_year_question_paper',
  QUESTION_BANK: 'question_bank',
  ASSIGNMENT: 'assignment',
  PRACTICAL: 'lab_record',
  LAB_MANUAL: 'lab_manual',
  REFERENCE_MATERIAL: 'reference_material',
  IMPORTANT_QUESTIONS: 'important_questions',
  CHEAT_SHEET: 'cheat_sheet',
  SYLLABUS: 'syllabus',
  SLIDES: 'slides',
};

// ── Level 4: Exam metadata ───────────────────────────────────────────────
export const EXAM_TYPES = {
  MST1: 'Mid-Semester Test 1',
  MST2: 'Mid-Semester Test 2',
  END_SEM: 'End Semester',
  SUPPLEMENTARY: 'Supplementary',
  QUIZ: 'Quiz / Class Test',
  UNKNOWN: 'Unknown',
} as const;

export type ExamTypeId = keyof typeof EXAM_TYPES;

// ── Helpers ──────────────────────────────────────────────────────────────
export function documentTypeLabel(id: string | null | undefined): string {
  if (!id) return 'Unclassified';
  return (DOCUMENT_TYPES as Record<string, DocTypeDef>)[id]?.label ?? id;
}

export function academicAreaLabel(id: string | null | undefined): string {
  if (!id) return 'Unclassified';
  return (ACADEMIC_AREAS as Record<string, string>)[id] ?? id;
}

export function examTypeLabel(id: string | null | undefined): string {
  if (!id) return '';
  return (EXAM_TYPES as Record<string, string>)[id] ?? id;
}

/** Best-effort map of an arbitrary string (legacy type, filename token, or a
 *  phrase found in the document) to a canonical documentType id. Returns null
 *  when nothing matches confidently — callers should then leave it unset. */
export function resolveDocumentType(input: string | null | undefined): DocumentTypeId | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (LEGACY_TYPE_TO_DOCUMENT_TYPE[input.trim().toUpperCase()]) {
    return LEGACY_TYPE_TO_DOCUMENT_TYPE[input.trim().toUpperCase()];
  }
  for (const [id, def] of Object.entries(DOCUMENT_TYPES) as [DocumentTypeId, DocTypeDef][]) {
    if (id === s) return id;
    if (def.aliases.some((a) => s.includes(a))) return id;
  }
  return null;
}

export const CLASSIFICATION_STATUSES = ['UNCLASSIFIED', 'AUTO_CLASSIFIED', 'REVIEW_REQUIRED', 'VERIFIED'] as const;
export type ClassificationStatus = (typeof CLASSIFICATION_STATUSES)[number];

/** Options ready for a <select>. */
export const documentTypeOptions = () =>
  (Object.entries(DOCUMENT_TYPES) as [DocumentTypeId, DocTypeDef][]).map(([value, def]) => ({
    value,
    label: def.label,
  }));

export const academicAreaOptions = () =>
  (Object.entries(ACADEMIC_AREAS) as [AcademicAreaId, string][]).map(([value, label]) => ({ value, label }));
