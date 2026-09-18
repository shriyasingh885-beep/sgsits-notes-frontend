import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERAL_DIR = os.path.join(ROOT, "private-uploads", "general")

MOVES = {
    "Assignment 1 MA 10021 (1).pdf": "mathematics",
    "Assignment-I,MA- 10509.pdf": "mathematics",
    "EE Assignment 2 Solved .pdf": "electronics",
    "ee10510-assignment.pdf": "electronics",
    "bio lect 1st.pdf": "general", # Biology is mapped to general/ PY10514 in this repo's structure
    "Bacteriology.pdf": "general",
    "IT Assignment 7 & 8 ,9.pdf": "programming",
    "Practice Sheet 01 (Orthrographic Projections)-1.pdf": "mechanical-workshop"
}

# The DB import script handles mapping the folders to DB subjects, 
# but biology is mapped to PY10514 even if it's in general, 
# as long as we rename the files to have biology in the name or the DB script detects it.
# Actually, let's just make the DB script handle them. The DB script uses the filename.
# So I'll rename them slightly so the DB script catches them!

RENAMES = {
    "Assignment 1 MA 10021 (1).pdf": ("mathematics", "MA10021_Assignment_1.pdf"),
    "Assignment-I,MA- 10509.pdf": ("mathematics", "MA10509_Assignment_1.pdf"),
    "EE Assignment 2 Solved .pdf": ("electronics", "EE10510_Assignment_2.pdf"),
    "ee10510-assignment.pdf": ("electronics", "EE10510_Assignment.pdf"),
    "bio lect 1st.pdf": ("general", "biology_lect_1st.pdf"),
    "Bacteriology.pdf": ("general", "biology_Bacteriology.pdf"),
    "IT Assignment 7 & 8 ,9.pdf": ("programming", "IT10007_Assignment.pdf"),
    "Practice Sheet 01 (Orthrographic Projections)-1.pdf": ("mechanical-workshop", "ME10008_Practice_Sheet.pdf")
}

for old_name, (folder, new_name) in RENAMES.items():
    old_path = os.path.join(GENERAL_DIR, old_name)
    if os.path.exists(old_path):
        new_dir = os.path.join(ROOT, "private-uploads", folder)
        new_path = os.path.join(new_dir, new_name)
        shutil.move(old_path, new_path)
        print(f"Moved {old_name} -> {folder}/{new_name}")

print("Done moving known files.")
