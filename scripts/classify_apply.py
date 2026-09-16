"""
PHASE C/D — apply the dry-run proposals.

Order of operations (all reversible via ClassificationLog + a DB backup):
  1. ARCHIVE_DUPLICATE  — exact-byte duplicates: keep the earliest row, set
     the rest to status='ARCHIVED' (drops out of every APPROVED listing),
     move their file into private-uploads/_archived-duplicates/.
  2. AUTO_CLASSIFY      — the 49 high-confidence rows: write taxonomy fields,
     rename the file on disk, update fileUrl.
  3. STAGE_REVIEW       — the rest: write academicArea + documentType + a
     pre-filled subject + classificationStatus='REVIEW_REQUIRED'. No rename.
  4. MARK_DUPLICATE     — probable (not exact) duplicates: flag only.

Run:
    python scripts/classify_apply.py --dry     # print plan, write nothing
    python scripts/classify_apply.py           # apply
    python scripts/classify_apply.py --rollback # undo everything from the log
"""

from __future__ import annotations

import json
import os
import re
import secrets
import shutil
import sqlite3
import sys
from collections import defaultdict
from datetime import datetime, timezone

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "prisma", "dev.db")
# fileUrl is now "/api/files/<category>/<name>", resolved under private-uploads/
PRIVATE_UPLOADS = os.path.join(ROOT, "private-uploads")
PROPOSALS = os.path.join(ROOT, "data", "migration-proposals.json")
ARCHIVE_DIR = os.path.join(PRIVATE_UPLOADS, "_archived-duplicates")

DRY = "--dry" in sys.argv
ROLLBACK = "--rollback" in sys.argv


def log_id() -> str:
    return "clg" + secrets.token_hex(12)


def now() -> int:
    # Prisma stores SQLite DateTime as epoch milliseconds. Writing an ISO
    # string here "works" (Prisma parses it back) but makes the column mixed
    # type, and SQLite sorts every integer before every string — so an
    # ORDER BY createdAt would put the newest rows last.
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def local_path(file_url: str) -> str:
    return os.path.join(PRIVATE_UPLOADS, file_url.replace("/api/files/", "").replace("/", os.sep))


def write_log(con, resource_id, action, before, after, confidence=None, reason=None):
    con.execute(
        "insert into ClassificationLog (id, resourceId, action, actor, before, after, confidence, reason, createdAt) "
        "values (?,?,?,?,?,?,?,?,?)",
        (log_id(), resource_id, action, "system", json.dumps(before), json.dumps(after),
         confidence, reason, now()),
    )


# ── rollback ─────────────────────────────────────────────────────────────
def rollback(con):
    logs = con.execute(
        "select id, resourceId, action, before, after from ClassificationLog "
        "where action in ('AUTO_CLASSIFY','STAGE_REVIEW','ARCHIVE_DUPLICATE','MARK_DUPLICATE','RENAME') "
        "order by createdAt desc"
    ).fetchall()
    n = 0
    for lid, rid, action, before_s, after_s in logs:
        before = json.loads(before_s or "{}")
        if not before:
            continue
        cols = [k for k in before if k not in ("_file_from", "_file_to")]
        if cols:
            con.execute(
                f"update Resource set {', '.join(c + '=?' for c in cols)} where id=?",
                [before[c] for c in cols] + [rid],
            )
        # move a renamed / archived file back
        frm = (json.loads(after_s or "{}")).get("_file_to")
        to = before.get("_file_from")
        if frm and to:
            src, dst = local_path(frm), local_path(to)
            if os.path.exists(src):
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.move(src, dst)
        con.execute("delete from ClassificationLog where id=?", (lid,))
        n += 1
    con.commit()
    print(f"rolled back {n} log entries")


# ── apply ────────────────────────────────────────────────────────────────
def unique_path(folder_abs: str, name: str) -> str:
    base, ext = os.path.splitext(name)
    cand = name
    i = 2
    while os.path.exists(os.path.join(folder_abs, cand)):
        cand = f"{base}-{i}{ext}"
        i += 1
    return cand


