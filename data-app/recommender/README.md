## recommender system backend
adapted from this guide: https://fastapi.tiangolo.com/deployment/docker/

### running the backend (start in this directory):

build image: `docker build -t vdb .`

run container: `docker run -d --name vdb -p 8000:8000 vdb`

(takes a minute or two to spin up to download the embedding function)

view endpoints: http://127.0.0.1:8000/docs

### todo

#### decide when/how to rebuild database
rebuilding the database only takes five minutes or so (very machine-dependent), but it would be much easier to iterate on the way it is currently set up (store database and copy it into the container for use).

#### add authentication to API
while there is very little incentive to scraping the API, it would probably be best to keep the API private so only the vercel deployment can access the database

### todo (frontend)

#### decide where search results should go
if the user is searching for a particular class, these search results may appear below the list and be unrelated to what they are looking for. solutions:
- create alternative search bar/system
    - more clear to user that a semantic search query is being made
    - would probably lessen load on backend in the future
- semantic search as backup to normal results
    - keep interface to one search bar
    - relatively easy to distinguish behaviors (like seeing if their query matches a class or the class code format "AAAANNNN")


#### similar class suggestions
understand how to add similar class suggestions to the bottom of classes either before loading (whenever all the other data is gathered) or asynchronously, as it could easily become a slowdown