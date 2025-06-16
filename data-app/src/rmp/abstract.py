from abc import ABC, abstractmethod
from db.Models import Professor, Session
from multiprocessing import Pool
from aiohttp import BasicAuth
from gql.transport.aiohttp import AIOHTTPTransport
from gql import Client, gql

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
        RMPHeaders = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
            "Origin": "https://www.ratemyprofessors.com",
            "Referer": "https://www.ratemyprofessors.com/",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "cors",
        }
        self.transport = AIOHTTPTransport(url="https://www.ratemyprofessors.com/graphql", auth=BasicAuth("test", "test"), ssl=False, headers=RMPHeaders)
        self.gqlClient = Client(transport=self.transport, fetch_schema_from_transport=True)



    def get_prof_by_school_and_name(self, college: dict[str, str], professor_name: str) -> dict[str, str | float | int]:
        query = gql("""
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
        """)
        result = self.gqlClient.execute(query, variable_values={"professorName": professor_name, "schoolID": college["id"]})
        print(f"[RMP GQL] Searched for {professor_name} at {college['name']}")
        return result["newSearch"]["teachers"]["edges"]


    @abstractmethod
    def update_prof_by_name(self, prof: Professor) -> None:
        pass

    def update_profs(self) -> None:
        # Any higher gets rate limited by RMP
        with Pool(5) as p:
            session = Session()
            profs = session.query(Professor).order_by(Professor.name).all()
            session.close()
            p.map(self.update_prof_by_name, profs)