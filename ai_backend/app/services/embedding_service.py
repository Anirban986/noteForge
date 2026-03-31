from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Chroma

def create_vector_store(chunks):
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    vectorstore = Chroma.from_texts(
        chunks,
        embedding=embeddings
    )

    return vectorstore