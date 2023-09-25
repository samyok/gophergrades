import chromadb
# import openai

CHROMA_COLLECTION_NAME = "fall23"
OPENAI_MODEL_NAME = "text-embedding-ada-002"
DB_PATH = "../../ProcessedData.db"

# load_dotenv(".env") # figure out best place to put this
# # OPENAI_KEY = os.getenv("OPENAI_KEY")
# # openai_ef = embedding_functions.OpenAIEmbeddingFunction(
# #     api_key=OPENAI_KEY, 
# #     model_name=OPENAI_MODEL_NAME
# # )

# will eventually be properly hosted. for now, localhost
chroma_client = chromadb.HttpClient(host="localhost", port=8090)
collection = chroma_client.get_collection(CHROMA_COLLECTION_NAME)

while True:
    query = input("> ")
    matches = collection.query(
        query_texts=query, 
        n_results=5
    )

    for metadata in matches["metadatas"][0]:
        print(f"{metadata['class_name']}: {metadata['class_desc']}")
        # print()