import pandas as pd
from collections import Counter
from db.Models import *
from mapping.dept_name import dept_mapping, libed_mapping
from getRMP import *
import requests
from sqlalchemy import and_

CACHED_REQ={}
CACHED_LINK=""
TERMS = [1233, 1229, 1225, 1223, 1219]
generate_rmp()


def process_class(x):
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
        class_dist = ClassDistribution(class_name=class_name,class_desc=class_descr,total_students=num_students,total_grades=grade_hash,department_id=dept.id)
        session.add(class_dist)
        session.flush()
    else:
        class_dist.total_grades = Counter(class_dist.total_grades) + Counter(grade_hash)
        class_dist.total_students += num_students
    prof_query = session.query(Professor).filter(Professor.name == prof_name).first()
    if prof_name != "Unknown Professor" and prof_query == None:
        professor = Professor(name=prof_name,RMP_score=getRMP(prof_name))
        session.add(professor)
        session.flush()
        professor = professor.id
    elif prof_name != "Unknown Professor":
        professor = prof_query.id
    else:
        professor = None
    dist = Distribution(students=num_students,terms=num_sems,grades=grade_hash,class_id=class_dist.id,professor_id=professor)
    session.add(dist)
    session.commit()
    

df = pd.read_csv("combined_clean_data.csv",dtype={"CLASS_SECTION":str})


session.add_all([Libed(name=libed) for libed in libed_mapping.values()])
session.commit()

print("Beginning Insertion")
df = pd.read_csv("combined_clean_data.csv",dtype={"CLASS_SECTION":str})
df.groupby(["FULL_NAME","HR_NAME"]).apply(process_class)
print("Finished Insertion")

print("Inserting Libed Search")
for term in TERMS:
    dept_dists = session.query(DepartmentDistribution).all()
    for dept_dist in dept_dists:
        fetch_asr(dept_dist, term)
print("Finished Libed Search")


