# Vercel Blob → GitHub migration

## STATUS (2026-09-13) — 293 of 338 files live, free, same URL; 45 hidden until Oct 10

- Crawled every Drive folder the user provided (fixed a folder/file
  detection bug in the crawler that had silently dropped items with no
  visible extension in their Drive display name) — 344 files found.
- Matched 92 more against the missing set (token-overlap scoring, folder
  category hints, textbook/reference-book folders excluded outright), pushed
  to `notes-hub-files`, rewrote their `resource.fileUrl`.
- **293/338 total now permanently free and live.**
- The remaining **45** have no copy anywhere reachable for free (checked:
  git history, all provided Drive folders, this chat). Their resources were
  set to `status: "UNAVAILABLE"` (see `scripts/_hide-unrecoverable.ts`) so
  they don't appear anywhere on the site as dead links. Reversible: flip
  back to `APPROVED` once recovered (Oct 10 Blob unblock, or a fresh
  re-upload of the same file creates a new APPROVED row automatically).

---

## STATUS (2026-09-10) — 201 of 338 files live, free, same URL

- **jsDelivr was abandoned**: it has a hard 50 MB per-repo cap; the files repo
  is ~577 MB. Files are served from **raw.githubusercontent.com** instead
  (`Access-Control-Allow-Origin: *`, works with the PDF.js reader — verified
  on the live site).
- 201 files recovered (git history + Google Drive), compressed, pushed to
  `github.com/animeshagrawal13/notes-hub-files@main`. Their `resource.fileUrl`
  rows now point at `raw.githubusercontent.com/.../main/<path>`.
- **137 files could not be recovered for free** — they exist only in the
  blocked Blob store (no copy in git history, not in the Drive folders).
  Their `fileUrl` rows were left on the Blob host; they self-recover when the
  store unblocks **2026-10-10**. Re-run step 1/2 tooling after that date, or
  have students re-upload.
- `src/lib/upload.ts` rewired: new uploads commit into `notes-hub-files` via
  the GitHub Contents API. **ACTION NEEDED:** add `GITHUB_FILES_TOKEN` (a PAT
  with `contents: write` on `notes-hub-files`) to the Vercel project env, or
  uploads will fail with a clear "storage not configured" message.
- To finish the last 137 after 2026-10-10: get `BLOB_READ_WRITE_TOKEN`, run a
  `list()` + download loop against the (unblocked) store into
  `notes-hub-files`, push, then re-run `scripts/_rewrite-fileurls.ts --apply`.

---

# Original plan (jsDelivr — superseded, kept for reference)

**Why:** Vercel Blob store `fr0cg5ys41r4psru` is blocked (10 GB/mo transfer cap hit).
Access auto-resumes 2026-10-10. Goal: move all PDFs to a free public GitHub repo
served by jsDelivr, keep the same site URL, no paid plan.

## Target
- Files repo: `animeshagrawal13/notes-hub-files` (branch `main`), cloned at
  `D:/All Programs/Web Dev/notes-hub-files`.
- New URL pattern: `https://cdn.jsdelivr.net/gh/animeshagrawal13/notes-hub-files@main/<blobpath>`
  replacing `https://fr0cg5ys41r4psru.public.blob.vercel-storage.com/<blobpath>`.
- `<blobpath>` = `<category>/<slug>.<ext>` (e.g. `chemistry/aas.pdf`).

## Inventory
`scratchpad/blob-inventory.json` — 428 blobs, 338 live `resource` rows with their blob paths.
- 197 of 338 recoverable from git commit `ca7069fd6a827c88aa9b2af00a4124560d1d2471`
  at path `private-uploads/<blobpath>`.
- 141 must be re-downloaded from Google Drive:
  - drive1 id `1avGyJ9F6U-lpkwjMnxsk_r9OOODHZwzI` (80 files)
  - drive2 id `1D8ykpHe6sQwEsCtdhVtkKWUTPwyXkP97` (109 files)
  - filename→blobpath: `slugify(title)` + subject→category map, both in `scripts/import-drive2.ts`.
  - direct download: `https://drive.usercontent.google.com/download?id=<fileId>&export=download&confirm=t`

## Steps

### 1. Extract git-recoverable files  ← RUNNING
`npx tsx scripts/_extract-git.ts` — extracts from the commit, compresses PDFs with
ghostscript (`/ebook`, 140dpi; 75s timeout per file, raw bytes on timeout/failure),
writes to `notes-hub-files/<blobpath>`, skips files already present.

### 2. Download the 141 Drive files
Match each Drive filename to its blob slug, download, compress, stage into `notes-hub-files`.
The list of 141 needed blob paths was printed earlier; re-derive from `blob-inventory.json`
minus whatever step 1 produced.

### 3. Push files repo
```
cd "D:/All Programs/Web Dev/notes-hub-files"
git add . && git commit -m "Seed all notes files" && git push origin main
```
May need chunked commits if push is too large.

### 4. Rewrite DB fileUrls
Script: for each `resource`, `fileUrl.replace(BLOB_PREFIX, JSDELIVR_PREFIX)`.
Run with `DATABASE_URL` + `&connection_limit=1`.

### 5. Rewire upload/delete for future uploads
`src/lib/upload.ts` `saveUploadedFile` / `deleteUploadedFile` and `/api/resources`
POST + DELETE: commit new files to `notes-hub-files` via GitHub Contents API
(`PUT /repos/animeshagrawal13/notes-hub-files/contents/<path>`).
Needs `GITHUB_FILES_TOKEN` (repo scope) added to Vercel env.
Returned `content.download_url` → rewrite to the jsDelivr URL before storing.

### 6. Build + deploy
`npm run build`, commit+push `notes-hub` master, open a PDF on the live site to verify.

## Notes
- jsDelivr: ~20 MB/file limit, ~1 GB repo soft limit. Compressed set should fit.
- jsDelivr caches aggressively; purge via `https://purge.jsdelivr.net/gh/...` if a file 404s after push.
- Excluded (textbook piracy, keep out): N.D. Bhatt Engineering Drawing, Balaguruswamy
  Programming in C, Fundamentals of Computers, Surveying Vol 1 S.K. Duggal.
