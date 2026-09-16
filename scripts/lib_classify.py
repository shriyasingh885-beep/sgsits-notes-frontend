"""
Classification engine (PHASE 4 / 8 of the taxonomy plan).

Pure functions: given a document's filename, upload folder and extracted text,
produce a structured, *confidence-scored* classification. Never forces a guess
- low confidence returns needs_review=True with a reason (PHASE 5).

No DB or filesystem access here. `classify_dry_run.py` wires this to the data.
"""

from __future__ import annotations

import os
import re
import unicodedata
from dataclasses import dataclass, field, asdict

# ── Canonical vocab (mirror of src/lib/taxonomy.ts — keep in sync) ─────────
CATEGORY_TO_AREA = {
    "mathematics": "mathematics",
    "physics": "physics",
    "chemistry": "chemistry",
    "programming": "computing",
    "electronics": "electrical_electronics",
    "mechanical-workshop": "mechanical",
    "civil": "civil",
    "languages": "languages",
    "general": "general",
}

# code prefix -> academic area (fallback when folder is "general")
CODE_PREFIX_TO_AREA = {
    "MA": "mathematics", "PH": "physics", "CH": "chemistry", "IT": "computing",
    "CO": "computing", "CS": "computing", "EE": "electrical_electronics",
    "EC": "electrical_electronics", "ME": "mechanical", "IP": "mechanical",
    "CE": "civil", "HU": "languages", "PY": "general",
}

DOC_TYPE_FILENAME_ALIASES = {
    "previous_year_question_paper": ["pyq", "previous-year", "previous-years", "endsem", "end-sem", "question-paper", "mst", "paper", "sample-paper", "model-paper"],
    "question_bank": ["question-bank", "qbank", "-qb", "questionbank"],
    "important_questions": ["important-question", "imp-question"],
    "practice_questions": ["practice-question", "practice-sheet", "practice-problems", "example-question"],
    "tutorial_sheet": ["tutorial"],
    "assignment": ["assignment", "lab-assignment"],
    "handwritten_notes": ["scan", "camscanner", "adobe-scan", "docscanner", "img_", "handwritten", "unlabeled"],
    "slides": ["slides", "ppt", "-slide"],
    "formula_sheet": ["formula", "all-theorems", "theorem"],
    "cheat_sheet": ["cheat-sheet", "cheatsheet"],
    "revision_notes": ["revision"],
    "lab_manual": ["lab-manual", "labmanual", "laboratory-manual", "manual"],
    "lab_record": ["practical", "lab-record", "practical-file"],
    "syllabus": ["syllabus", "scheme", "course-outline"],
    "reference_material": ["reference", "reading-material"],
    "book_extract": ["book", "e-books", "ebook", "chapter-"],
    "solved_paper": ["solved", "solution", "solutions"],
    "class_notes": ["notes", "note"],
}

# Regexes over the (lower-cased) document text.
RE_COURSE_CODE = re.compile(r"\b([a-z]{2}\s?-?\s?\d{5})\b")
RE_YEAR = re.compile(r"\b(20[0-2]\d)\b")
RE_UNIT = re.compile(r"\bunit\s*[-–]?\s*([1-9])\b")
RE_MST = re.compile(r"\bm\.?s\.?t\.?\s*[-–]?\s*([12])\b|\bmid[-\s]?sem(?:ester)?\s*test\s*[-–]?\s*([12])?")

EXAM_PHRASES = [
    "end semester examination", "end-semester examination", "end sem exam",
    "mid semester test", "mid-semester test", "supplementary examination",
    "maximum marks", "max. marks", "max marks", "time allowed", "duration :",
    "duration:", "attempt any", "answer any", "attempt all", "all questions are compulsory",
    "instructions to candidates", "enrollment no", "enrolment no", "roll no.",
    "b.tech", "b. tech", "first year examination", "grade point",
]
SLIDE_PHRASES = ["slideshare", "click to edit master", "presented by", "outline of the presentation"]
LABMANUAL_PHRASES = ["list of experiments", "experiment no", "aim :", "aim:", "apparatus required", "viva questions", "laboratory manual"]
SYLLABUS_PHRASES = ["course objectives", "course outcomes", "list of topics", "credits l", "l-t-p", "reference books", "text books", "unit i ", "unit-i "]
ASSIGNMENT_PHRASES = ["assignment no", "assignment -", "submit by", "date of submission", "q1.", "q.1"]

