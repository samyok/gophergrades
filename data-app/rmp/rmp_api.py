import requests

from query_consts import QueryConstants, QueryType

class RmpApi:

    def __get_graphql_body(operationName, variables):
        return {
            "query" : getattr(QueryConstants, operationName),
            "operationName" : operationName,
            "variables" : variables,
        }

    def __make_graphql_request(operationName, variables):
        response = requests.post(
            url = QueryConstants.URL,
            json = RmpApi.__get_graphql_body(operationName, variables),
            headers = QueryConstants.HEADER,
        )

        if (response.ok):
            if (response.text == "Unauthorized"):
                print("Authentication error")
            else:
                try:
                    return response.json()["data"]
                except:
                    print("Bad response format")
        else:
            print(f"{response.status_code} error")

    def ProfessorSearch(name, schoolID=None):
        variables = {
            "query" : {
                "text" : name,
                "schoolID" : schoolID,
            }
        }

        return RmpApi.__make_graphql_request(
            operationName=QueryType.TEACHERS,
            variables=variables,
        )["newSearch"]["teachers"]["edges"]

    def SchoolSearch(name):
        variables = {
            "query" : {
                "text" : name,
            }
        }

        return RmpApi.__make_graphql_request(
            operationName=QueryType.SCHOOLS,
            variables=variables,
        )["newSearch"]["schools"]["edges"]

