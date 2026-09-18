"""
Phase 1c — Copy files from local folder instead of downloading from Google Drive.
"""

from __future__ import annotations

import os
import re
import sys
import shutil

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRIVATE_UPLOADS = os.path.join(ROOT, "private-uploads")
SOURCE_FOLDER = r"D:\SIH\New folder"

# ── Subject pre-classification ────────────────────────────────────────────────
SUBJECT_RULES = [
    (["ma10021", "ma10509", "ma 10509", "ma 10021", "ma10501",
      r"\bmath", "matrices", "calculus", "integral", "differentiat",
      "fourier", "laplace", "series", "probability", "statistic", "hypothesis",
      "permut", "combin", "beta.gamma", "taylor", "mclaurin",
      "jacobian", "maxima.minima", "asymptot", "curvature", "random.var", "fuzzy.set",
      "r.programm", "ms.excel", "sampling", "mst.2.solution.ma", "solution.mst.1.ma",
      "mst.*ma10021", "sem.*mst"], "mathematics"),

    (["ph10009", r"\bphysics", "laser", "optic", "quantum", "relativity",
      "semiconductor", "superconductor", "crystal", "photon", "nuclear"], "physics"),

    (["ch10010", r"\bchem", "water.tech", "lubricant", "fuel", "polymer",
      "corrosion", "acid.base", "titration", "electrochemistry",
      "water.notes", "support.material.*acid"], "chemistry"),

    (["ee10510", r"\belectri", r"\bcircuit", "karnaugh", "adder", "transistor",
      "diode", "feee", "magnetic.ckt", "voltage", "current", "three.phase",
      "dc.circuit", "ac.circuit", "digital.logic", "drsks", "dr.sks",
      "l-[0-9]+.*drsks", "unit.*feee", "quiz.*electric"], "electronics"),

    (["it10007", "functions.lab", r"\bc.*handwritten", "c.*lang", r"\bdbms",
      "database", r"\balgorithm", "flowchart", "operating.system",
      r"\bnetwork", "hardware", "software", r"\bai\b",
      "artificial.intel", "java", r"\bprogramming"], "programming"),

    (["me10008", "ip10584", "ip.workshop", "workshop.manual",
      r"\bmechanical", "fluid", r"\bmachines?\b", "welding.shop",
      "casting", "machining", "isometric", "orthographic",
      "ic.engine", "automobile", "kinematics", "turbine",
      "thermodynamic", "mst3.me10008", "sheet.no.*isometric",
      "practice.sheet.*ortho"], "mechanical-workshop"),

    (["ce10513", r"\bcivil", "truss", "surveying", "concrete",
      "history.of.civil", "introduction.to.civil",
      "lecture.on.truss"], "civil"),

    (["hu10512", "hu10181", "language", r"\benglish\b", "grammar",
      "lsrw", "sq3r", "linguistics", "understanding.bharat",
      "project.report", "unit.*question"], "languages"),

    (["py10514", "biology", "genetics", "microbio", "bacterio",
      r"\bvirus\b", r"\bdna\b", r"\benzymes?\b", "bioinspired",
      "tissue.eng", "cardiovascular", "nervous.system",
      "respiration", r"\bfungi\b", "recombinant", "biomolecule",
      "bio.lect", "biology.system", "breathing"], "general"),
]

# Files to explicitly skip (not notes)
SKIP_PATTERNS = [
    r"plugmitra",
    r"sih2026",
    r"holiday.assignment",
]

SUPPORTED_EXTS = {".pdf", ".pptx", ".ppt", ".docx"}


def should_skip(filename: str) -> bool:
    fn = filename.lower()
    fn_norm = re.sub(r"[^a-z0-9]+", ".", fn)
    return any(re.search(p, fn_norm) for p in SKIP_PATTERNS)


def classify_folder(filename: str) -> str:
    fn = filename.lower()
    fn_norm = re.sub(r"[^a-z0-9]+", ".", fn)
    for patterns, folder in SUBJECT_RULES:
        for pat in patterns:
            if re.search(pat, fn_norm):
                return folder
    return "general"

def main() -> None:
    if not os.path.isdir(SOURCE_FOLDER):
        print(f"Error: Source folder not found at {SOURCE_FOLDER}")
        return

    print(f"── Copying files from {SOURCE_FOLDER} ──")
    ok = skip = 0
    copied_files = []

    for dirpath, _, filenames in os.walk(SOURCE_FOLDER):
        for filename in filenames:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_EXTS:
                continue
            if should_skip(filename):
                print(f"  SKIP (not notes): {filename}")
                skip += 1
                continue

            local_path = os.path.join(dirpath, filename)
            
            # Clean up filename (remove special chars that cause issues)
            safe_filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", filename).strip()

            folder = classify_folder(safe_filename)
            dest_dir = os.path.join(PRIVATE_UPLOADS, folder)
            os.makedirs(dest_dir, exist_ok=True)
            dest_path = os.path.join(dest_dir, safe_filename)

            if os.path.exists(dest_path) and os.path.getsize(dest_path) == os.path.getsize(local_path):
                print(f"  SKIP (already exists): {folder}/{safe_filename}")
                skip += 1
                continue

            shutil.copy2(local_path, dest_path)
            kb = os.path.getsize(dest_path) // 1024
            print(f"  ✓ COPY {folder}/{safe_filename} ({kb} KB)")
            copied_files.append((folder, safe_filename))
            ok += 1

    from collections import Counter
    counts = Counter(folder for folder, _ in copied_files)
    print("\n── Newly copied files by subject folder ──")
    for folder, n in sorted(counts.items()):
        print(f"  {folder:<25} {n}")

    print(f"\n── Done ──")
    print(f"  Copied         : {ok}")
    print(f"  Already existed: {skip}")
    print(f"\nNext: npx ts-node scripts/import-drive-new.ts")


if __name__ == "__main__":
    main()
