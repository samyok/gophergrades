import json
import requests
import pandas as pd
import math

RMP=dict()

def generate_rmp():
    global RMP
    frontPage=requests.get("https://www.ratemyprofessors.com/filter/professor/?&page=1&filter=teacherlastname_sort_s+asc&query=*%3A*&queryoption=TEACHER&queryBy=schoolId&sid=1257")
    pages=math.ceil((json.loads(frontPage.content))["remaining"]/20)
    #Loop through each page
    professor=dict()
    for pgNum in range(1,pages+1):
        page=requests.get(f"https://www.ratemyprofessors.com/filter/professor/?&page={pgNum}&filter=teacherlastname_sort_s+asc&query=*%3A*&queryoption=TEACHER&queryBy=schoolId&sid=1257")
        profs=(json.loads(page.content))["professors"]
        try:
            for prof in profs:
                name=prof["tFname"]+" "+prof["tLname"]
                score=prof["overall_rating"]
                if score == "N/A":
                    score = float('nan')
                else:
                    float(score)
                numOfRatings=prof["tNumRatings"]
                dept=prof["tDept"]
                print(f"[{pgNum}/{pages+1}]Getting {name} with {score} on RMP")
                professor[name]={"department":dept,
                                 "numOfratings":numOfRatings,
                                 "overallRatings":score}
        except ValueError:
            print("Something doesn't exist :(")

    RMP=professor

def getRMP(x):
    global RMP
    splits=x.split(" ")
    name=""
    if len(splits)>2:
        name=splits[0]+" "+splits[2]
    else:
        name=x

    try:
        return RMP[name]["overallRatings"]
    except KeyError:
        return float('nan')