def main():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row

    if ROLLBACK:
        rollback(con)
        return

    proposals = json.load(open(PROPOSALS, encoding="utf-8"))["proposals"]
    by_id = {p["resource_id"]: p for p in proposals}
    rows = {r["id"]: dict(r) for r in con.execute("select * from Resource")}

    # ── 1. exact duplicates ──
    groups = defaultdict(list)
    for r in rows.values():
        if r["fileHash"]:
            groups[r["fileHash"]].append(r["id"])
    archived: set[str] = set()
    dup_plan = []
    for ids in groups.values():
        if len(ids) < 2:
            continue
        ids.sort(key=lambda i: rows[i]["createdAt"] or "")
        canon = ids[0]
        for rid in ids[1:]:
            dup_plan.append((rid, canon))
            archived.add(rid)

    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    for rid, canon in dup_plan:
        r = rows[rid]
        old_url = r["fileUrl"]
        new_url = None
        if old_url.startswith("/api/files/") and os.path.exists(local_path(old_url)):
            newname = f"{rid}__{os.path.basename(old_url)}"
            new_url = f"/api/files/_archived-duplicates/{newname}"
        before = {
            "status": r["status"], "possibleDuplicate": r["possibleDuplicate"],
            "duplicateOfId": r["duplicateOfId"], "fileUrl": old_url,
            "_file_from": old_url,
        }
        after = {
            "status": "ARCHIVED", "possibleDuplicate": 1, "duplicateOfId": canon,
            "fileUrl": new_url or old_url, "_file_to": new_url,
        }
        print(f"  ARCHIVE dup  {os.path.basename(old_url):45} -> canonical {canon}")
        if DRY:
            continue
        if new_url:
            shutil.move(local_path(old_url), local_path(new_url))
        con.execute(
            "update Resource set status='ARCHIVED', possibleDuplicate=1, duplicateOfId=?, fileUrl=? where id=?",
            (canon, new_url or old_url, rid),
        )
        write_log(con, rid, "ARCHIVE_DUPLICATE", before, after, reason=f"exact byte duplicate of {canon}")

    # ── 2 + 3. auto-classify / stage-review ──
    auto_n = review_n = 0
    for rid, p in by_id.items():
        if rid in archived:
            continue
        r = rows[rid]
        is_auto = p["status"] == "AUTO_CLASSIFIED"

        before = {k: r[k] for k in (
            "documentType", "academicArea", "examType", "examSession", "academicYear",
            "courseCode", "topicsJson", "tagsJson", "classificationStatus",
            "classificationConfidence", "classificationReason", "needsReview",
            "suggestedTitle", "subjectId", "fileUrl",
        )}

        # subject: only move it when the proposal is confident AND differs
        new_subject = r["subjectId"]
        if p["subject_id"] and p["subject_id"] != r["subjectId"] and p["subject_confidence"] >= 0.8:
            new_subject = p["subject_id"]
        elif not r["subjectId"] and p["subject_id"]:
            new_subject = p["subject_id"]

        fields = {
            "documentType": p["document_type"],
            "academicArea": p["academic_area"],
            "examType": p["exam_type"],
            "academicYear": p["academic_year"],
            "courseCode": p["course_code"],
            "topicsJson": json.dumps(p["topics"]) if p["topics"] else None,
            "tagsJson": json.dumps(
                [t for t in [p["academic_area"], p["document_type"], p["exam_type"],
                             str(p["academic_year"] or "")] if t]
            ),
            "classificationConfidence": p["confidence"],
            "classificationReason": p["reason"],
            "suggestedTitle": p["suggested_title"],
            "subjectId": new_subject,
        }

        new_url = r["fileUrl"]
        if is_auto:
            fields["classificationStatus"] = "AUTO_CLASSIFIED"
            fields["needsReview"] = 0
            auto_n += 1
            if p["suggested_filename"] and r["fileUrl"].startswith("/api/files/"):
                folder = os.path.dirname(local_path(r["fileUrl"]))
                fname = unique_path(folder, p["suggested_filename"])
                new_url = f"{os.path.dirname(r['fileUrl'])}/{fname}"
        else:
            fields["classificationStatus"] = "REVIEW_REQUIRED"
            fields["needsReview"] = 1
            review_n += 1

        after = dict(fields)
        after["fileUrl"] = new_url
        after["_file_to"] = new_url if new_url != r["fileUrl"] else None
        before["_file_from"] = r["fileUrl"]

        tag = "AUTO " if is_auto else "review"
        if new_url != r["fileUrl"]:
            print(f"  {tag}  {os.path.basename(r['fileUrl']):45} -> {os.path.basename(new_url)}")
        elif is_auto:
            print(f"  {tag}  {os.path.basename(r['fileUrl']):45}  (metadata only)")

        if DRY:
            continue
        if new_url != r["fileUrl"]:
            shutil.move(local_path(r["fileUrl"]), local_path(new_url))
        sets = ", ".join(f"{k}=?" for k in fields) + ", fileUrl=?"
        con.execute(
            f"update Resource set {sets} where id=?",
            list(fields.values()) + [new_url, rid],
        )
        write_log(con, rid, "AUTO_CLASSIFY" if is_auto else "STAGE_REVIEW",
                  before, after, confidence=p["confidence"], reason=p["reason"])

    # ── 4. probable (non-exact) duplicates ──
    prob = 0
    for p in proposals:
        rid = p["resource_id"]
        if rid in archived or not p["possible_duplicate"] or not p["duplicate_of"]:
            continue
        r = rows[rid]
        if r["possibleDuplicate"]:
            continue
        prob += 1
        print(f"  MARK dup?   {os.path.basename(r['fileUrl'])}")
        if DRY:
            continue
        before = {"possibleDuplicate": r["possibleDuplicate"], "duplicateOfId": r["duplicateOfId"]}
        con.execute("update Resource set possibleDuplicate=1, duplicateOfId=? where id=?",
                    (p["duplicate_of"], rid))
        write_log(con, rid, "MARK_DUPLICATE", before,
                  {"possibleDuplicate": 1, "duplicateOfId": p["duplicate_of"]},
                  reason="probable duplicate (content similarity)")

    if not DRY:
        con.commit()

    print(f"\n{'DRY RUN — nothing written' if DRY else 'applied'}: "
          f"{len(dup_plan)} archived, {auto_n} auto-classified, {review_n} staged for review, "
          f"{prob} flagged as probable duplicates")


if __name__ == "__main__":
    main()
