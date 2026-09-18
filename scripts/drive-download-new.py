"""
Phase 1b — Recover already-downloaded files from _drive_tmp_new,
           then individually download the remaining failed files using their Drive IDs.

Run:  python scripts/drive-download-new.py
"""

from __future__ import annotations

import os
import re
import sys
import shutil
import time

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import gdown

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRIVATE_UPLOADS = os.path.join(ROOT, "private-uploads")
MANIFEST_OUT = os.path.join(ROOT, "scripts", "drive-manifest-new.tsv")
TMP_DIR = os.path.join(ROOT, "scripts", "_drive_tmp_new")

FOLDER_ID = "1D8ykpHe6sQwEsCtdhVtkKWUTPwyXkP97"

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


def move_from_tmp(results: list[tuple[str, str, str]]) -> None:
    """Move all files currently in TMP_DIR into private-uploads/<folder>/."""
    if not os.path.isdir(TMP_DIR):
        return
    for dirpath, _dirs, filenames in os.walk(TMP_DIR):
        for filename in filenames:
            local_path = os.path.join(dirpath, filename)
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_EXTS:
                print(f"  SKIP (unsupported): {filename}")
                continue
            if should_skip(filename):
                print(f"  SKIP (not notes):   {filename}")
                os.remove(local_path)
                continue

            folder = classify_folder(filename)
            dest_dir = os.path.join(PRIVATE_UPLOADS, folder)
            os.makedirs(dest_dir, exist_ok=True)
            dest_path = os.path.join(dest_dir, filename)

            if os.path.exists(dest_path) and os.path.getsize(dest_path) == os.path.getsize(local_path):
                print(f"  SKIP (exists same size): {folder}/{filename}")
                os.remove(local_path)
                results.append(("existing", folder, filename))
                continue

            shutil.move(local_path, dest_path)
            kb = os.path.getsize(dest_path) // 1024
            print(f"  ✓  {folder}/{filename}  ({kb} KB)")
            results.append(("moved", folder, filename))


