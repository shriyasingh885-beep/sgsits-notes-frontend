import os
import sys
import json
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import lib_extract

GENERAL_DIR = os.path.join(ROOT, "private-uploads", "general")

def get_skipped_files():
    out = subprocess.check_output(
        ["npx", "tsx", os.path.join(ROOT, "scripts", "list-skipped.ts")], 
        text=True, encoding="utf-8", errors="ignore", shell=True
    )
    files_to_process = []
    for line in out.splitlines():
        line = line.strip()
        if line.startswith("- general/"):
            files_to_process.append(line.replace("- general/", "").strip())
    return files_to_process

def main():
    files = get_skipped_files()
    results = {}
    
    for filename in files:
        filepath = os.path.join(GENERAL_DIR, filename)
        if not os.path.exists(filepath):
            continue
        try:
            extraction = lib_extract.extract_any(filepath)
            # take first 400 characters, remove newlines
            text = extraction.text[:400].replace('\n', ' ')
            results[filename] = text
        except Exception as e:
            results[filename] = f"ERROR: {e}"
            
    with open("scripts/previews.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
