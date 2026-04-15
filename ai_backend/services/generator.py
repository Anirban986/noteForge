"""
services/generator.py
---------------------
Generates answers and block-based Topper's Notes using LangChain LCEL chains.

Fixes applied:
  1. Discriminated Union on 'type' field — Pydantic now routes directly to
     the correct block class instead of trying all variants in order.
  2. All optional/missing fields have defaults so partial LLM output doesn't crash.
  3. Type normaliser maps class names → literal values before validation.
  4. Raw JSON parsing instead of with_structured_output() for full control.
"""

from typing import Optional, Union, Literal, Annotated,List
from pydantic import BaseModel, Field
import json

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
import config


# ─────────────────────────────────────────────────────────
#  TYPE NORMALISER
#  Maps LLM class names → literal type values before Pydantic sees them.
# ─────────────────────────────────────────────────────────

_TYPE_NAME_MAP = {
    "ConceptBlock":   "concept",
    "KeyPointsBlock": "keypoints",
    "FlowchartBlock": "flowchart",
    "TableBlock":     "table",
    "MindmapBlock":   "mindmap",
    "FormulaBlock":   "formula",
    "CalloutBlock":   "callout",
}

def _normalize_mindmap_tree(node):
    # string → convert to node
    if isinstance(node, str):
        return {"label": node, "children": []}

    # dict → normalize recursively
    if isinstance(node, dict):
        return {
            "label": node.get("label", ""),
            "children": [
                _normalize_mindmap_tree(child)
                for child in node.get("children", [])
            ]
        }

    # fallback
    return {"label": str(node), "children": []}

def _normalise_blocks(data: dict) -> dict:
    if "topics" not in data:
        return data

    for topic in data.get("topics", []):
        for block in topic.get("blocks", []):
            if isinstance(block, dict):

                if "type" in block:
                    block["type"] = _TYPE_NAME_MAP.get(block["type"], block["type"])

                if block.get("type") == "mindmap":
                    branches = block.get("branches", [])
                    normalized_branches = []

                    for branch in branches:
                        normalized_branch = {
                            "label": branch.get("label", ""),
                            "children": [
                                _normalize_mindmap_tree(child)
                                for child in branch.get("children", [])
                            ]
                        }
                        normalized_branches.append(normalized_branch)

                    block["branches"] = normalized_branches

    return data


# ─────────────────────────────────────────────────────────
#  BLOCK SCHEMAS
#  All optional/missing fields have defaults so partial LLM
#  output doesn't cause validation errors.
# ─────────────────────────────────────────────────────────

class ConceptBlock(BaseModel):
    type:        Literal["concept"] = "concept"
    heading:     str = ""
    explanation: str = ""


class KeyPointItem(BaseModel):
    point: str = ""
    note:  str = ""   # default empty — LLM sometimes omits this


class KeyPointsBlock(BaseModel):
    type:    Literal["keypoints"] = "keypoints"
    heading: str = ""
    points:  list[KeyPointItem] = Field(default_factory=list)


class FlowchartStep(BaseModel):
    label:       str = ""
    description: Optional[str] = None

class FlowchartBlock(BaseModel):
    type:      Literal["flowchart"] = "flowchart"
    heading:   str = ""
    direction: Literal["horizontal", "vertical"] = "vertical"
    steps:     list[FlowchartStep] = Field(default_factory=list)


class TableBlock(BaseModel):
    type:    Literal["table"] = "table"
    heading: str = ""
    headers: list[str] = Field(default_factory=list)
    rows:    list[list[str]] = Field(default_factory=list)



from typing import Union

class MindmapNode(BaseModel):
    label: str = ""
    children: list["MindmapNode"] = Field(default_factory=list)

MindmapNode.model_rebuild()





class MindmapBlock(BaseModel):
    type:    Literal["mindmap"] = "mindmap"
    heading: str = ""
    root:    str = ""
    branches: List[MindmapNode] = Field(default_factory=list)


class FormulaBlock(BaseModel):
    type:    Literal["formula"] = "formula"
    heading: str = ""
    formula: str = ""
    meaning: str = ""
    example: Optional[str] = None


class CalloutBlock(BaseModel):
    type:    Literal["callout"] = "callout"
    variant: Literal["tip", "warning", "important", "exam_tip"] = "important"
    text:    str = ""




# Discriminated union — Pydantic uses the 'type' field directly
# to pick the right class. No more "try all variants" validation.
Block = Annotated[
    Union[
        ConceptBlock,
        KeyPointsBlock,
        FlowchartBlock,
        TableBlock,
        MindmapBlock,
        FormulaBlock,
        CalloutBlock,
    ],
    Field(discriminator="type")
]


