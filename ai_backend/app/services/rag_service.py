from app.utils.pdf_loader import extract_text
from app.utils.chunking import chunk_text
from app.services.embedding_service import create_vector_store
from app.services.llm_service import get_llm

from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate


async def generate_notes(file, mode, exam, subject, chapters):

    # 1. Extract text
    text = await extract_text(file)

    # 2. Chunk
    chunks = chunk_text(text)

    # 3. Vector DB
    vectorstore = create_vector_store(chunks)
    retriever = vectorstore.as_retriever()

    # 4. LLM
    llm = get_llm()

    # 5. Prompt
    if mode == "premium":
        template = f"""
You are an expert exam preparation assistant.

Your task is to generate HIGH-QUALITY, CONCISE, and EXAM-FOCUSED NOTES.

-----------------------------------
📘 Exam: {exam}
📗 Subject: {subject}
📙 Chapters: {chapters}
-----------------------------------

Context:
{{context}}

Question:
{{question}}

Instructions:
- Use bullet points only
- Keep it concise and structured
- Focus only on important exam topics
"""
    else:
        template = """
You are an expert note-making assistant.

Context:
{context}

Question:
{question}

Instructions:
- Use bullet points
- Keep it short and clear
- Focus on important concepts only
"""

    prompt = PromptTemplate.from_template(template)

    # 6. Helper to format documents
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    # 7. LCEL Chain
    chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough(),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    # 8. Run chain (ASYNC)
    result = await chain.ainvoke("Generate exam notes from the document")

    return result