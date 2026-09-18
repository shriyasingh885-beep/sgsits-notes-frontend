import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GENERAL_DIR = os.path.join(ROOT, "private-uploads", "general")

MAP = {
    "Block_diagram_of_communication_system.pdf": ("electronics", "EE10510_Block_Diagram_Communication.pdf"),
    "camscanner-1905084940.pdf": ("languages", "HU10512_Routine_Business_Letters.pdf"),
    "camscanner-2405132557.pdf": ("languages", "HU10512_Cover_Letter_Example.pdf"),
    "camscanner-2405132920.pdf": ("languages", "HU10512_Letter_Writing_Technical_Communication.pdf"),
    "camscanner-2705070337.pdf": ("languages", "HU10512_Resume_Writing_Notes.pdf"),
    "Control of Micro-organisms.pptx": ("general", "PY10514_Control_of_Microorganisms.pptx"),
    "divyanshu-ab-19063.pdf": ("languages", "HU10512_English_Lab_Manual.pdf"),
    "endsem-2015-19-compilation.pdf": ("programming", "IT10007_EndSem_2015_2019_Compilation.pdf"),
    "endsem-2022-paper1.pdf": ("electronics", "EE10510_EndSem_2022_Paper1.pdf"),
    "endsem-2022-paper2.pdf": ("chemistry", "CH10010_EndSem_2022_Paper2.pdf"),
    "ET_UNIT_1.pdf": ("electronics", "EE10510_Electrical_Technology_Unit_1.pdf"),
    "FIRSTYEAR Practice SET.docx (1).pdf": ("electronics", "EE10510_Practice_Set_1.pdf"),
    "Home Assignment- 1 Sem - B (Branch IT IP ME EI).pdf": ("chemistry", "CH10010_Home_Assignment_1.pdf"),
    "lab-manual-unlabeled.pdf": ("languages", "HU10512_Language_Lab_Manual.pdf"),
    "MST PYQ-1.pdf": ("electronics", "EE10510_MST_PYQ_1.pdf"),
    "MST PYQ.pdf": ("electronics", "EE10510_MST_PYQ.pdf"),
    "paper.pdf": ("civil", "CE10513_GATE_Civil_Paper.pdf"),
    "Practice Sheet 2.pdf": ("electronics", "EE10510_Practice_Sheet_2.pdf"),
    "practise sheet 1 1st year.pdf": ("electronics", "EE10510_Practice_Sheet_1.pdf"),
    "scan-2.pdf": ("programming", "IT10007_C_Array_Assignment.pdf"),
    "scan-3.pdf": ("programming", "IT10007_C_String_Assignment.pdf"),
    "scan-4.pdf": ("programming", "IT10007_C_Recursion_Assignment.pdf"),
    "scan-5.pdf": ("programming", "IT10007_C_Structure_Assignment.pdf"),
    "scan-5-alt.pdf": ("languages", "HU10512_Technical_Report_Cryptocurrency.pdf"),
    "sem2-syllabus.pdf": ("mathematics", "MA10509_Maths_2_Syllabus.pdf"),
    "semA-syllabus.pdf": ("programming", "IT10007_Syllabus.pdf"),
    "syllabus-2nd-sem.pdf": ("mechanical-workshop", "ME10008_Engineering_Graphics_Syllabus.pdf"),
    "Unit-5-Introduction to Data Tools.pdf": ("mathematics", "MA10509_Unit_5_Data_Tools.pdf"),
    "Unit-I-PartA- By Abhijay Upadhyay😎.pdf": ("mathematics", "MA10509_Unit_1_Indian_Mathematicians.pdf"),
    "unlabeled-doc-1.docx": ("civil", "CE10513_Classification_of_Surveying.docx")
}

def main():
    moved = 0
    for old_name, (folder, new_name) in MAP.items():
        old_path = os.path.join(GENERAL_DIR, old_name)
        if os.path.exists(old_path):
            new_dir = os.path.join(ROOT, "private-uploads", folder)
            new_path = os.path.join(new_dir, new_name)
            try:
                shutil.move(old_path, new_path)
                print(f"Moved {old_name} -> {folder}/{new_name}")
                moved += 1
            except Exception as e:
                print(f"Failed to move {old_name}: {e}")
        else:
            print(f"Skipping {old_name} (not found)")

    # Also delete the junk files
    junk = ["e-books.pdf", "sgsits-papers.pdf", "sgsits-syllabus-btech-1st-year-2025.pdf", "Final.pptx", "adobe-scan-2022.pdf"]
    for j in junk:
        p = os.path.join(GENERAL_DIR, j)
        if os.path.exists(p):
            os.remove(p)
            print(f"Deleted junk: {j}")

    print(f"\nDone! Moved {moved} files to their correct subject folders.")

if __name__ == "__main__":
    main()
