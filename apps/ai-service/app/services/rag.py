import os
import json
import math
import google.generativeai as genai
from pypdf import PdfReader
from app.config import GEMINI_API_KEY

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

VECTOR_STORE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "vector_store.json")

def dot_product(v1: list, v2: list) -> float:
    return sum(a * b for a, b in zip(v1, v2))

def magnitude(v: list) -> float:
    return math.sqrt(sum(a * a for a in v))

def cosine_similarity(v1: list, v2: list) -> float:
    mag1 = magnitude(v1)
    mag2 = magnitude(v2)
    if mag1 == 0 or mag2 == 0:
        return 0
    return dot_product(v1, v2) / (mag1 * mag2)

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 150) -> list:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end].strip())
        start += (chunk_size - overlap)
    return chunks

def load_vector_store() -> list:
    if not os.path.exists(VECTOR_STORE_PATH):
        return []
    try:
        with open(VECTOR_STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Vector Store Load Error] {e}")
        return []

def save_vector_store(store: list):
    try:
        with open(VECTOR_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Vector Store Save Error] {e}")

def index_document(file_path: str, category: str = "POLICY") -> bool:
    try:
        # Extract text from PDF
        reader = PdfReader(file_path)
        filename = os.path.basename(file_path)
        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() or ""
        
        full_text = full_text.strip()
        if not full_text:
            return False
            
        chunks = chunk_text(full_text)
        print(f"[RAG] Indexing {filename}: generated {len(chunks)} chunks.")
        
        # Load existing index
        store = load_vector_store()
        
        # If Gemini key is missing, store mock/text chunks without embeddings
        if not GEMINI_API_KEY:
            for idx, chunk in enumerate(chunks):
                store.append({
                    "id": f"{filename}-{idx}",
                    "text": chunk,
                    "metadata": {"filename": filename, "category": category},
                    "embedding": []
                })
            save_vector_store(store)
            return True

        # Generate embeddings
        for idx, chunk in enumerate(chunks):
            # API embedding call
            embed_response = genai.embed_content(
                model="models/embedding-001",
                content=chunk,
                task_type="retrieval_document"
            )
            embedding = embed_response.get("embedding", [])
            
            store.append({
                "id": f"{filename}-{idx}",
                "text": chunk,
                "metadata": {"filename": filename, "category": category},
                "embedding": embedding
            })
            
        save_vector_store(store)
        return True
    except Exception as e:
        print(f"[RAG Index Error] Failed to index {file_path}: {e}")
        return False

def query_rag_chat(query: str) -> dict:
    store = load_vector_store()
    if not store:
        return {
            "answer": "No company policy or handbook documents have been uploaded to search. Please upload a PDF in the HR panel first."
        }

    # Fallback if no LLM key
    if not GEMINI_API_KEY:
        # Heuristic keyword matching if key is missing
        matches = []
        for item in store:
            score = sum(1 for word in query.lower().split() if word in item["text"].lower())
            if score > 0:
                matches.append((score, item["text"]))
        matches.sort(key=lambda x: x[0], reverse=True)
        context = "\n---\n".join(m[1] for m in matches[:3]) if matches else ""
        if context:
            return {
                "answer": f"Here is a relevant snippet found in the local documents:\n\n{context}\n\n*(Note: To synthesize full summaries, please configure the GEMINI_API_KEY)*"
            }
        return {"answer": "No relevant entries found matching your query terms in the uploaded files."}

    try:
        # 1. Generate query embedding
        embed_response = genai.embed_content(
            model="models/embedding-001",
            content=query,
            task_type="retrieval_query"
        )
        query_embedding = embed_response.get("embedding", [])
        
        if not query_embedding:
            return {"answer": "Failed to create embeddings for the query prompt."}

        # 2. Compute similarity and rank chunks
        scored_items = []
        for item in store:
            if not item.get("embedding"):
                continue
            sim = cosine_similarity(query_embedding, item["embedding"])
            scored_items.append((sim, item["text"], item["metadata"]))
            
        scored_items.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_items[:3] # Get top 3 chunks

        if not top_chunks or top_chunks[0][0] < 0.2:
            return {"answer": "I searched the corporate handbook documents, but I couldn't find any relevant sections matching your query."}

        # 3. Call Gemini to answer with context
        context = "\n---\n".join(f"Source Document: {item[2].get('filename')}\nContent: {item[1]}" for item in top_chunks)
        
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        You are a helpful HR Assistant. You are answering a question based strictly on the following context retrieved from company handbooks, policies, or upload files:
        ---
        {context}
        ---
        
        User Question: "{query}"
        
        Formulate a clear, helpful, and professional answer using the provided context.
        If the answer is not in the context, say "According to the corporate documents, I could not find information about that, but general policy implies..."
        Quote or reference the document name where applicable.
        """
        
        answer = model.generate_content(prompt).text
        return {"answer": answer}
        
    except Exception as e:
        print(f"[RAG Chat Error] {e}")
        return {"answer": f"Failed to execute semantic search: {str(e)}"}
