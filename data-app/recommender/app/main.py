from fastapi import FastAPI
import chromadb

from pprint import pprint


client = chromadb.PersistentClient(path="./app/db")
collection = client.get_collection("test")
# force client to download embedding model
collection.query(query_texts="test")

app = FastAPI()


def format_results(results):
    ids = results['ids'][0]
    # distances = results['distances'][0]
    metadatas = results['metadatas'][0]
    # documents = results['documents'][0]
    r = list(map(lambda class_id, metadata: { "class_name": class_id, "class_desc": metadata["title"] }, ids, metadatas))
    return r


@app.get("/search")
async def search(query: str, n_results: int = 10, dist_cutoff: float = 1.8):
    # { ids: [[...]], 
    #   distances: [[...]],
    #   metadatas: [[...]],
    #   embeddings: [[...]],
    #   documents: [[...]] }
    results = collection.query(query_texts=query, n_results=n_results)

    r = format_results(results)   

    return {"results": r}


@app.get("/similar")
async def similar(classCode: str, n_results: int = 10, dist_cutoff: float = 1.8):
    curr = collection.get(ids=classCode, include=["embeddings"])
    embedding = curr['embeddings'][0]
    if curr == None:
        return { "message": "class not found" }

    results = collection.query(query_embeddings=embedding, n_results=n_results+1)
    r = format_results(results)
    # first result is always the given class itself
    r.pop(0)
    return { "results": r }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)