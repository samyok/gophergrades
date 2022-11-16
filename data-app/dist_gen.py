import pandas as pd
from collections import Counter
import html as h
from db.Models import *
from mapping.dept_name import dept_mapping, libed_mapping
from getRMP import *
import requests
from sqlalchemy import and_

"""
    This file handles post-processing the cleaned data and feature engineering. Run this once you've
    properly cleaned and combined the old and new data. Keep in mind that you'll need to update the constants below.
    It is in this file where we associate classes with their libeds, their onestop, and their credits. Additionally,
    we also associate professors with their RMP score should it be found. Lastly, this is also where we will utilize
    the SRT data to gain more information about classes.
"""

# Worry not about the CACHED variables, this is simply to help store previous requests in order to prevent redundant calls to an API
CACHED_REQ={}
CACHED_LINK=""
# TERMS should hold the value of the next 2 terms, current term, and past 2 term in decreasing order.
TERMS = [1233, 1229, 1225, 1223, 1219]
# Runs the generate function to fetch data from API
# TODO: Potential switch to GraphQL API?
generate_rmp()

def process_class(x: pd.DataFrame) -> None:
    """
    On a grouped element by FULL_NAME and HR_NAME (individual class taught by a specific professor) it will generate
    a distribution and associate it with the appropriate class distribution and professor. Should neither of those two exist
    then it will create them as well. If the department of the class doesn't exist then that will be created.

    :type x: pd.DataFrame
    """
    num_sems = x["TERM"].nunique()
    prof_name = x["HR_NAME"].iloc[0]
    class_name = x["FULL_NAME"].iloc[0]
    dept_abbr = x["SUBJECT"].iloc[0]
    class_descr = x["DESCR"].iloc[0]
    grade_hash = {
        'A':0, 
        'A+':0,
        'A-':0,
        'B': 0, 
        'B+': 0, 
        'B-': 0, 
        'C': 0, 
        'C+': 0, 
        'C-':0, 
        'D':0,
        'D+': 0, 
        'D-':0,
        'F':0,
        'N': 0, 
        'S': 0, 
        'P':0,
        'W': 0
    }
    grade_hash |= x.groupby("CRSE_GRADE_OFF")["GRADE_HDCNT"].sum().to_dict()
    num_students = sum(grade_hash.values())
    # Begin Insertion
    class_dist = session.query(ClassDistribution).filter(ClassDistribution.class_name == class_name).first()
    dept = session.query(DepartmentDistribution).filter(DepartmentDistribution.dept_abbr == dept_abbr).first()
    if class_dist == None:
        if dept == None:
            dept = DepartmentDistribution(dept_abbr=dept_abbr,dept_name=dept_mapping.get(dept_abbr,"Unknown Department"))
            session.add(dept)
            session.flush()
            print(f"Created New Department: {dept.dept_abbr} : {dept.dept_name}")
        class_dist = ClassDistribution(class_name=class_name,class_desc=class_descr,total_students=num_students,total_grades=grade_hash,department_id=dept.id)
        session.add(class_dist)
        session.flush()
        print(f"Created New Class Distribution {class_dist.class_name} : {class_dist.class_desc}")
    else:
        class_dist.total_grades = Counter(class_dist.total_grades) + Counter(grade_hash)
        class_dist.total_students += num_students
    prof_query = session.query(Professor).filter(Professor.name == prof_name).first()
    if prof_name != "Unknown Professor" and prof_query == None:
        professor = Professor(name=prof_name,RMP_score=getRMP(prof_name))
        session.add(professor)
        session.flush()
        print(f"Added New Professor {professor.name} : {professor.RMP_score} stars on RMP")
        professor = professor.id
    elif prof_name != "Unknown Professor":
        professor = prof_query.id
    else:
        professor = None
    dist = Distribution(students=num_students,terms=num_sems,grades=grade_hash,class_id=class_dist.id,professor_id=professor)
    session.add(dist)
    session.commit()
    
