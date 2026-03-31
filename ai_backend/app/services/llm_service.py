from langchain_community.llms import ollama

def get_llm():
    return ollama(model='llama3')