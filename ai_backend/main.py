"""
main.py — CLI entry point
Uses the same services as the API so behaviour is identical.

Usage:
    python main.py ingest <file.pdf>
    python main.py ingest <file.pdf> --batch-size 3
    python main.py ask "<question>"
    python main.py notes
    python main.py notes "<topic>"
    python main.py exam GATE "Data Structures" "Sorting Algorithms"
    python main.py count
    python main.py clear
"""

import sys
from services.ingest_service import run as ingest_run
from services import vector_store, generator
import config

HELP = """
Handwritten Notes RAG System
─────────────────────────────────────────────────────
  python main.py ingest <file.pdf>                    index a PDF
  python main.py ingest <file.pdf> --batch-size 3     with custom batch size

  python main.py ask "<question>"                     ask a question (both modes)

  python main.py notes                                general Topper's Notes (free)
  python main.py notes "<topic>"                      focused on a topic (free)

  python main.py exam <EXAM> "<subject>" "<chapter>"  exam-specific notes (premium)
    e.g. python main.py exam GATE "Data Structures" "Sorting Algorithms"
    e.g. python main.py exam NEET "Biology" "Cell Division"
    e.g. python main.py exam UPSC "History" "Mughal Empire"
    e.g. python main.py exam JEE "Physics" "Thermodynamics"

  python main.py count                                number of indexed chunks
  python main.py clear                                delete all indexed data
"""


def _print_block(block):
    """Pretty-print a single block."""
    t = block.type

    if t == "concept":
        print(f"\n[Concept]  {block.heading}")
        print("-" * 40)
        print(f"  {block.explanation}")

    elif t == "keypoints":
        print(f"\n[Key Points]  {block.heading}")
        print("-" * 40)
        for kp in block.points:
            print(f"  * {kp.point}")
            print(f"    {kp.note}")

    elif t == "flowchart":
        print(f"\n[Flowchart]  {block.heading}")
        print("-" * 40)
        for i, step in enumerate(block.steps):
            prefix = "  " if i == 0 else "   |\n   v\n  "
            desc   = f" -- {step.description}" if step.description else ""
            print(f"{prefix}{step.label}{desc}")

    elif t == "table":
        print(f"\n[Table]  {block.heading}")
        print("-" * 40)
        col_w = 22
        print("  " + "  ".join(h.ljust(col_w) for h in block.headers))
        print("  " + "-" * (len(block.headers) * (col_w + 2)))
        for row in block.rows:
            print("  " + "  ".join(str(c).ljust(col_w) for c in row))

    elif t == "mindmap":
        print(f"\n[Mind Map]  {block.heading}")
        print("-" * 40)
        print(f"  {block.root}")
        for branch in block.branches:
            print(f"  +-- {branch.label}")
            for child in branch.children:
                child_label = child.label if hasattr(child, "label") else str(child)
                print(f"  |    -- {child_label}")

    elif t == "formula":
        print(f"\n[Formula]  {block.heading}")
        print("-" * 40)
        print(f"  {block.formula}")
        print(f"  Meaning: {block.meaning}")
        if block.example:
            print(f"  Example: {block.example}")

    elif t == "callout":
        icons = {
            "exam_tip":  "[EXAM TIP]",
            "warning":   "[WARNING]",
            "important": "[IMPORTANT]",
            "tip":       "[TIP]",
        }
        tag = icons.get(block.variant, "[NOTE]")
        print(f"\n{tag}")
        print("-" * 40)
        print(f"  {block.text}")


def _print_notes(notes):
    """Print a TopperNotes object: overview + all topics + their blocks."""
    print("\nOverview")
    print("-" * 40)
    print(notes.overview)

    for topic in notes.topics:
        print(f"\n{'━' * 52}")
        print(f"  Topic: {topic.topic}")
        print(f"{'━' * 52}")
        for block in topic.blocks:
            _print_block(block)

    print()