# ── Per-file IDs (from the Drive folder listing — "Processing file <ID> <name>")
# These are all 108 files gdown detected. We download each individually.
DRIVE_FILES: list[tuple[str, str]] = [
    # (file_id, original_filename)
    ("1CvoRRdPx2pXjL-7dHUAFs9bf7GMmuVnV", "3. Genetics_MolBio_Engineering_Applications_with_Diagrams.pdf"),
    ("1L4xfg7uR8FNmkIBzG12W_mFmA6Tr54Fo", "_karnaugh_maps_1.pdf"),
    ("16cyGt9i1JHNyawKRtjOPOET76hrtaU2v", "_karnaugh_maps_2.pdf"),
    ("107q74k-DdlFQB0sNlsWhqowNRsSr9o1Q", "Ass.-II,MA 10501(MATHEMATICS FOR DATA SCIENCE).pdf"),
    ("1v7pwOVidKHuqf4tlrw1CML45_Zr_UJDO", "Assignment 1 MA 10021 (1).pdf"),
    ("1DaBHJSa3nUkm7fDx6mNGlN857yrsutwv", "Assignment 1_unit 2.pdf"),
    ("19e3Hfj9nbLa17AlbzHJMrD9S36gBMhVJ", "Assignment 2 HU10512 LANGUAGES FOR ENGINEERS.docx"),
    ("1g-Y7Lo4RlpLy8daCRNrDghwrBXiJmSYf", "Assignment 2 MA 10021.pdf"),
    ("14H7LuEV-xqK7K-Q9GPNoWfKH5Y1tXxXZ", "ASSIGNMENT 4 final.docx"),
    ("1xxMT35WjqyKndgCOG6l5rrDxYmX5Yyzq", "Assignment based on Unit-I DC Circuits_new.pdf"),
    ("1sogL6pTf8VzMMFf-xoIJAzlaGAvwaTSX", "Assignment unit 3.pdf"),
    ("12q9i9X6zfBOKqjg6F-ztG2iCkXITrceV", "Assignment-I,MA- 10509.pdf"),
    ("1JRiZDiBoj1LgSbOtPL1bbWJhtGTYee8e", "Assignment.pdf"),
    ("11Sg2EV6-tJk6yH9kALs4pdaU5R0agN5E", "ASSINGMENT 2 UNIT 5.pdf"),
    ("1q4ojiF_jD2i4Uzc68zos3ZkqLwR6rcLz", "ASSINMENT 1 UNIT 4.pdf"),
    ("1M7nTVkDemQkgyB2JmyP-LgP74Ruf4fLs", "Bacteriology.pdf"),
    ("1EFR0Xh1Jopj3a1LZwl4YSiRBvX_1s6TH", "bio lect 1st.pdf"),
    ("1m-OUks9fWe-duEcZ0bqAqGSIJb4iZGAY", "Bioinspired Design.pptx"),
    ("1xmhjYvjhlrPBNb2N8wfgnQzWLeF4WNTw", "Biology for Engineering.pptx"),
    ("1Szrfe6y4qk37H1IDHyF_tr3NZ-j762VK", "Biology Systems.pdf"),
    ("1FJp-hWdVxZSn6k9l7a4Umu0QFTjPEzRL", "Block_diagram_of_communication_system.pdf"),
    ("1YOnww5h39PBPdUqDsP-AQBsgRS4ScCje", "Block_diagram_of_communication_system.pdf"),
    ("1ymWIILXVVnS0lrkZNiMFQLpLHA6aa-6Y", "Breathing and respiration.pdf"),
    ("11Hq8dRITVmxutkJ2Mrx7lpFdXhMSysFn", "C - Handwritten notes by LUCKY.pdf"),
    ("1DMPY0bVC3LdndG0Crp2WEMBL5wMRdZUX", "CARDIOVASCULAR AND RESPIRATORY SYSTEM.pptx"),
    ("1bcLwQYL3rBRqSiw_Ipu_0buRcbgt6XuR", "Cardiovascular System.pptx"),
    ("1-BlCzgQzivTnnlT_kBvmHGraGLhq8N3", "Control of Micro-organisms.pptx"),
    ("1CW98DagNZUNYZubTDIxs4AEXrFwaqqO7", "DNA structure and Function.pdf"),
    ("1fYOeokOObYIMekZHqsn2jI2LZdpr0vmz", "DNA_Structure_and_Replication.pdf"),
    ("1mwz4p6v0OGXb6_cqWKKi0zHo-7hkoeQt", "EE Assignment 2 Solved.pdf"),
    ("1c7CES6aXHPxz65SgOuUSTaVTwuY6R1XT", "EE10510_L-1_Dr.SKS.pdf"),
    ("1_OogRSOG7n8FziPCXZSuAs-0ABh39ZDa", "EE10510_L-3_Unit 2_DrSKS.pdf"),
    ("1RUjq9uFNh1jDg1wfLbYPafi0EYMjKz19", "Electrical unit 2.pdf"),
    ("14wwdTZSwKLd7dvYE_luDtNt1JBC2PeJa", "ENZYMES.pptx"),
    ("1j-6xbVJbd9MGGLm7Vpyba6ksSnOnc8UM", "ET_UNIT_1.pdf"),
    ("1EqEB3EkYPbFrCisNszvHe2h34bj5HY4J", "Final.pptx"),           # skip — likely unrelated
    ("1HI8oSt6-qtHZPk53PZ50g1xKWZPOv44o", "FIRSTYEAR Practice SET.pdf"),
    ("1kjew28-0FCeo67O9sXgpjtFJA6HCwzZm", "functions_lab.pdf"),
    ("10pRto3p6f4z-9oQNxt3xDBs69WpvoiRn", "Fungi Structure & reproduction.pdf"),
    ("1x_W7JaPrtGWKNkZ20yNyZugJb-gcR7cN", "Half Adder and Full Adder.pdf"),
    ("1R_ZtW6mUBCO3_ExZvSw1xMoJm-2PUbS6", "history of civil engineering.pdf"),
    ("1Fw_wvpAomDV5JIHf2Pk-guHi_MTii7UL", "HOLIDAY ASSIGNMENT X.pdf"),  # skip
    ("1jk9VMfzgPEqdYK5Obm1YXabcwhsSc610", "Home Assignment Sem-B.pdf"),
    ("11idCVW1hj6__u9YF9tiDSujKLiDq_qU8", "HU10512 Languages for Engineers Assignment 1.docx"),
    ("1ILnDoJWlU1zzBcVMkfkv-UQWJLd5K-DG", "Identical distri permutations.pdf"),
    ("1gO62NrAj-v5bv-lUiRhvPo8yEwzo5x4Y", "INTRODUCTION TO CIVIL ENGINEERING.pdf"),
    ("19O7-wLKqRC638tR1gWmz79ohv7jtw6NL", "IP WORKSHOP MANUAL by LUCKY.pdf"),
    ("1CEQ1ujmlPCNfRmoIDnvTejqoGlFjUisR", "IT Assignment 7 & 8 ,9.pdf"),
    ("1-f0uyhgyJWuDL3o2tynBJOQL5KJ00Ct9", "IT10007mst2syllabus.pdf"),
    ("1r4Yvf47d7pNm42Qz74v_mmLVD6-BnBeJ", "L-10_DrSKS.pdf"),
    ("1yzePupvdb3exZXwngqDvhANW4hm7Hsic", "L-7_DrSKS_EE10510.pdf"),
    ("1-EU1chMhpcbwYLt1e-OUK7qvMsXKbzLj", "L-8_Dr.SKS.pdf"),
    ("10QkP66lpe1kXWcThCQiH8ehxJsdfRyGf", "L-9_DrSKS.pdf"),
    ("18tYov2vAelcoNlFCji2zY2-hTXSvkk41", "lecture on trusses.pdf"),
    ("18sx7owce9_eqBE4l_g099cejpJtDAJ-W", "Linguistics.pdf"),
    ("1ANG7eTUjibUorfIwtujOWdMLC415NPiJ", "lsrw notes 1st year.pdf"),
    ("1fzETxXowLM7cXqv0zgLcqcYZyXlTnB7v", "MA10021_Unit 1_Indian mathematicians (2).pdf"),
    ("13VhBpSqQr70DF-pkUfIWbJVBk55xtpn8", "Mathematics-II PYQs.pdf"),
    ("1H_r5RUJxyeGawr76-l_mB82NpFKT8pUt", "Maths assignment sol.pdf"),
    ("1y6sqVv8x6b-hncNOCYsvU2k8r78unkdh", "maths random variable.pdf"),
    ("1Ucb6xFG8ZesbNX-uYlZ_z-d2MsXTTvME", "maths-1.pdf"),
    ("11dvywMSDLHR_gOKV-tJvSj-XQVCbbNzA", "maths-2 pa.pdf"),
    ("1Ur-q5gvmmPnJ2mj6jnmkLHuaYHguE3Ft", "ME10008 Unit III Fluid Kinematics.pptx"),
    ("1CW5Pf5MK4AwJjGtYPFUSC6DF12RO-nzF", "Microbiology of Virus.pdf"),
    ("1gBrNYo5akCfJv5MxU3w7H7y8ub6Z_V32", "Microbiology-L2-Basic-structure-of-bacteria.pdf"),
    ("19tsSoOUHNb_lW8P7TF4rXhj5-rg6bJpn", "MST 2 solution MA 10021.pdf"),
    ("1IXQ3-HbfysptwZ-5xWvoH8eQ2r8m50ZH", "MST PYQ-1.pdf"),
    ("1PEqsZHtCQmwLQhFwc6_xPo4dDiwow2Z4", "MST PYQ.pdf"),
    ("1fA2a_q5K8D3oB8tK6VEVsHMg7pN3fXLJ", "MST3 ME10008 SOLUTION.pdf"),
    ("1bNG8UdO8S_NMF4JqFiZvYwKEq-LVsDCd", "Nervous System 1.ppt"),
    ("1V_O7JJn7Cj8eFd5S0j9lrSxAkFpCqR2X", "Nervous system 2.pptx"),
    ("17nJLNFG3xMiZfO8Ua-Lsqb6YBMA-cHvP", "PH10009-QC.pdf"),
    ("1ByQnpBnn1Vd-zEM2T05t1wcXDT0xPCye", "PlugMitra_SIH2026.pdf"),          # skip
    ("1yObzZnfoO1iy1PlUAQTgrSbf6gTGRa00", "PlugMitra_SIH2026.pptx"),         # skip
    ("1YxCk_WXRPNYlxIxWD3epSHwOgrhWqLKG", "PlugMitra_SIH2026_FINAL.pdf"),    # skip
    ("1hpRy94PNtteQ1HyKVU4vZAewNM9fGLvg", "PlugMitra_SIH2026_FINAL.pptx"),   # skip
    ("1fp17rdFryh2n5CVs6KQ4EiEpsXw1vAHF", "Practice Sheet 01 Orthographic Projections.pdf"),
    ("1ByQnpBnn1Vd-zEM2T05t1wcXDT0xPCye", "Practice Sheet 2.pdf"),
    ("1YxCk_WXRPNYlxIxWD3epSHwOgrhWqLKG", "practise sheet 1 1st year.pdf"),
    ("1PEqsZHtCQmwLQhFwc6_xPo4dDiwow2Z4", "Project Report Sample Document.pdf"),
    ("1IXQ3-HbfysptwZ-5xWvoH8eQ2r8m50ZH", "QUIZ-2 ELECTRICITY.pdf"),
    ("1CvoRRdPx2pXjL-7dHUAFs9bf7GMmuVnV", "RECOMBINANT DNA TECHNOLOGY.pdf"),
    ("1L4xfg7uR8FNmkIBzG12W_mFmA6Tr54Fo", "Sem1MST1.pdf"),
    ("16cyGt9i1JHNyawKRtjOPOET76hrtaU2v", "SEM1MST2.pdf"),
    ("107q74k-DdlFQB0sNlsWhqowNRsSr9o1Q", "Sem2MST1.pdf"),
    ("1sZhpSOPQ8m4AlM9tnSN81z7Rt38XsJJD", "Sheet No. 06 Isometric Projection.pdf"),
    ("1E8I7ZRXrklXNVMTxCrmwOQ6UDr1KK_8C", "Solution MST 1 MA10021.pdf"),
    ("1RaHI2oQ_nx5_WwQrfPJ1-GrCJ06jiGjz", "SQ3R Method Notes BTech 1st year.pdf"),
    ("1yObzZnfoO1iy1PlUAQTgrSbf6gTGRa00", "Structure and Function of Biomolecules.pptx"),
    ("1YxCk_WXRPNYlxIxWD3epSHwOgrhWqLKG", "Support Material Acid Base Indicators.pdf"),
    ("1hpRy94PNtteQ1HyKVU4vZAewNM9fGLvg", "Surveying Volume 1 by SK Duggal.pdf"),
    ("1fp17rdFryh2n5CVs6KQ4EiEpsXw1vAHF", "Tissue Engineering and organ system_1.pptx"),
    ("1ByQnpBnn1Vd-zEM2T05t1wcXDT0xPCye", "Tissue Engineering and Organ systems_2.pptx"),
    ("1YxCk_WXRPNYlxIxWD3epSHwOgrhWqLKG", "Tissue_Engineering_and_Organ_Systems_3.pptx"),
    ("1PEqsZHtCQmwLQhFwc6_xPo4dDiwow2Z4", "Tutorial problems Unit-1 DC Circuits EE10510.pdf"),
    ("1IXQ3-HbfysptwZ-5xWvoH8eQ2r8m50ZH", "UNDERSTANDING BHARAT.pdf"),
    ("1CvoRRdPx2pXjL-7dHUAFs9bf7GMmuVnV", "Unit - 1 Question.docx"),
    ("1L4xfg7uR8FNmkIBzG12W_mFmA6Tr54Fo", "Unit - 2 Question.docx"),
    ("16cyGt9i1JHNyawKRtjOPOET76hrtaU2v", "Unit 1 - Voltage & Current.pdf"),
    ("107q74k-DdlFQB0sNlsWhqowNRsSr9o1Q", "UNIT 1 FEEE.pdf"),
    ("1v7pwOVidKHuqf4tlrw1CML45_Zr_UJDO", "UNIT 2 FEEE.pdf"),
    ("1DaBHJSa3nUkm7fDx6mNGlN857yrsutwv", "UNIT 4 FEEE.pdf"),
    ("19e3Hfj9nbLa17AlbzHJMrD9S36gBMhVJ", "UNIT 5 FEEE.pdf"),
    ("1g-Y7Lo4RlpLy8daCRNrDghwrBXiJmSYf", "Unit-5-Introduction to Data Tools.pdf"),
    ("14H7LuEV-xqK7K-Q9GPNoWfKH5Y1tXxXZ", "Unit-I-PartA By Abhijay Upadhyay.pdf"),
    ("1xxMT35WjqyKndgCOG6l5rrDxYmX5Yyzq", "Unit-III Magnetic Ckt L1+L2.pdf"),
    ("1sogL6pTf8VzMMFf-xoIJAzlaGAvwaTSX", "Water notes.pdf"),
    ("12q9i9X6zfBOKqjg6F-ztG2iCkXITrceV", "welding shop.pdf"),
]


