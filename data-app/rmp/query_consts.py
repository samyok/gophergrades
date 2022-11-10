class QueryType:

    TEACHERS = "NewSearchTeachersQuery"
    SCHOOLS = "NewSearchSchoolsQuery"

class QueryConstants:

    URL = "https://www.ratemyprofessors.com/graphql"

    HEADER = {
        "authorization" : "Basic dGVzdDp0ZXN0", # lmao
    }

    NewSearchTeachersQuery = """
        query NewSearchTeachersQuery($query: TeacherSearchQuery!) {
            newSearch {
                teachers(query: $query) {
                edges {
                    cursor
                    node {
                        id
                        firstName
                        lastName
                        school {
                            name
                            id
                        }
                        department
                        numRatings
                        avgRating
                        avgDifficulty
                        wouldTakeAgainPercent
                    }
                }
                }
            }
        }
    """

    NewSearchSchoolsQuery = """
        query NewSearchSchoolsQuery($query: SchoolSearchQuery!) {
            newSearch {
                schools(query: $query) {
                    edges {
                        cursor
                        node {
                            id
                            name
                            city
                            state
                        }
                    }
                }
            }
        }
    """
