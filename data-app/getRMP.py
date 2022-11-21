import requests
from functools import reduce
from operator import concat
import pandas as pd

RMP=dict()
def standardizeName(name):
    splits=name.split(" ")
    mappedName=list(map((lambda x:x.split("-")),splits)) #[first,weird-last]->[[first],[weird,last]]
    hyphenSplit=reduce(concat,mappedName)#[[first],[weird,last]]->[first,weird,last]
    if len(hyphenSplit)>2:
        return hyphenSplit[0]+" "+hyphenSplit[2]#[2] chosen b/c we don't have possible middle names
        #Note - this *may* throw away recoverable names.
    else:
        return name


def getProfData():
    global RMP
    url="https://www.ratemyprofessors.com/graphql"
    header={"authorization" : "Basic dGVzdDp0ZXN0"}
    #Thank you RMP website the wonderful query json
    #Note - this skips about 10 professors on the first page,
    #and if the U ever gets more than 100k entries this will
    #cutoff data. If this happens change count in variables.
    query={"query":"query TeacherSearchPaginationQuery(  $count: Int!  $cursor: String  $query: TeacherSearchQuery!) {  search: newSearch {    ...TeacherSearchPagination_search_1jWD3d  }}fragment TeacherSearchPagination_search_1jWD3d on newSearch {  teachers(query: $query, first: $count, after: $cursor) {    didFallback    edges {      cursor      node {        ...TeacherCard_teacher        id        __typename      }    }    pageInfo {      hasNextPage      endCursor    }    resultCount    filters {      field      options {        value        id      }    }  }}fragment TeacherCard_teacher on Teacher {  id  legacyId  avgRating  numRatings  ...CardFeedback_teacher  ...CardSchool_teacher  ...CardName_teacher  ...TeacherBookmark_teacher}fragment CardFeedback_teacher on Teacher {  wouldTakeAgainPercent  avgDifficulty}fragment CardSchool_teacher on Teacher {  department  school {    name    id  }}fragment CardName_teacher on Teacher {  firstName  lastName}fragment TeacherBookmark_teacher on Teacher {  id  isSaved}","variables":{"count":100000,"cursor":"YXJyYXljb25uZWN0aW9uOjc=","query":{"text":"","schoolID":"U2Nob29sLTEyNTc=","fallback":True}}}

    r=requests.post(url,headers=header,json=query,timeout=60).json()
    teachers=r["data"]["search"]["teachers"]["edges"]
    for tNode in teachers:
        t=tNode["node"]
        tid=t["legacyId"]
        name=standardizeName(t["firstName"]+" "+t["lastName"])
        link=f"https://www.ratemyprofessors.com/professor?tid={tid}"
        RMP[name]={"department":t["department"],
                     "numOfRatings":t["numRatings"],
                     "overallRatings":t["avgRating"],
                     "difficultly":t["avgDifficulty"],
                     "pgLink":link}

def getRMP(x):
    global RMP
    name=standardizeName(x)
    try:
        overall=RMP[name]["overallRatings"]
        difficulty = RMP[name]["difficultly"]
        overall = float('nan' if overall == 0 else overall)
        difficulty = float('nan' if overall == 0 else difficulty)
        link = RMP[name]["pgLink"]
        return (overall,difficulty,link)
    except KeyError:
        print("Key error found, continuing")
        return (float('nan'),float('nan'),None)

getProfData()
if __name__ == "__main__":
    df=pd.read_csv("CLASS_DATA/combined_clean_data.csv")
    df["RMP_SCORE"],df["RMP_DIFF"],df["RMP_LINK"]=zip(*df["HR_NAME"].map(getRMP))
    print(df)