STOPWORDS = set(
    "the a an of and or to in for on with is are be by from as at into fundamentals fundamental "
    "introduction overview basic basics engineering engineer first year semester notes unit topic "
    "understanding applied general".split()
)


def strip_ocr_noise(text: str) -> str:
    """OCR of messy handwriting sometimes emits CJK / symbol runs. Drop
    non-latin letters so keyword matching isn't polluted."""
    out = []
    for ch in text:
        if ch.isascii() or ch.isspace() or ch in "–—’‘“”°±×÷":
            out.append(ch)
        elif unicodedata.category(ch).startswith(("P", "N", "Z")):
            out.append(ch)
        # else: drop (CJK, Devanagari runs from bad OCR, etc.)
    return "".join(out)


def kebab(s: str) -> str:
    s = strip_ocr_noise(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return re.sub(r"-{2,}", "-", s)


@dataclass
class Subject:
    id: str
    name: str
    code: str
    year: int
    num: int
    units: list[str] = field(default_factory=list)

    @property
    def area(self) -> str:
        return CODE_PREFIX_TO_AREA.get(self.code[:2].upper(), "general")

    def keywords(self) -> set[str]:
        bag: set[str] = set()
        for src in [self.name, *self.units]:
            for w in re.findall(r"[a-z]{3,}", src.lower()):
                if w not in STOPWORDS:
                    bag.add(w)
        return bag


@dataclass
class Proposal:
    resource_id: str
    file_url: str
    original_filename: str
    text_source: str
    text_chars: int

    current_title: str
    current_type: str
    current_subject_code: str

    academic_area: str | None = None
    subject_id: str | None = None
    subject_code: str | None = None
    document_type: str | None = None
    exam_type: str | None = None
    academic_year: int | None = None
    unit: int | None = None
    course_code: str | None = None
    topics: list[str] = field(default_factory=list)

    suggested_title: str | None = None
    suggested_filename: str | None = None

    subject_confidence: float = 0.0
    doctype_confidence: float = 0.0
    confidence: float = 0.0
    status: str = "REVIEW_REQUIRED"
    needs_review: bool = True
    reason: str = ""
    signals: list[str] = field(default_factory=list)

    possible_duplicate: bool = False
    duplicate_of: str | None = None

    def to_dict(self):
        return asdict(self)


def _match_course_codes(text: str, filename: str, subjects: list[Subject]) -> list[Subject]:
    codes = set()
    for m in RE_COURSE_CODE.finditer(text):
        codes.add(re.sub(r"[\s-]", "", m.group(1)).upper())
    for m in re.finditer(r"([a-z]{2}\d{5})", filename.lower()):
        codes.add(m.group(1).upper())
    return [s for s in subjects if s.code.upper() in codes]


def _subject_keyword_ranking(text: str, subjects: list[Subject]) -> list[tuple[Subject, float]]:
    words = re.findall(r"[a-z]{3,}", text.lower())
    if not words:
        return []
    freq: dict[str, int] = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    scored = []
    for s in subjects:
        kw = s.keywords()
        hits = sum(freq.get(w, 0) for w in kw)
        norm = hits / (len(words) ** 0.5 + 1)
        scored.append((s, norm))
    scored.sort(key=lambda t: t[1], reverse=True)
    return scored


# Unambiguous filename tokens -> (document_type, confidence). Checked before
# soft content heuristics so a file literally named "...-lab-manual.pdf" is not
# talked out of being a lab manual by an incidental phrase match.
STRONG_FILENAME_TOKENS = [
    (["cheat-sheet", "cheatsheet", "formula-sheet"], "cheat_sheet", 0.75),
    (["lab-manual", "labmanual", "laboratory-manual"], "lab_manual", 0.75),
    (["question-bank", "qbank", "question-bank"], "question_bank", 0.75),
    (["syllabus"], "syllabus", 0.75),
    (["assignment"], "assignment", 0.7),
    (["tutorial"], "tutorial_sheet", 0.65),
    (["-slides", "slides-", "slide-deck"], "slides", 0.7),
    (["all-theorems", "-theorems", "formula"], "formula_sheet", 0.6),
    (["practical", "practical-file", "lab-record"], "lab_record", 0.6),
]


def _detect_document_type(text: str, filename: str, folder: str, text_source: str,
                          filetype: str) -> tuple[str | None, str | None, float, list[str]]:
    sig: list[str] = []
    t = text
    fn = filename.lower()

    # A filename that plainly names a non-exam artefact overrides the exam
    # heuristics (a "...-practical.pdf" that mentions "MST" in a header is a lab
    # record, not a question paper).
    non_exam_fn = any(k in fn for k in ("practical", "lab-manual", "labmanual", "lab-record",
                                        "laboratory-manual", "syllabus", "question-bank", "qbank",
                                        "eng-lab", "english-lab", "-labmanual"))

    # 1. Exam paper — reliable and high-value, so it wins even over filename tokens.
    exam_hits = sum(1 for p in EXAM_PHRASES if p in t)
    mst = RE_MST.search(t) or RE_MST.search(fn)
    paper_tokens = ["pyq", "endsem", "end-sem", "mst", "previous-year", "previous-years",
                    "sample-paper", "model-paper", "-paper", "question-paper"]
    is_paperish = any(k in fn for k in paper_tokens)

    if not non_exam_fn and (exam_hits >= 2 or (exam_hits >= 1 and is_paperish) or mst or is_paperish):
        exam_type = "UNKNOWN"
        if mst:
            g = mst.group(1) or mst.group(2)
            exam_type = f"MST{g}" if g else "MST1"
        elif "mst-1" in fn or "mst1" in fn:
            exam_type = "MST1"
        elif "mst-2" in fn or "mst2" in fn:
            exam_type = "MST2"
        elif "end semester" in t or "endsem" in fn or "end-sem" in fn:
            exam_type = "END_SEM"
        elif "supplementary" in t or "supple" in fn:
            exam_type = "SUPPLEMENTARY"
        conf = 0.4
        if exam_hits >= 2:
            conf = 0.55 + min(exam_hits, 4) * 0.08
        elif exam_hits == 1 or mst:
            conf = 0.6
        elif is_paperish:
            conf = 0.55
        sig.append(f"exam paper (phrases x{exam_hits}"
                   + (f", {exam_type}" if exam_type != "UNKNOWN" else "") + ")")
        return "previous_year_question_paper", exam_type, min(conf, 0.95), sig

    # 2. Unambiguous filename tokens.
    for tokens, dt, conf in STRONG_FILENAME_TOKENS:
        if any(tok in fn for tok in tokens):
            sig.append(f"filename token -> {dt}")
            return dt, None, conf, sig

    # 3. Native slide decks.
    if filetype in ("PPTX", "PPT"):
        sig.append("pptx/ppt file")
        return "slides", None, 0.8, sig

    # 4. Strong content-phrase heuristics.
    if sum(1 for p in LABMANUAL_PHRASES if p in t) >= 2:
        sig.append("lab-manual phrases")
        return "lab_manual", None, 0.55, sig
    if "question bank" in t:
        sig.append("'question bank' in text")
        return "question_bank", None, 0.55, sig
    if sum(1 for p in SYLLABUS_PHRASES if p in t) >= 3:
        sig.append("syllabus phrases")
        return "syllabus", None, 0.5, sig
    if sum(1 for p in SLIDE_PHRASES if p in t) >= 2 and len(t) < 60000:
        sig.append("slide-style phrases")
        return "slides", None, 0.45, sig
    if sum(1 for p in ASSIGNMENT_PHRASES if p in t) >= 2:
        sig.append("assignment phrases")
        return "assignment", None, 0.45, sig

    # 5. Weak filename aliases.
    for dt, aliases in DOC_TYPE_FILENAME_ALIASES.items():
        if any(a in fn for a in aliases):
            sig.append(f"weak filename alias -> {dt}")
            return dt, None, 0.4, sig

    # 6. Content-source default.
    if text_source in ("ocr", "pdftext+ocr"):
        sig.append("scanned -> handwritten notes (default)")
        return "handwritten_notes", None, 0.4, sig
    if text_source == "pdftext":
        sig.append("digital text -> class notes (default)")
        return "class_notes", None, 0.35, sig
    return None, None, 0.0, sig


def classify(*, resource_id: str, file_url: str, original_filename: str, filetype: str,
             text: str, text_source: str, current_title: str, current_type: str,
             current_subject_code: str, folder: str, subjects: list[Subject],
             category_default_subject: dict[str, str]) -> Proposal:
    text = strip_ocr_noise(text or "").lower()
    filename = original_filename.lower()
    p = Proposal(
        resource_id=resource_id, file_url=file_url, original_filename=original_filename,
        text_source=text_source, text_chars=len(text), current_title=current_title,
        current_type=current_type, current_subject_code=current_subject_code,
    )

    # ── Subject ──────────────────────────────────────────────────────────
    subj_conf = 0.0
    chosen: Subject | None = None

    # Guard: material explicitly for a later year isn't a first-year subject.
    not_first_year = bool(
        re.search(r"\b(2nd|second|3rd|third|4th|final)[-\s]?year\b", filename)
        or re.search(r"\b(2nd|second|3rd|third)[-\s]?year\b", text[:2000])
    )

    code_matches = _match_course_codes(text, filename, subjects)
    ranking = _subject_keyword_ranking(text, subjects)
    kw_best, kw_score = (ranking[0] if ranking else (None, 0.0))
    kw_margin = (ranking[0][1] - ranking[1][1]) if len(ranking) > 1 else kw_score

    # The current DB subject already encodes the seed's folder mapping *plus*
    # its hand-curated per-file overrides (e.g. workshop casting -> IP10584),
    # so it is a better prior than the raw folder. Fall back to the folder
    # only when the row has no usable current subject.
    by_code = {s.code: s for s in subjects}
    default_subj = by_code.get(current_subject_code) or by_code.get(
        category_default_subject.get(folder, "")
    )

    if len(code_matches) == 1:
        chosen = code_matches[0]
        p.course_code = chosen.code
        folder_code = category_default_subject.get(folder)
        contradicts = (
            chosen.code not in (current_subject_code, folder_code)
            and folder not in ("", "general")
        )
        if contradicts:
            # a lone course-code hit that disagrees with both the current
            # subject and the upload folder is more likely OCR noise
            subj_conf = 0.55
            p.signals.append(
                f"course code {chosen.code} found but contradicts folder/{current_subject_code} — review"
            )
        else:
            subj_conf = 0.85
            p.signals.append(f"course code {chosen.code}")
    elif len(code_matches) > 1 and kw_best in code_matches:
        chosen = kw_best
        subj_conf = 0.7
        p.signals.append(f"multiple course codes, keywords favour {chosen.code}")
    else:
        # No course code. The upload folder is curated seed data (hand-mapped,
        # with explicit per-file overrides), so treat it as a strong prior:
        # keyword matching may only *override* a non-general folder when it is
        # both very strong and decisive; otherwise it can only *confirm* it.
        has_prior = default_subj is not None and default_subj.code != "GN00001"
        agrees = kw_best is not None and default_subj is not None and kw_best.id == default_subj.id

        if kw_best and agrees and kw_score > 0.15:
            chosen = kw_best
            subj_conf = min(0.55 + kw_score, 0.85)
            p.signals.append(f"prior + keywords agree -> {chosen.code} (score {kw_score:.2f})")
        elif has_prior:
            # Keyword matching against the small syllabus is too noisy to
            # override the curated prior without a course code — keep it,
            # flag divergent keyword hints for the reviewer.
            chosen = default_subj
            subj_conf = 0.5
            note = f"kept current subject {chosen.code}"
            if kw_best and kw_best.id != default_subj.id and kw_score > 0.35:
                note += f" (content also mentions {kw_best.code} terms — confirm on review)"
                subj_conf = 0.42
            p.signals.append(note)
        elif kw_best and kw_score > 0.30 and kw_margin > 0.12:
            # No prior (general bucket). A keyword hint is worth recording but
            # never confident enough to auto-apply.
            chosen = kw_best
            subj_conf = min(0.4 + kw_score, 0.58)
            p.signals.append(f"subject keywords (no prior) -> {chosen.code} (score {kw_score:.2f})")

    if not_first_year and len(code_matches) != 1:
        # Don't pin later-year material onto a first-year subject.
        chosen = None
        subj_conf = 0.0
        p.signals.append("filename/'content' says a later year — not a first-year subject")

    if chosen:
        p.subject_id = chosen.id
        p.subject_code = chosen.code
        p.academic_area = chosen.area
    else:
        p.academic_area = CATEGORY_TO_AREA.get(folder)

    # ── Document type ────────────────────────────────────────────────────
    dt, exam_type, dt_conf, dt_sig = _detect_document_type(
        text, filename, folder, text_source, filetype
    )
    p.document_type = dt
    p.exam_type = exam_type
    p.doctype_confidence = dt_conf
    p.signals += dt_sig

    # A whole-programme / whole-semester syllabus covers every subject — it
    # must not be pinned to one. Same for cross-subject PYQ compilations.
    broad = re.search(r"(sgsits-syllabus|1st-year|first-year|2nd-sem|second-sem|sem[-\s]?a\b|"
                      r"semester[-\s]?\d|all[-\s]?subjects|compilation)", filename)
    many_codes = len({m.code for m in code_matches}) >= 3
    if (
        (dt == "syllabus" and broad)
        or (dt == "previous_year_question_paper" and ("all-subject" in filename or broad))
        or many_codes
        or "sgsits-syllabus" in filename
    ):
        chosen = None
        p.subject_id = None
        p.subject_code = None
        p.subject_confidence = 0.0
        subj_conf = 0.0
        p.academic_area = "general"
        p.signals.append("covers multiple subjects — not pinned to one")

    # ── Metadata ────────────────────────────────────────────────────────
    years = [int(y) for y in RE_YEAR.findall(text + " " + filename) if 2010 <= int(y) <= 2027]
    if years:
        p.academic_year = max(years) if dt == "previous_year_question_paper" else min(years)
    # Unit: only trust an explicit "unitN" in the *filename* — a stray "unit 3"
    # somewhere in OCR'd body text is not reliable enough to name a file by.
    um_fn = RE_UNIT.search(filename)
    um = um_fn or RE_UNIT.search(text)
    if um:
        n = int(um.group(1))
        if chosen and (not chosen.units or n <= len(chosen.units)):
            p.unit = n
            if um_fn and chosen.units and n <= len(chosen.units):
                p.topics = [chosen.units[n - 1]]

    # ── Confidence + status ─────────────────────────────────────────────
    p.subject_confidence = round(subj_conf, 3)
    p.confidence = round(0.62 * subj_conf + 0.38 * dt_conf, 3)

    if subj_conf >= 0.7 and p.confidence >= 0.72:
        p.status = "AUTO_CLASSIFIED"
        p.needs_review = False
        p.reason = "high-confidence subject + document type"
    elif subj_conf >= 0.4 or dt_conf >= 0.5:
        p.status = "REVIEW_REQUIRED"
        p.needs_review = True
        missing = []
        if subj_conf < 0.7:
            missing.append("subject uncertain")
        if not dt:
            missing.append("document type unknown")
        if dt == "previous_year_question_paper" and not p.academic_year:
            missing.append("exam year not found")
        p.reason = "; ".join(missing) or "partial confidence"
    else:
        p.status = "REVIEW_REQUIRED"
        p.needs_review = True
        p.reason = "could not identify subject from content or filename"

    # ── Suggested names ────────────────────────────────────────────────
    p.suggested_title, p.suggested_filename = _suggest_names(p, chosen)
    return p


DOC_TYPE_TITLE = {
    "previous_year_question_paper": "Previous Year Question Paper",
    "question_bank": "Question Bank", "important_questions": "Important Questions",
    "practice_questions": "Practice Questions", "tutorial_sheet": "Tutorial Sheet",
    "assignment": "Assignment", "class_notes": "Notes", "handwritten_notes": "Handwritten Notes",
    "slides": "Slides", "formula_sheet": "Formula Sheet", "cheat_sheet": "Cheat Sheet",
    "revision_notes": "Revision Notes", "lab_manual": "Lab Manual", "lab_record": "Lab Record",
    "syllabus": "Syllabus", "reference_material": "Reference Material",
    "book_extract": "Book Extract", "solved_paper": "Solved Paper", "answer_key": "Answer Key",
    "misc": "Miscellaneous",
}
EXAM_TITLE = {"MST1": "MST 1", "MST2": "MST 2", "END_SEM": "End Sem", "SUPPLEMENTARY": "Supplementary"}


def _suggest_names(p: Proposal, subj: Subject | None) -> tuple[str | None, str | None]:
    if not subj or not p.document_type or p.needs_review:
        return None, None  # never rename on a guess (PHASE 6)
    parts = [subj.name, DOC_TYPE_TITLE.get(p.document_type, p.document_type)]
    unit_in_fn = bool(RE_UNIT.search((p.original_filename or "").lower()))
    qualifier = None
    if p.document_type == "previous_year_question_paper":
        bits = [EXAM_TITLE.get(p.exam_type or "", ""), str(p.academic_year or "")]
        qualifier = " ".join(b for b in bits if b).strip()
    elif p.topics and unit_in_fn:
        qualifier = p.topics[0]
    elif p.unit and unit_in_fn:
        qualifier = f"Unit {p.unit}"
    if qualifier:
        parts.append(qualifier)
    title = " — ".join(parts)
    # Keep the real extension — a renamed .pptx/.docx must not become a fake
    # ".pdf" (it would then get routed to the wrong reader / fail to open).
    ext = os.path.splitext(p.original_filename or "")[1].lower() or ".pdf"
    fname = kebab("-".join([subj.code] + parts[1:])) + ext
    return title, fname
