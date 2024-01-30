# create a new collection populated with the courses found in ProcessedData.db
# for the time being, use the default (free) embedding function. 
# once we get all the plumbing figured out, we can do openai stuff?

import chromadb
from chromadb.utils import embedding_functions
import openai
from dotenv import load_dotenv
import os
import sqlite3

CHROMA_COLLECTION_NAME = "fall23"
OPENAI_MODEL_NAME = "text-embedding-ada-002"
DB_PATH = "../../ProcessedData.db"

load_dotenv(".env") # figure out best place to put this
# OPENAI_KEY = os.getenv("OPENAI_KEY")
# openai_ef = embedding_functions.OpenAIEmbeddingFunction(
#     api_key=OPENAI_KEY, 
#     model_name=OPENAI_MODEL_NAME
# )

# will eventually be properly hosted. for now, localhost
chroma_client = chromadb.HttpClient(host="localhost", port=8090)

# could use chroma_client.upsert() method if that's of any utility?
chroma_client.delete_collection(name=CHROMA_COLLECTION_NAME) # TODO: catch error if collection doesn't exist?
collection = chroma_client.get_or_create_collection(
    name=CHROMA_COLLECTION_NAME,
    # for now, just use default embedding func. 
    # embedding_function=openai_ef 
)

sql_connection = sqlite3.connect(DB_PATH)
cursor = sql_connection.cursor()
cursor.execute("SELECT id, class_name, class_desc, onestop_desc FROM classdistribution")

desc = cursor.description
column_names = [col[0] for col in desc]

# create a nice dict keyed by column names
rows = [dict(zip(column_names, row)) for row in cursor.fetchall()]

sql_connection.close()

metadatas = []
documents = []
ids = []

for row in rows:
    if row["onestop_desc"] == None:
        print(f"found empty onestop description for {row['class_name']} (id: {row['id']}). Skipping embedding...")
        continue

    metadatas.append({"class_name":row["class_name"], "class_desc":row["class_desc"]})
    #   metadatas.append({"subject":subject,"level":catalog_nbr[0],"instructor":x500,"title":title})
    documents.append(row["onestop_desc"])
    ids.append(str(row["id"])) # should we use class_name here instead?

collection.add(metadatas=metadatas, documents=documents, ids=ids)

# @doggu pls merge in sql reading thing?