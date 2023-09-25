# create a new collection populated with the courses found in ProcessedData.db
# for the time being, use the default (free) embedding function. 
# once we get all the plumbing figured out, we can do openai stuff?

import chromadb
from chromadb.utils import embedding_functions
import openai
from dotenv import load_dotenv
import os

CHROMA_COLLECTION_NAME = "fall23"
OPENAI_MODEL_NAME = "text-embedding-ada-002"

load_dotenv(".env") # figure out best place to put this
# OPENAI_KEY = os.getenv("OPENAI_KEY")
# openai_ef = embedding_functions.OpenAIEmbeddingFunction(
#     api_key=OPENAI_KEY, 
#     model_name=OPENAI_MODEL_NAME
# )

# will eventually be properly hosted. for now, localhost
chroma_client = chromadb.HttpClient(host="localhost", port=8090)

collection = chroma_client.create_collection(
    name=CHROMA_COLLECTION_NAME,
    # for now, just use default embedding func. 
    # embedding_function=openai_ef 
)

# @doggu pls merge in sql reading thing?