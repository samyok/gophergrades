import threading

from rmp_api import RmpApi
from typing import List

class RateMyProfessor:

    def __init__(self, name: str):
        self._university_name = name
        self._search_name = f"\"{name}\""
        self._school_id = None

    def _get_school_id(self):
        if self._school_id == None:
            school_matches = RmpApi.SchoolSearch(name=self._search_name)

            for school in school_matches:
                if school["node"]["name"] == self._university_name:
                    self._school_id = school["node"]["id"]
                    break
            
        if self._school_id == None:
            raise f"{self._university_name} does not exist"

    def Run(self, professors_names: List[str]):
        self._get_school_id()

        professor_mapping = dict()
        threads = []

        def getProfessor(professor_name, school_id, professor_mapping):
            professor_mapping[professor_name] = RmpApi.ProfessorSearch(
                name=professor_name,
                schoolID=school_id,
            )

        for professor_name in professors_names:
            thread = threading.Thread(target=getProfessor, args=(professor_name, self._school_id, professor_mapping, ))
            thread.start()
            threads.append(thread)

        for thread in threads:
            thread.join()


        for name, matches in professor_mapping.items():
            professor_mapping[name] = None
            for match in matches:
                current_node = match['node']
                full_name = f"{current_node['firstName']} {current_node['lastName']}"

                if name == full_name:
                    professor_mapping[name] = current_node
                    break
    
        return professor_mapping