class Topic(BaseModel):
    topic: str = ""
    blocks: list[Block] = Field(default_factory=list)


class TopperNotes(BaseModel):
    title: str = ""
    overview: str = ""
    topics: list[Topic] = Field(default_factory=list)

    @classmethod
    def from_llm_output(cls, data: dict) -> "TopperNotes":
        data = _normalise_blocks(data)

        # Normalize blocks inside topics
        for topic in data.get("topics", []):
            for block in topic.get("blocks", []):
                if "type" in block:
                    block["type"] = _TYPE_NAME_MAP.get(block["type"], block["type"])

        return cls(**data)




# ─────────────────────────────────────────────────────────
#  LLM INSTANCES
# ─────────────────────────────────────────────────────────

_llm = ChatGoogleGenerativeAI(
    model=config.GEMINI_MODEL,
    google_api_key=config.GEMINI_API_KEY,
    temperature=0.2
)

_json_llm = ChatGoogleGenerativeAI(
    model=config.GEMINI_MODEL,
    google_api_key=config.GEMINI_API_KEY,
    temperature=0.1
)


# ─────────────────────────────────────────────────────────
#  PROMPTS
# ─────────────────────────────────────────────────────────

_QA_PROMPT = ChatPromptTemplate.from_template("""
You are a helpful study assistant.
Use ONLY the context below to answer. If the answer is not in the context,
say "I couldn't find that in the notes."

Context:
{context}

Question: {question}

Give a concise, clear answer using bullet points where helpful.
""")


_FREE_NOTES_PROMPT = ChatPromptTemplate.from_template("""
Generate "Topper's Notes" from the content below.

OUTPUT STRUCTURE:
- Generate ONE main title for the note
- Split content into MULTIPLE topics
- Each topic must contain its own blocks

CRITICAL:
- Each topic MUST have a non-empty "topic" name
- DO NOT leave topic as empty string
- Use meaningful names like:
  "Machine Learning Basics"
  "Memory Hierarchy"
  "Computer Architecture"                                                                                                      


IMPORTANT — use EXACTLY these type string values (lowercase, no "Block" suffix):
  "concept"   for a key idea with 2-3 line explanation
  "keypoints" for grouped bullet points (each point MUST have both "point" and "note" fields)
  "flowchart" for any process, algorithm, or sequence of steps
  "table"     for any comparison, pros/cons, or attribute breakdown
  "mindmap"   for any hierarchy, taxonomy, or category tree
  "formula"   for any equation or mathematical expression
  "callout"   for a single critical fact or warning

RULES:
- Processes/steps → "flowchart" ALWAYS
- Comparisons     → "table" ALWAYS
- Hierarchies     → "mindmap" ALWAYS
- Formulas        → "formula" ALWAYS
- Every keypoints block: each item MUST have BOTH "point" AND "note" fields
- Scale block count to content size — do not compress
- Each topic should represent a logical concept
- Each topic must have at least 1–3 blocks
- Do NOT merge all content into one topic
- Keep topic titles short and meaningful
                                                 

Return ONLY a JSON object, no markdown fences, no explanation:
{{
  "title": "Main title of the note",                                                    
  "overview": "2-3 sentence summary of entire content",
  "topics": [
    "title": "Topic Name",
    "blocks": [
      {{"type": "concept", "heading": "...", "explanation": "..."}},
      {{"type": "keypoints", "heading": "...", "points": [{{"point": "...", "note": "..."}}]}},
      {{"type": "flowchart", "heading": "...", "direction": "vertical", "steps": [{{"label": "...", "description": "..."}}]}},
      {{"type": "table", "heading": "...", "headers": ["Col1", "Col2"], "rows": [["val1", "val2"]]}},
      {{"type": "mindmap", "heading": "...", "root": "...", "branches": [{{"label": "...", "children": ["..."]}}]}},
      {{"type": "formula", "heading": "...", "formula": "...", "meaning": "...", "example": "..."}},
      {{"type": "callout", "variant": "tip|warning|important", "text": "..."}}
    ]                                                                                                   
  ]
}}

{topic_clause}

Content:
{context}
""")


