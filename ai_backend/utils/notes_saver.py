"""
utils/notes_saver.py
--------------------
Saves extracted page notes to a markdown file on disk.
Pure file utility — no API calls, no LangChain.
"""

from pathlib import Path


def save(pages: dict[int, str], pdf_path: str) -> str:
    """
    Write all extracted page notes to a .md file.

    Args:
        pages:    dict of page_number → markdown text
        pdf_path: original PDF path (output file placed alongside it)

    Returns:
        path to the saved .md file as a string
    """
    out_path = Path(pdf_path).with_suffix(".md")

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(f"# Notes: {Path(pdf_path).stem}\n")
        for page_num, content in sorted(pages.items()):
            f.write(f"\n\n---\n## Page {page_num}\n\n{content}\n")

    print(f"[notes_saver] Full notes saved → {out_path}")
    return str(out_path)