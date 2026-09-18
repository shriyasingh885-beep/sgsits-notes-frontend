"""
Phase 2 — AI-based Classification for the 51 Unclassified "General" files.

This script uses the existing `lib_extract.py` and `lib_classify.py`
to actually look inside the PDFs (extract text), classify them by their content,
move them to the correct folder, and rename them.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import json
import sqlite3
import sys

# We will just write a custom script since we need to extract and classify directly.
# Wait, let's use the Python standard library and the existing lib_extract.py if we can.

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))

try:
    import lib_extract
    import lib_classify
except ImportError:
    print("Could not import lib_extract or lib_classify.")
    sys.exit(1)

GENERAL_DIR = os.path.join(ROOT, "private-uploads", "general")

# We need the subjects list to pass to the classifier
class Subject:
    def __init__(self, id, code, name):
        self.id = id
        self.code = code
        self.name = name

SUBJECTS = [
    Subject("ma10021", "MA10021", "Mathematics for Engineers"),
    Subject("ma10509", "MA10509", "Mathematics for Data Science"),
    Subject("ph10009", "PH10009", "Applied Physics"),
    Subject("ch10010", "CH10010", "Applied Chemistry"),
    Subject("ee10510", "EE10510", "Fundamentals of Electrical & Electronics Engg."),
    Subject("it10007", "IT10007", "Fundamentals of IT & Artificial Intelligence"),
    Subject("me10008", "ME10008", "Overview of Mechanical Engineering & Graphics"),
    Subject("ce10513", "CE10513", "Overview of Civil Engineering"),
    Subject("hu10512", "HU10512", "Languages for Engineers"),
    Subject("py10514", "PY10514", "Biology for Engineers"),
    Subject("hu10181", "HU10181", "Understanding Bharat"),
    Subject("ip10584", "IP10584", "Design Thinking & Manufacturing Practices"),
]

CODE_TO_FOLDER = {
    "MA10021": "mathematics",
    "MA10509": "mathematics",
    "PH10009": "physics",
    "CH10010": "chemistry",
    "EE10510": "electronics",
    "IT10007": "programming",
    "ME10008": "mechanical-workshop",
    "CE10513": "civil",
    "HU10512": "languages",
    "PY10514": "general", # we use general for biology in this setup based on earlier scripts
    "HU10181": "languages",
    "IP10584": "mechanical-workshop",
}

def load_env():
    env_path = os.path.join(ROOT, ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    k, v = line.strip().split("=", 1)
                    os.environ[k] = v.strip('"\'')
load_env()

def main():
    files_to_process = [
        "adobe-scan-2022.pdf",
        "Assignment 1 MA 10021 (1).pdf",
        "Assignment 1_unit 2.pdf",
        "Assignment 2 MA 10021.pdf",
        "ASSIGNMENT 4 final.docx",
        "Assignment unit 3.pdf",
        "Assignment-I,MA- 10509.pdf",
        "Assignment.pdf",
        "ASSINGMENT 2 UNIT 5.pdf",
        "ASSINMENT 1 UNIT 4.pdf",
        "Bacteriology.pdf",
        "bio lect 1st.pdf",
        "Bioinspired Design.pptx",
        "Block_diagram_of_communication_system.pdf",
        "camscanner-1905084940.pdf",
        "camscanner-2405132557.pdf",
        "camscanner-2405132920.pdf",
        "camscanner-2705070337.pdf",
        "Control of Micro-organisms.pptx",
        "divyanshu-ab-19063.pdf",
        "e-books.pdf",
        "EE Assignment 2 Solved .pdf",
        "ee10510-assignment.pdf",
        "endsem-2015-19-compilation.pdf",
        "endsem-2022-paper1.pdf",
        "endsem-2022-paper2.pdf",
        "ET_UNIT_1.pdf",
        "Final.pptx",
        "FIRSTYEAR Practice SET.docx (1).pdf",
        "Home Assignment- 1 Sem - B (Branch IT IP ME EI).pdf",
        "IT Assignment 7 & 8 ,9.pdf",
        "lab-manual-unlabeled.pdf",
        "MST PYQ-1.pdf",
        "MST PYQ.pdf",
        "paper.pdf",
        "Practice Sheet 01 (Orthrographic Projections)-1.pdf",
        "Practice Sheet 2.pdf",
        "practise sheet 1 1st year.pdf",
        "scan-2.pdf",
        "scan-3.pdf",
        "scan-4.pdf",
        "scan-5-alt.pdf",
        "scan-5.pdf",
        "sem2-syllabus.pdf",
        "semA-syllabus.pdf",
        "sgsits-papers.pdf",
        "sgsits-syllabus-btech-1st-year-2025.pdf",
        "syllabus-2nd-sem.pdf",
        "Unit-5-Introduction to Data Tools.pdf",
        "Unit-I-PartA- By Abhijay Upadhyay😎.pdf",
        "unlabeled-doc-1.docx"
    ]
    print(f"Found {len(files_to_process)} orphaned files in general/")

    results = []
    
    for filename in files_to_process:
        filepath = os.path.join(GENERAL_DIR, filename)
        if not os.path.exists(filepath):
            continue
        
        # 1. Extract text
        print(f"\nExtracting text from: {filename}...")
        try:
            extraction = lib_extract.extract_any(filepath)
            text = extraction.text[:5000] # Take first 5000 chars for classification
        except Exception as e:
            print(f"  Extraction failed: {e}")
            text = ""

        # 2. Classify
        ext = os.path.splitext(filename)[1].lower().replace(".", "")
        if ext == "ppt": ext = "pptx"
        
        print("  Classifying...")
        try:
            # The classify function expects these kwargs
            proposal = lib_classify.classify(
                resource_id="tmp",
                file_url=f"/api/files/general/{filename}",
                original_filename=filename,
                filetype=ext.upper(),
                text=text,
                text_source="pdf",
                current_title=filename,
                current_type="NOTES",
                current_subject_code="",
                folder="general",
                subjects=SUBJECTS,
                category_default_subject="GN00001"
            )
            
            # Print the result
            print(f"  Result -> {proposal.subject_code} | {proposal.document_type} | {proposal.suggested_title}")
            
            # If we found a valid subject, move it!
            if proposal.subject_code in CODE_TO_FOLDER:
                target_folder = CODE_TO_FOLDER[proposal.subject_code]
                if target_folder == "general":
                    # If it belongs in general but we don't have a GN00001 subject in DB, it will fail again.
                    # Wait, PY10514 is Biology, we mapped it to general earlier, but the DB script didn't like it.
                    # The DB script import-drive-new.ts maps PY10514 to the DB subject.
                    pass 
                
                target_dir = os.path.join(ROOT, "private-uploads", target_folder)
                os.makedirs(target_dir, exist_ok=True)
                
                # rename it to a clean name
                clean_name = proposal.suggested_filename
                target_path = os.path.join(target_dir, clean_name)
                
                shutil.move(filepath, target_path)
                print(f"  Moved to {target_folder}/{clean_name}")
                results.append((filename, target_folder, clean_name))
            else:
                print(f"  No valid subject code found ({proposal.subject_code}). Leaving in general/.")
                
        except Exception as e:
            print(f"  Classification failed: {e}")

if __name__ == "__main__":
    main()
