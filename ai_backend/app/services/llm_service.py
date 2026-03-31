from langchain_ollama import OllamaLLM

def get_llm():
    return OllamaLLM(
        model="llama3",   # LLM for generation
        temperature=0.3
    )