def already_in_uploads(filename: str) -> bool:
    """Check if a file with this name already exists anywhere in private-uploads/."""
    base = os.path.basename(filename)
    for folder in os.listdir(PRIVATE_UPLOADS):
        if folder == "_archived-duplicates":
            continue
        fpath = os.path.join(PRIVATE_UPLOADS, folder, base)
        if os.path.exists(fpath):
            return True
    return False


def download_individual(file_id: str, filename: str, results: list) -> bool:
    """Download a single file by ID, place in correct private-uploads subfolder."""
    if should_skip(filename):
        print(f"  SKIP (not notes): {filename}")
        return False

    ext = os.path.splitext(filename)[1].lower()
    if ext not in SUPPORTED_EXTS:
        print(f"  SKIP (unsupported ext): {filename}")
        return False

    # Clean up filename (remove special chars that cause issues)
    safe_filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", filename).strip()

    folder = classify_folder(safe_filename)
    dest_dir = os.path.join(PRIVATE_UPLOADS, folder)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, safe_filename)

    if os.path.exists(dest_path):
        print(f"  SKIP (already exists): {folder}/{safe_filename}")
        results.append(("skipped", folder, safe_filename))
        return True

    url = f"https://drive.google.com/uc?id={file_id}"
    print(f"  ↓  {folder}/{safe_filename} ...", end="", flush=True)
    try:
        out = gdown.download(url, dest_path, quiet=True)
        if out and os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
            kb = os.path.getsize(dest_path) // 1024
            print(f" {kb} KB ✓")
            results.append(("downloaded", folder, safe_filename))
            return True
        else:
            print(" FAILED (empty or not downloaded)")
            if os.path.exists(dest_path):
                os.remove(dest_path)
            return False
    except Exception as e:
        print(f" ERROR: {e}")
        if os.path.exists(dest_path):
            os.remove(dest_path)
        return False


