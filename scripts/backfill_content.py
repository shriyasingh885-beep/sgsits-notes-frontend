"""
PHASE A (non-destructive backfill).

For every Resource row: compute the file hash, page count, and extracted /
OCR'd text, and store them on the row. Also records one ClassificationLog
(action=BACKFILL) per row with a before/after snapshot so the step is auditable
and reversible.

NOT touched here: title, type, subjectId, unitId, fileUrl, tags, or any
classification field. That is PHASE B (dry run) and later.

Idempotent + resumable: rows that already have a fileHash are skipped, and all
raw extraction is cached in data/extract-cache.json so re-runs are cheap.

Usage:
    python scripts/backfill_content.py            # run / resume
    python scripts/backfill_content.py --force    # re-extract everything
    python scripts/backfill_content.py --stats    # just show coverage
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

sys.path.insert(0, os.path.dirname(__file__))
from lib_extract import extract_any  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "prisma", "dev.db")
# fileUrl is now "/api/files/<category>/<name>", resolved under private-uploads/
PRIVATE_UPLOADS = os.path.join(ROOT, "private-uploads")
CACHE_PATH = os.path.join(ROOT, "data", "extract-cache.json")
MAX_TEXT_CHARS = 20000  # bounds contentText in the DB; full text stays in the cache

import sqlite3  # noqa: E402


def cuid_like() -> str:
    # Good enough for a log id; not a real cuid but collision-safe here.
    import secrets

    return "clg" + secrets.token_hex(12)


def load_cache() -> dict:
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    return {}


def save_cache(cache: dict) -> None:
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    tmp = CACHE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(cache, fh, ensure_ascii=False, indent=1)
    os.replace(tmp, CACHE_PATH)


def local_path(file_url: str) -> str | None:
    if file_url.startswith("http://") or file_url.startswith("https://"):
        return None
    return os.path.join(PRIVATE_UPLOADS, file_url.replace("/api/files/", "").replace("/", os.sep))


def show_stats(con: sqlite3.Connection) -> None:
    cur = con.cursor()
    total = cur.execute("select count(*) from Resource").fetchone()[0]
    hashed = cur.execute("select count(*) from Resource where fileHash is not null").fetchone()[0]
    withtext = cur.execute(
        "select count(*) from Resource where contentText is not null and length(contentText) > 0"
    ).fetchone()[0]
    logs = cur.execute("select count(*) from ClassificationLog where action = 'BACKFILL'").fetchone()[0]
    print(f"resources           : {total}")
    print(f"  fileHash set       : {hashed}")
    print(f"  contentText set    : {withtext}")
    print(f"BACKFILL log rows    : {logs}")


def main() -> None:
    force = "--force" in sys.argv
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    if "--stats" in sys.argv:
        show_stats(con)
        return

    cache = load_cache()
    rows = con.execute(
        "select id, title, fileUrl, fileType, fileHash from Resource order by fileUrl"
    ).fetchall()

    todo = [r for r in rows if force or not r["fileHash"]]
    print(f"{len(rows)} resources, {len(todo)} to process "
          f"({len(rows) - len(todo)} already have a hash)\n")

    started = time.time()
    ocr_count = 0
    processed = 0

    for i, r in enumerate(todo, 1):
        url = r["fileUrl"]
        path = local_path(url)
        cached = cache.get(url)

        if cached and not force:
            ex = cached
        else:
            if path is None:
                ex = {"file_hash": None, "page_count": None, "text": "",
                      "source": "remote", "ocr_pages": [], "error": None}
            else:
                res = extract_any(path)
                ex = {
                    "file_hash": res.file_hash,
                    "page_count": res.page_count,
                    "text": res.text,
                    "source": res.source,
                    "ocr_pages": res.ocr_pages,
                    "error": res.error,
                    "chars": res.chars,
                }
            cache[url] = ex
            if i % 5 == 0 or ex.get("source", "").startswith(("ocr", "pdftext+ocr")):
                save_cache(cache)

        if ex.get("source", "").startswith(("ocr", "pdftext+ocr")):
            ocr_count += 1

        original = os.path.basename(url)
        content = (ex.get("text") or "").strip().lower()[:MAX_TEXT_CHARS]

        before = {
            "fileHash": r["fileHash"],
            "pageCount": None,
            "contentText": None,
            "originalFilename": None,
        }
        after = {
            "fileHash": ex.get("file_hash"),
            "pageCount": ex.get("page_count"),
            "contentText_chars": len(content),
            "originalFilename": original,
            "textSource": ex.get("source"),
            "ocrPages": ex.get("ocr_pages"),
        }

        con.execute(
            "update Resource set fileHash=?, pageCount=?, contentText=?, originalFilename=? where id=?",
            (ex.get("file_hash"), ex.get("page_count"), content or None, original, r["id"]),
        )
        con.execute(
            "insert into ClassificationLog (id, resourceId, action, actor, before, after, reason, createdAt) "
            "values (?,?,?,?,?,?,?,?)",
            (
                cuid_like(),
                r["id"],
                "BACKFILL",
                "system",
                json.dumps(before),
                json.dumps(after),
                f"extracted via {ex.get('source')}",
                # epoch ms — Prisma's SQLite DateTime encoding (see classify_apply.now)
                int(datetime.now(timezone.utc).timestamp() * 1000),
            ),
        )
        con.commit()
        processed += 1

        rate = processed / max(time.time() - started, 1e-6)
        eta = (len(todo) - i) / max(rate, 1e-6)
        print(f"[{i:>3}/{len(todo)}] {ex.get('source','?'):<12} "
              f"{len(content):>6} chars  {url}   (~{eta/60:.0f}m left)",
              flush=True)

    save_cache(cache)
    print(f"\ndone: {processed} processed, {ocr_count} needed OCR, "
          f"{time.time() - started:.0f}s")
    show_stats(con)
    con.close()


if __name__ == "__main__":
    main()
