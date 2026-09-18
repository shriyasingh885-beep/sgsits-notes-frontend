import os
import sys
import json
import subprocess
import time
import google.generativeai as genai

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERAL_DIR = os.path.join(ROOT, "private-uploads", "general")

# Load .env
env_path = os.path.join(ROOT, ".env")
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if "=" in line and not line.startswith("#"):
                k, v = line.strip().split("=", 1)
                os.environ[k] = v.strip('"\'')

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

SUBJECTS = {
    "MA10021": "mathematics",
    "MA10509": "mathematics",
    "PH10009": "physics",
    "CH10010": "chemistry",
    "EE10510": "electronics",
    "IT10007": "programming",
    "ME10008": "mechanical-workshop",
    "CE10513": "civil",
    "HU10512": "languages",
    "PY10514": "general",
    "HU10181": "languages",
    "IP10584": "mechanical-workshop",
}

PROMPT = """
You are an expert university document classifier.
Examine this document (it might be a scanned PDF or a text document).
Determine which of the following subjects it best belongs to:

- MA10021 (Mathematics for Engineers)
- MA10509 (Mathematics for Data Science)
- PH10009 (Applied Physics)
- CH10010 (Applied Chemistry)
- EE10510 (Fundamentals of Electrical & Electronics Engg.)
- IT10007 (Fundamentals of IT & Artificial Intelligence - e.g. C Programming, AI, Hardware)
- ME10008 (Overview of Mechanical Engineering & Graphics)
- CE10513 (Overview of Civil Engineering)
- HU10512 (Languages for Engineers - e.g. English, Communication, Business Letters)
- PY10514 (Biology for Engineers)
- HU10181 (Understanding Bharat)
- IP10584 (Design Thinking & Manufacturing Practices - e.g. Welding, Carpentry)

Also, propose a beautiful, descriptive filename (without spaces, use underscores, ending in .pdf or .docx).
Return ONLY a JSON object in this format:
{
  "subject_code": "IT10007",
  "new_name": "C_Programming_Array_Assignment.pdf",
  "reason": "Contains C code for arrays."
}
If it doesn't fit ANY subject or is complete junk, use "UNKNOWN" as the subject_code.
"""

def get_skipped_files():
    print("Getting list of skipped files...")
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
    print(f"Found {len(files)} files to process via Gemini Vision.")

    model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})

    for filename in files:
        filepath = os.path.join(GENERAL_DIR, filename)
        if not os.path.exists(filepath):
            continue

        print(f"\nProcessing {filename}...")
        
        # We upload the file to Gemini API
        uploaded_file = None
        try:
            print("  Uploading to Gemini...")
            uploaded_file = genai.upload_file(path=filepath, display_name=filename)
            
            # Wait for processing if it's a large PDF
            while uploaded_file.state.name == "PROCESSING":
                print("  Processing...")
                time.sleep(2)
                uploaded_file = genai.get_file(uploaded_file.name)
                
            if uploaded_file.state.name == "FAILED":
                print("  File processing failed.")
                continue

            print("  Analyzing content...")
            response = model.generate_content([uploaded_file, PROMPT])
            
            res_json = json.loads(response.text)
            code = res_json.get("subject_code")
            new_name = res_json.get("new_name")
            reason = res_json.get("reason")
            
            print(f"  Result: {code} | {new_name}")
            print(f"  Reason: {reason}")
            
            if code in SUBJECTS and new_name:
                # Move and rename
                target_folder = SUBJECTS[code]
                target_dir = os.path.join(ROOT, "private-uploads", target_folder)
                
                # Keep original extension
                ext = os.path.splitext(filename)[1]
                new_name = os.path.splitext(new_name)[0] + ext
                
                new_path = os.path.join(target_dir, new_name)
                
                import shutil
                shutil.move(filepath, new_path)
                print(f"  --> Moved to {target_folder}/{new_name}")
            else:
                print("  --> Left in general folder (UNKNOWN).")

        except Exception as e:
            print(f"  Error: {e}")
        finally:
            if uploaded_file:
                genai.delete_file(uploaded_file.name)

    print("\nAll done! Next: npx tsx scripts/import-drive-new.ts")

if __name__ == "__main__":
    main()