def cmd_ingest(args: list):
    if not args:
        print("Usage: python main.py ingest <path/to/file.pdf> [--batch-size N]")
        return

    pdf_path   = args[0]
    batch_size = config.BATCH_SIZE

    if "--batch-size" in args:
        idx = args.index("--batch-size")
        try:
            batch_size = int(args[idx + 1])
            if not 1 <= batch_size <= 5:
                print("batch-size must be between 1 and 5")
                return
        except (IndexError, ValueError):
            print("Usage: --batch-size <number>")
            return

    try:
        ingest_run(pdf_path, batch_size=batch_size)
    except FileNotFoundError as e:
        print(f"Error: {e}")
    except ValueError as e:
        print(f"Error: {e}")


def cmd_ask(question: str):
    if not question.strip():
        print('Usage: python main.py ask "<your question>"')
        return
    if vector_store.count() == 0:
        print("No notes indexed. Run: python main.py ingest <file.pdf>")
        return

    print(f"\nQuestion: {question}\n")
    chunks = vector_store.retrieve(question)
    print(f"Answer:\n{generator.answer(question, chunks)}")
    print("\nSources:")
    for c in chunks:
        print(f"  - {c['source']} | page {c['page']} | relevance {c['relevance']}%")


def cmd_notes(topic: str = None):
    """FREE MODE — general Topper's Notes."""
    if vector_store.count() == 0:
        print("No notes indexed. Run: python main.py ingest <file.pdf>")
        return

    search_query = topic if topic else "main topics key concepts definitions formulas"
    chunks = vector_store.retrieve(search_query, top_k=8)
    notes  = generator.short_notes(chunks, topic=topic)

    print(f"\n{'='*52}")
    print(f"  TOPPER'S NOTES  —  {notes.title}")
    print(f"  (Free Mode)")
    print(f"{'='*52}")
    _print_notes(notes)


def cmd_exam(args: list):
    """EXAM MODE (Premium) — exam-specific Topper's Notes."""
    if len(args) < 3:
        print('Usage: python main.py exam <EXAM> "<subject>" "<chapter>"')
        print('  e.g. python main.py exam GATE "Data Structures" "Sorting Algorithms"')
        return

    if vector_store.count() == 0:
        print("No notes indexed. Run: python main.py ingest <file.pdf>")
        return

    exam_name = args[0].upper()
    subject   = args[1]
    chapter   = args[2]

    search_query = f"{chapter} {subject} {exam_name} key concepts formulas"
    chunks = vector_store.retrieve(search_query, top_k=10)
    notes  = generator.exam_notes(chunks, exam=exam_name, subject=subject, chapter=chapter)

    print(f"\n{'='*52}")
    print(f"  TOPPER'S NOTES  —  {notes.title}")
    print(f"  Exam: {exam_name}  |  Subject: {subject}  |  Chapter: {chapter}")
    print(f"{'='*52}")
    _print_notes(notes)


def cmd_count():
    print(f"{vector_store.count()} chunk(s) currently indexed.")


def cmd_clear():
    confirm = input("Delete ALL indexed notes? Type 'yes' to confirm: ")
    if confirm.strip().lower() == "yes":
        vector_store.clear()
        print("Cleared.")
    else:
        print("Cancelled.")


def main():
    args = sys.argv[1:]

    if not args or args[0] in ("-h", "--help", "help"):
        print(HELP)
    elif args[0] == "ingest":
        cmd_ingest(args[1:])
    elif args[0] == "ask":
        if len(args) < 2:
            print('Usage: python main.py ask "<question>"')
        else:
            cmd_ask(" ".join(args[1:]))
    elif args[0] == "notes":
        topic = " ".join(args[1:]) if len(args) > 1 else None
        cmd_notes(topic)
    elif args[0] == "exam":
        cmd_exam(args[1:])
    elif args[0] == "count":
        cmd_count()
    elif args[0] == "clear":
        cmd_clear()
    else:
        print(f"Unknown command: '{args[0]}'")
        print(HELP)


if __name__ == "__main__":
    main()