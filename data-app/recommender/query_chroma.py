import chromadb
# import openai

CHROMA_COLLECTION_NAME = "extra-fall23"
OPENAI_MODEL_NAME = "text-embedding-ada-002"
DB_PATH = "../../ProcessedData.db"
N_RESULTS = 5

# load_dotenv(".env") # figure out best place to put this
# # OPENAI_KEY = os.getenv("OPENAI_KEY")
# # openai_ef = embedding_functions.OpenAIEmbeddingFunction(
# #     api_key=OPENAI_KEY, 
# #     model_name=OPENAI_MODEL_NAME
# # )

# will eventually be properly hosted. for now, localhost
chroma_client = chromadb.HttpClient(host="localhost", port=8090)
collections = [chroma_client.get_collection(name) for name in ["fall23", "extra-fall23"]]
# collection_1 = chroma_client.get_collection("fall23")
# collection_2 = chroma_client.get_collection("extra-fall23")

while True:
    query = input("> ")

    # keys = list(matches.keys())
    # values = list(matches.values())

    for collection in collections:
        matches = collection.query(
            query_texts=query, 
            n_results=N_RESULTS
        )

        print(f"### Collection {collection.name} results:")
        for i in range(N_RESULTS):
            metadata = matches["metadatas"][0][i]
            distance = matches["distances"][0][i]
            print(f"{metadata['class_name']}: {metadata['class_desc']} (dist: {distance})")
            # print()
    print("===")