"""
PHASE B — dry run (PHASE 17 / 25 of the taxonomy plan).

Runs the classifier over every Resource and writes:
  data/migration-proposals.json  — full per-document proposal
  data/migration-report.md       — human summary + samples + duplicates

Writes NOTHING to the database and renames NOTHING. Review the report, tune
scripts/lib_classify.py, re-run. Only after sign-off does classify_apply.py
touch data.

Usage:
    python scripts/classify_dry_run.py
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from difflib import SequenceMatcher

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

sys.path.insert(0, os.path.dirname(__file__))
from lib_classify import Subject, classify, strip_ocr_noise  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "prisma", "dev.db")
CACHE_PATH = os.path.join(ROOT, "data", "extract-cache.json")
OUT_JSON = os.path.join(ROOT, "data", "migration-proposals.json")
OUT_MD = os.path.join(ROOT, "data", "migration-report.md")

CATEGORY_DEFAULT_SUBJECT = {
    "chemistry": "CH10010", "physics": "PH10009", "mechanical-workshop": "ME10008",
    "programming": "IT10007", "mathematics": "MA10021", "electronics": "EE10510",
    "languages": "HU10512", "civil": "CE10513", "general": "GN00001",
}

BAD_NAME_RE = re.compile(
    r"^(doc(ument)?scan(ner)?|img[_-]?\d|scan\d*|adobe[-_]?scan|camscanner|photo|image|untitled|"
    r"new doc|paper|unlabeled|divyanshu|final|copy|whatsapp)",
    re.I,
)


def folder_of(file_url: str) -> str:
    m = re.match(r"/api/files/([^/]+)/", file_url)
    return m.group(1) if m else ""


def load_subjects(con) -> list[Subject]:
    subs = []
    for s in con.execute("select id, name, code, semesterId from Subject"):
        units = [
            r[0] for r in con.execute(
                "select title from Unit where subjectId=? order by number", (s["id"],)
            )
        ]
        sem = con.execute(
            "select year, number from Semester where id=?", (s["semesterId"],)
        ).fetchone()
        subs.append(Subject(
            id=s["id"], name=s["name"], code=s["code"],
            year=sem["year"] if sem else 1, num=sem["number"] if sem else 1, units=units,
        ))
    return subs


def find_duplicates(rows: list[dict]) -> dict[str, dict]:
    """resource_id -> {'exact_of': id} | {'near_of': id}"""
    result: dict[str, dict] = {}

    by_hash: dict[str, list[dict]] = {}
    for r in rows:
        if r["fileHash"]:
            by_hash.setdefault(r["fileHash"], []).append(r)
    for group in by_hash.values():
        if len(group) > 1:
            group.sort(key=lambda r: r["createdAt"] or "")
            canon = group[0]["id"]
            for r in group[1:]:
                result[r["id"]] = {"kind": "exact", "of": canon}

    # near-duplicates: same page count, very similar text prefix
    remaining = [r for r in rows if r["id"] not in result and r.get("_text")]
    by_pages: dict[int, list[dict]] = {}
    for r in remaining:
        if r["pageCount"]:
            by_pages.setdefault(r["pageCount"], []).append(r)
    for group in by_pages.values():
        if len(group) < 2:
            continue
        for i in range(len(group)):
            for j in range(i + 1, len(group)):
                a, b = group[i], group[j]
                if b["id"] in result:
                    continue
                pa = strip_ocr_noise(a["_text"])[:400]
                pb = strip_ocr_noise(b["_text"])[:400]
                if pa and pb and SequenceMatcher(None, pa, pb).ratio() >= 0.9:
                    result[b["id"]] = {"kind": "near", "of": a["id"]}
    return result


def main() -> None:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    cache = json.load(open(CACHE_PATH, encoding="utf-8")) if os.path.exists(CACHE_PATH) else {}
    subjects = load_subjects(con)
    code_to_name = {s.code: s.name for s in subjects}

    rows = [dict(r) for r in con.execute(
        "select r.id, r.title, r.type, r.fileUrl, r.fileType, r.fileHash, r.pageCount, "
        "r.contentText, r.originalFilename, r.createdAt, s.code as subjectCode "
        "from Resource r join Subject s on s.id = r.subjectId order by r.fileUrl"
    )]
    for r in rows:
        c = cache.get(r["fileUrl"], {})
        r["_text"] = c.get("text") or r["contentText"] or ""
        r["_source"] = c.get("source") or ("pdftext" if r["contentText"] else "none")

    dups = find_duplicates(rows)

    proposals = []
    for r in rows:
        folder = folder_of(r["fileUrl"])
        p = classify(
            resource_id=r["id"], file_url=r["fileUrl"],
            original_filename=r["originalFilename"] or os.path.basename(r["fileUrl"]),
            filetype=r["fileType"], text=r["_text"], text_source=r["_source"],
            current_title=r["title"], current_type=r["type"],
            current_subject_code=r["subjectCode"], folder=folder, subjects=subjects,
            category_default_subject=CATEGORY_DEFAULT_SUBJECT,
        )
        d = dups.get(r["id"])
        if d:
            p.possible_duplicate = True
            p.duplicate_of = d["of"]
            p.signals.append(f"{d['kind']} duplicate of {d['of']}")
        proposals.append(p)

    # ── write proposals json ──
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    json.dump(
        {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "count": len(proposals),
            "proposals": [p.to_dict() for p in proposals],
        },
        open(OUT_JSON, "w", encoding="utf-8"),
        ensure_ascii=False,
        indent=1,
    )

    # ── build report ──
    n = len(proposals)
    auto = [p for p in proposals if p.status == "AUTO_CLASSIFIED"]
    review = [p for p in proposals if p.status == "REVIEW_REQUIRED"]
    subj_known = [p for p in proposals if p.subject_confidence >= 0.7]
    no_subject = [p for p in proposals if not p.subject_id]
    renamed = [p for p in proposals if p.suggested_filename]
    bad_names = [p for p in proposals if BAD_NAME_RE.match(p.original_filename or "")]
    exact_dups = [p for p in proposals if p.possible_duplicate and "exact duplicate" in " ".join(p.signals)]
    near_dups = [p for p in proposals if p.possible_duplicate and "near duplicate" in " ".join(p.signals)]

    subj_changes = sum(
        1 for p in proposals
        if p.subject_code and p.subject_code != p.current_subject_code
    )

    def dist(key):
        c = Counter(getattr(p, key) or "—" for p in proposals)
        return "\n".join(f"| {k} | {v} |" for k, v in c.most_common())

    def sample(items, k=6):
        out = []
        for p in items[:k]:
            subj = code_to_name.get(p.subject_code or "", p.subject_code or "?")
            out.append(
                f"- `{p.original_filename}`  \n"
                f"  → **{p.suggested_title or '(no rename — needs review)'}**  \n"
                f"  subject: {subj} · type: {p.document_type or '—'} · "
                f"year: {p.academic_year or '—'} · conf: {p.confidence:.2f} "
                f"({p.subject_confidence:.2f} subj / {p.doctype_confidence:.2f} type)  \n"
                f"  status: **{p.status}** — {p.reason}  \n"
                f"  signals: {'; '.join(p.signals) or '—'}"
            )
        return "\n".join(out)

    md = f"""# Notes Hub — classification dry run