def fetch_better_title(class_dist):
    global CACHED_REQ
    global CACHED_LINK
    dept = class_dist.dept.dept_abbr
    catalog_nbr = class_dist.class_name.split(" ")[1]
    level=catalog_nbr[0]

    link=f"http://classinfo.umn.edu/?subject={dept}&level={level}&json=1"

    if link!=CACHED_LINK:
        with requests.get(link) as url:
            CACHED_LINK=link
            try:
                decodedContent=url.content.decode("latin-1")
                CACHED_REQ=json.loads(decodedContent,strict=False)
            except ValueError:
                print("Json malformed, icky!")
                CACHED_REQ={}
                return

    #Go through lectures and find professors
    for key in sorted(CACHED_REQ.keys(),reverse=True):
        splits = key.split("-")
        if splits[1] == dept and splits[2] == catalog_nbr and "Class Title" in CACHED_REQ[key]:
            class_dist.class_desc = h.unescape(CACHED_REQ[key]["Class Title"])
            print(f"Updated | {class_dist.class_name}: {class_dist.class_desc}")
            session.commit()
            return
    else:
        print(f"Not Found | {class_dist.class_name}: {class_dist.class_desc}")

def fetch_asr(dept_dist:DepartmentDistribution,term:int) -> None:
    """
    Uses the ASR Api: https://github.com/umn-asr/courses
    to fetch class information for relavent classes, classes that are recently being conducted +- 2 terms
    from current semester. This is because these are the bounds of data held by the server, any before or
    futher are not guarenteed to be found. 

    :param dept_dist: The department distribution that we might modify depending on the results returned.
    :type dept_dist: DepartmentDistribution
    :param term: A term id
    :type term: int
    """
    global CACHED_LINK
    global CACHED_REQ
    dept = dept_dist.dept_abbr

    link=f"https://courses.umn.edu/campuses/UMNTC/terms/{term}/courses.json?q=subject_id={dept}"

    if link!=CACHED_LINK:
        with requests.get(link) as url:
            CACHED_LINK=link
            try:
                CACHED_REQ=url.json()
            except ValueError:
                print("Json malformed, icky!")
                CACHED_REQ={}
                return
    for course in CACHED_REQ["courses"]:
        subj = course["subject"]["subject_id"]
        nbr = course["catalog_number"]
        class_dist = session.query(ClassDistribution).filter(and_(ClassDistribution.onestop == None,ClassDistribution.class_name == f"{subj} {nbr}")).first()
        if class_dist:
            class_dist.class_desc = course["title"]
            class_dist.cred_min = course["credits_minimum"]
            class_dist.cred_max = course["credits_maximum"]
            class_dist.onestop = f"https://onestop2.umn.edu/pcas/viewCatalogCourse.do?courseId={course['course_id']}"
            for attribute in course["course_attributes"]:
                if attribute["family"] in ["CLE","HON","FSEM"]:
                    libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute['attribute_id']]).first()
                    libed_dist.class_dists.append(class_dist)
            print(f"Updated {class_dist.class_name} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
        session.commit()
            



# Add all libeds as defined in libed_mapping. This is a constant addition as there are a finite amount of libed requirements.
session.add_all([Libed(name=libed) for libed in libed_mapping.values()])
session.commit()


print("Beginning Insertion")
# For each class taught by each professor insert it into the database.
df = pd.read_csv("CLASS_DATA/combined_clean_data.csv",dtype={"CLASS_SECTION":str})
df.groupby(["FULL_NAME","HR_NAME"]).apply(process_class)
print("Finished Insertion")

print("Beginning Title Search")
class_dists = session.query(ClassDistribution).all()
for class_dist in class_dists:
    fetch_better_title(class_dist)
print("Finished Title Search")

print("Inserting Libed Search")
# For each term, search every department's classes and insert information regarding credits, libeds, onestop link, etc
# IF the class distribution has not already been modified.
for term in TERMS:
    dept_dists = session.query(DepartmentDistribution).all()
    for dept_dist in dept_dists:
        fetch_asr(dept_dist, term)
print("Finished Libed Search")


