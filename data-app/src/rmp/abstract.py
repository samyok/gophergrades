from abc import ABC, abstractmethod
from db.Models import Professor, Session
import requests
import time
import random

class AbstractRMP(ABC):
    """Defines the interface to get reviews from Rate My Professor (RMP)."""

    def __init__(self):
        self.SCHOOLS = [
            {"id": "U2Nob29sLTEyNTc=", "name": "University of Minnesota, Twin Cities"},  # University of Minnesota, Twin Cities
            {"id": "U2Nob29sLTEzNzI=", "name": "University of Minnesota, Duluth"},  # University of Minnesota, Duluth
            {"id": "U2Nob29sLTE0MjQ4", "name": "University of Minnesota, Rochester"},  # University of Minnesota, Rochester
            {"id": "U2Nob29sLTQyODA=", "name": "University of Minnesota, Morris"},  # University of Minnesota, Morris
            {"id": "U2Nob29sLTQ2MDM=", "name": "University of Minnesota, Crookston"}  # University of Minnesota, Crookston
        ]
        self.rmp_headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Origin": "https://www.ratemyprofessors.com",
            "Referer": "https://www.ratemyprofessors.com/",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
            "Content-Type": "application/json",
        }
        self.graphql_url = "https://www.ratemyprofessors.com/graphql"



    def get_prof_by_school_and_name(self, college: dict[str, str], professor_name: str) -> list[dict]:
        query = """
            query NewSearchTeachersQuery($professorName: String!, $schoolID: ID!){
                newSearch{
                    teachers(query: {text: $professorName, schoolID: $schoolID}, first: 300){
                        edges{
                            node{
                                avgDifficulty
                                avgRating
                                id
                                firstName
                                lastName
                                legacyId
                                school{
                                    id
                                }
                            }
                        }
                    }
                }
            }
        """
        
        payload = {
            "query": query,
            "variables": {
                "professorName": professor_name,
                "schoolID": college["id"]
            }
        }
        
        # Add retry mechanism for network requests
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Add delay to avoid rate limiting
                time.sleep(random.uniform(0.5, 1.5))
                
                response = requests.post(
                    self.graphql_url,
                    headers=self.rmp_headers,
                    json=payload,
                    timeout=30
                )
                response.raise_for_status()
                
                result = response.json()
                if "errors" in result:
                    print(f"[RMP GQL Error] {result['errors']} for {professor_name}")
                    return []
                
                if "data" not in result or not result["data"]["newSearch"]["teachers"]["edges"]:
                    print(f"[RMP GQL] No results for {professor_name} at {college['name']}")
                    return []
                
                print(f"[RMP GQL] Found {len(result['data']['newSearch']['teachers']['edges'])} results for {professor_name} at {college['name']}")
                return result["data"]["newSearch"]["teachers"]["edges"]
                
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    print(f"[RMP Timeout] Retrying {professor_name} at {college['name']} (attempt {attempt + 1}/{max_retries})")
                    time.sleep(2 ** attempt)  # Exponential backoff
                else:
                    print(f"[RMP Timeout] Failed to query {professor_name} at {college['name']} after {max_retries} attempts")
                    return []
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    print(f"[RMP Error] Request failed for {professor_name}: {e}. Retrying...")
                    time.sleep(2 ** attempt)
                else:
                    print(f"[RMP Error] Failed to query {professor_name} after {max_retries} attempts: {e}")
                    return []
        
        return []


    @abstractmethod
    def update_prof_by_name(self, prof: Professor) -> None:
        pass

    def update_profs(self) -> None:
        # Using sequential processing to avoid timeout issues with multiprocessing
        session = Session()
        profs = session.query(Professor).order_by(Professor.name).all()
        session.close()
        
        print(f"[RMP] Processing {len(profs)} professors sequentially")
        for i, prof in enumerate(profs, 1):
            print(f"[RMP] Processing {i}/{len(profs)}: {prof.name}")
            self.update_prof_by_name(prof)