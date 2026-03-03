import sys
import os
from pypdf import PdfReader

def read_pdfs():
    dir_path = '../'
    files = [f for f in os.listdir(dir_path) if f.endswith('.pdf')]
    for f in files:
        print(f"\n\n--- CONTENT OF {f} ---")
        try:
            reader = PdfReader(os.path.join(dir_path, f))
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            print(text)
        except Exception as e:
            print(f"Error reading {f}: {e}")

if __name__ == '__main__':
    read_pdfs()