_EXAM_NOTES_PROMPT = ChatPromptTemplate.from_template("""
Generate exam-specific "Topper's Notes" for a student preparing for {exam}.
Subject: {subject} | Chapter: {chapter}

OUTPUT STRUCTURE:
- Generate ONE main title
- Split into high-weightage topics
- Each topic must contain blocks

CRITICAL:
- Each topic MUST have a non-empty "topic" name
- DO NOT leave topic as empty string
- Use meaningful names like:
  "Machine Learning Basics"
  "Memory Hierarchy"
  "Computer Architecture"                                                                                                           

IMPORTANT — use EXACTLY these type string values (lowercase, no "Block" suffix):
  "concept", "keypoints", "flowchart", "table", "mindmap", "formula", "callout"

Every keypoints block: each item MUST have BOTH "point" AND "note" fields.

EXAM BEHAVIOUR:
- Prioritise high-weightage topics for {exam}
- Add callout blocks with variant "exam_tip" for frequently asked topics
- Focus on high-weightage topics
- Add "exam_tip" callouts

Return ONLY a JSON object, no markdown fences:
{{
  "title": "Main title",                                                    
  "overview": "2-3 sentence summary",
  "topics":[
       {{
    "title":"important topic",
    "blocks": [
    {{"type": "concept", "heading": "...", "explanation": "..."}},
    {{"type": "keypoints", "heading": "...", "points": [{{"point": "...", "note": "..."}}]}},
    {{"type": "flowchart", "heading": "...", "direction": "vertical", "steps": [{{"label": "...", "description": "..."}}]}},
    {{"type": "table", "heading": "...", "headers": ["Col1", "Col2"], "rows": [["val1", "val2"]]}},
    {{"type": "mindmap", "heading": "...", "root": "...", "branches": [{{"label": "...", "children": ["..."]}}]}},
    {{"type": "formula", "heading": "...", "formula": "...", "meaning": "...", "example": "..."}},
    {{"type": "callout", "variant": "exam_tip", "text": "..."}}
  ]                                                                                      
        }}                                               
    ]
}}

Content:
{context}
""")


# ─────────────────────────────────────────────────────────
#  CONTEXT FORMATTERS
# ─────────────────────────────────────────────────────────

def _format_chunks(chunks: list[dict]) -> str:
    return "\n\n".join(
        f"[Source: {c['source']}, Page {c['page']} | relevance: {c['relevance']}%]\n{c['text']}"
        for c in chunks
    )

def _format_docs(docs) -> str:
    return "\n\n".join(
        f"[Source: {d.metadata.get('source','?')}, Page {d.metadata.get('page','?')}]\n{d.page_content}"
        for d in docs
    )


# ─────────────────────────────────────────────────────────
#  JSON PARSER
# ─────────────────────────────────────────────────────────

def _parse_topper_notes(raw: str) -> TopperNotes:
    """
    Parse raw LLM output into TopperNotes.
    Strips markdown fences, normalises block type names, validates with Pydantic.
    """
    cleaned = raw.strip()

    # Strip ```json ... ``` or ``` ... ``` fences
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        # Remove first line (```json or ```) and last line (```)
        start = 1
        end   = len(lines) - 1 if lines[-1].strip() == "```" else len(lines)
        cleaned = "\n".join(lines[start:end])

    data = json.loads(cleaned.strip())
    return TopperNotes.from_llm_output(data)


# ─────────────────────────────────────────────────────────
#  PUBLIC API
# ─────────────────────────────────────────────────────────

def build_rag_chain(retriever):
    """Full LCEL RAG chain for QA."""
    return (
        {
            "context":  retriever | _format_docs,
            "question": RunnablePassthrough()
        }
        | _QA_PROMPT
        | _llm
        | StrOutputParser()
    )


def answer(question: str, chunks: list[dict]) -> str:
    """Generate a plain-text QA answer from retrieved chunks."""
    if not chunks:
        return "No relevant notes found. Please ingest a PDF first."
    chain = _QA_PROMPT | _llm | StrOutputParser()
    return chain.invoke({
        "context":  _format_chunks(chunks),
        "question": question
    })


def short_notes(chunks: list[dict], topic: str = None) -> TopperNotes:
    """FREE MODE — General Topper's Notes from PDF content."""
    if not chunks:
        return TopperNotes(overview="No notes found. Please ingest a PDF first.")

    chain = _FREE_NOTES_PROMPT | _json_llm | StrOutputParser()
    raw   = chain.invoke({
        "context":      _format_chunks(chunks),
        "topic_clause": f"Focus specifically on: {topic}" if topic else ""
    })
    return _parse_topper_notes(raw)


def exam_notes(chunks: list[dict], exam,subject,chapter) -> TopperNotes:
    """EXAM MODE (Premium) — Exam-specific Topper's Notes."""
    if not chunks:
        return TopperNotes(overview="No notes found. Please ingest a PDF first.")

    chain = _EXAM_NOTES_PROMPT | _json_llm | StrOutputParser()
    raw   = chain.invoke({
        "context": _format_chunks(chunks),
        "exam":    exam,
        "subject": subject,
        "chapter": chapter
    })
    return _parse_topper_notes(raw)