_Generated {datetime.now().strftime('%Y-%m-%d %H:%M')} · {n} documents · **no data was changed**_

## Headline numbers

| Metric | Count | % |
|---|---:|---:|
| Total documents | {n} | 100% |
| Auto-classifiable (high confidence) | {len(auto)} | {len(auto)*100//n}% |
| Needs manual review | {len(review)} | {len(review)*100//n}% |
| Subject confidently identified | {len(subj_known)} | {len(subj_known)*100//n}% |
| No subject could be assigned | {len(no_subject)} | {len(no_subject)*100//n}% |
| Would get a new filename | {len(renamed)} | {len(renamed)*100//n}% |
| Scanner-style / junk filename now | {len(bad_names)} | {len(bad_names)*100//n}% |
| Proposed subject differs from current | {subj_changes} | {subj_changes*100//n}% |
| Exact duplicates (same bytes) | {len(exact_dups)} | |
| Probable duplicates (same content) | {len(near_dups)} | |

## By academic area
| Area | Docs |
|---|---:|
{dist('academic_area')}

## By document type
| Type | Docs |
|---|---:|
{dist('document_type')}

## By proposed subject
| Subject code | Docs |
|---|---:|
{dist('subject_code')}

## By exam type (PYQs)
| Exam type | Docs |
|---|---:|
{dist('exam_type')}

---

## Sample — AUTO_CLASSIFIED (would apply without review)
{sample(auto)}

## Sample — REVIEW_REQUIRED (partial confidence)
{sample([p for p in review if p.subject_id])}

## Sample — REVIEW_REQUIRED (no subject)
{sample([p for p in review if not p.subject_id])}

## Duplicates
{chr(10).join(f"- `{p.original_filename}` — {[s for s in p.signals if 'duplicate' in s][0]}" for p in proposals if p.possible_duplicate) or "_none detected_"}

## Junk filenames detected
{chr(10).join(f"- `{p.original_filename}` → {p.suggested_title or '(needs review)'}" for p in bad_names) or "_none_"}
"""
    open(OUT_MD, "w", encoding="utf-8").write(md)

    print(f"wrote {OUT_JSON}")
    print(f"wrote {OUT_MD}")
    print(f"\n{n} docs · {len(auto)} auto · {len(review)} review · "
          f"{len(no_subject)} no-subject · {len(exact_dups)+len(near_dups)} dupes")


if __name__ == "__main__":
    main()
