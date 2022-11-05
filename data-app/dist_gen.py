import pandas as pd
from collections import Counter
from db.Models import *
from mapping.dept_name import mapping

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
    # retVal = f"{prof_name} has taught {class_name} ({class_descr}) for {num_sems} {'term' if num_sems == 1 else 'terms'} with {num_students} total students. They have a grade distribution of {str(grade_hash)}\n"
    # Begin Insertion
    class_dist = session.query(ClassDistribution).filter(ClassDistribution.class_name == class_name).first()
    dept = session.query(DepartmentDistribution).filter(DepartmentDistribution.dept_abbr == dept_abbr).first()
    if class_dist == None:
        if dept == None:
            dept = DepartmentDistribution(dept_abbr=dept_abbr,dept_name=mapping.get(dept_abbr,"Unknown Department"))
            session.add(dept)
            session.flush()
        class_dist = ClassDistribution(class_name=class_name,class_desc=class_descr,total_students=num_students,total_grades=grade_hash,department_id=dept.id)
        session.add(class_dist)
        session.flush()
    else:
        class_dist.total_grades = Counter(class_dist.total_grades) + Counter(grade_hash)
        class_dist.total_students += num_students
    if prof_name != "Unknown Professor" and session.query(Professor).filter(Professor.name == prof_name).first() == None:
        professor = Professor(name=prof_name,RMP_score=0.0)
        session.add(professor)
        session.flush()
        professor = professor.id
    else:
        professor = None
    dist = Distribution(students=num_students,terms=num_sems,grades=grade_hash,class_id=class_dist.id,professor_id=professor)
    session.add(dist)
    session.commit()
    

df = pd.read_csv("cleaned_data.csv",dtype={3:str})

# print(df[(df["FULL_NAME"]=="CSCI 2021") & (df["HR_NAME"]=="Kauffman,Christopher Daniel")].groupby("TERM").nunique().sum())
print(df.groupby(["FULL_NAME","HR_NAME"]).apply(process_class))

# professor = session.query(Professor).filter(Professor.name == "Kauffman,Christopher Daniel").first()