def write_manifest(results: list[tuple[str, str, str]]) -> None:
    lines = ["status\tfolder\tlocal_filename"]
    for status, folder, fname in results:
        lines.append(f"{status}\t{folder}\t{fname}")
    with open(MANIFEST_OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    print(f"\nManifest written → {MANIFEST_OUT}")


def main() -> None:
    results: list[tuple[str, str, str]] = []

    # ── Step 1: move already-downloaded files from _drive_tmp_new ────────────
    if os.path.isdir(TMP_DIR) and os.listdir(TMP_DIR):
        print(f"\n── Step 1: Moving {len(os.listdir(TMP_DIR))} files from _drive_tmp_new ──")
        move_from_tmp(results)
        try:
            shutil.rmtree(TMP_DIR, ignore_errors=True)
        except Exception:
            pass
    else:
        print("\n── Step 1: No files in _drive_tmp_new (already moved) ──")

    # ── Step 2: download remaining files individually ─────────────────────────
    print(f"\n── Step 2: Downloading {len(DRIVE_FILES)} files individually ──")
    ok = fail = skip = 0
    seen_ids: set[str] = set()

    for file_id, filename in DRIVE_FILES:
        # De-duplicate by file_id
        if file_id in seen_ids:
            continue
        seen_ids.add(file_id)

        # Skip if already in private-uploads
        safe_filename = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", filename).strip()
        if already_in_uploads(safe_filename):
            folder = classify_folder(safe_filename)
            print(f"  SKIP (in uploads):  {folder}/{safe_filename}")
            results.append(("existing", folder, safe_filename))
            skip += 1
            continue

        success = download_individual(file_id, filename, results)
        if should_skip(filename) or os.path.splitext(filename)[1].lower() not in SUPPORTED_EXTS:
            skip += 1
        elif success:
            ok += 1
        else:
            fail += 1
        time.sleep(0.3)  # brief pause to avoid rate limiting

    write_manifest(results)

    from collections import Counter
    counts = Counter(folder for _, folder, _ in results)
    print("\n── Files by subject folder ──")
    for folder, n in sorted(counts.items()):
        print(f"  {folder:<25} {n}")

    print(f"\n── Done ──")
    print(f"  Moved from tmp : {sum(1 for s,_,_ in results if s=='moved')}")
    print(f"  Downloaded     : {ok}")
    print(f"  Already existed: {skip}")
    print(f"  Failed         : {fail}")
    print(f"\nNext: npx ts-node scripts/import-drive-new.ts --dry")


if __name__ == "__main__":
    main()
