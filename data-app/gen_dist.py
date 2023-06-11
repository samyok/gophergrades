import pandas as pd
import numpy as np
from collections import Counter
from db.Models import *
from mapping.mappings import dept_mapping, libed_mapping
from gen_rmp import *
from gen_srt import *
from gen_asr import *
from gen_courseinfo import *

"""
    This file handles post-processing the cleaned data and feature engineering. Run this once you've
    properly cleaned and combined the old and new data. Keep in mind that you'll need to update the constants below.
    It is in this file where we associate classes with their libeds, their onestop, and their credits. Additionally,
    we also associate professors with their RMP score should it be found. Lastly, this is also where we will utilize
    the SRT data to gain more information about classes.
"""
# Runs the generate function to fetch data from API
# TODO: Potential switch to GraphQL API?

def process_dist(x: pd.DataFrame) -> None:
    """
    On a grouped element by FULL_NAME, TERM, and HR_NAME (individual class taught by a specific professor) it will generate
    a distribution and associate it with the appropriate class distribution and professor. Should neither of those two exist
    then it will create them as well. If the department of the class doesn't exist then that will be created.

    :type x: pd.DataFrame
    """
    prof_name = x["HR_NAME"].iloc[0]
    class_name = x["FULL_NAME"].iloc[0]
    dept_abbr = x["SUBJECT"].iloc[0]
    class_descr = x["DESCR"].iloc[0]
    term = x["TERM"].iloc[0]
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
    grade_hash = x.groupby("CRSE_GRADE_OFF")["GRADE_HDCNT"].sum().to_dict()
    num_students = sum(grade_hash.values())
    # Begin Insertion
    class_dist = session.query(ClassDistribution).filter(ClassDistribution.class_name == class_name).first()
    dept = session.query(DepartmentDistribution).filter(DepartmentDistribution.dept_abbr == dept_abbr).first()
    prof = session.query(Professor).filter(Professor.name == prof_name).first() or session.query(Professor).filter(Professor.name == "Unknown Instructor").first()
    if class_dist == None:
        class_dist = ClassDistribution(class_name=class_name,class_desc=class_descr,total_students=num_students,total_grades=grade_hash,department_id=dept.id)
        session.add(class_dist)
        session.flush()
        # print(f"Created New Class Distribution {class_dist.class_name}")
    else:
        class_dist.total_grades = Counter(class_dist.total_grades) + Counter(grade_hash)
        class_dist.total_students += num_students

    dist = session.query(Distribution).filter(Distribution.class_id == class_dist.id, Distribution.professor_id == prof.id).first()
    
    if dist == None:
        dist = Distribution(class_id = class_dist.id, professor_id = prof.id)
        session.add(dist)
        session.flush()
        # print(f"Created New Distribution Linking {class_dist.class_name} to {prof.name}")

    if session.query(TermDistribution).filter(TermDistribution.term == term, TermDistribution.dist_id==dist.id).first() == None:
        term_dist = TermDistribution(students=num_students,grades=grade_hash,dist_id=dist.id, term=int(term))
        session.add(term_dist)
        session.commit()
        # print(f"Added Distribution for {prof.name}'s {class_dist.class_name} for {term_to_name(term)} with {term_dist.students} students.")
    
def process_prof(prof_name:str):
    professor = Professor(name=prof_name)
    session.add(professor)
    session.commit()
    # print(f"Added New Professor {professor.name}.")

def process_dept(dept_abbr:str):
    dept = DepartmentDistribution(dept_abbr=dept_abbr,dept_name=dept_mapping.get(dept_abbr,"Unknown Department"))
    session.add(dept)
    session.commit()
    # print(f"Created New Department: {dept.dept_abbr} : {dept.dept_name}")

def gen_terms(term_init:int) -> list:
    if term_init % 10 == 3:
        return [term_init+6,term_init+2,term_init,term_init-4,term_init-8]
    elif term_init % 10 == 5:
        return [term_init+8,term_init+4,term_init,term_init-2,term_init-6]
    elif term_init % 10 == 9:
        return [term_init+6,term_init+4,term_init,term_init-4,term_init-6]


# Add all libeds as defined in libed_mapping. This is a constant addition as there are a finite amount of libed requirements.
if len(session.query(Libed).all()) == 0:
    session.add_all([Libed(name=libed) for libed in libed_mapping.values()])
    session.commit()

if __name__ == "__main__":
    df = pd.read_csv("CLASS_DATA/SPR2023_cleaned_data.csv",dtype={"CLASS_SECTION":str})
    print("Loaded Data!")
    print("Adding Profs")
    # Add All Professors Including an "Unknown Instructor" for non-attributed values to the Database
    prof_list = np.array([prof.name for prof in session.query(Professor).all()])
    data_list = df["HR_NAME"].unique()
    diff_list = np.setdiff1d(data_list,prof_list)
    if diff_list.size > 0:
        print(f"Adding {len(diff_list)} new professors: {diff_list}")
        for x in diff_list:
            process_prof(x)
    else:
        print("No new professors found.")
    
    if session.query(Professor).filter(Professor.name == "Unknown Instructor").first() == None:
        session.add(Professor(name="Unknown Instructor"))
        session.commit()

    print("Finished Prof Insertion")

    print("RMP Update For Professors")
    getProfData()
    RMP_Update(session)
    print("RMP Updated")

    print("Adding Departments")
    dept_list = np.array([dept.dept_abbr for dept in session.query(DepartmentDistribution).all()])
    diff_list = np.setdiff1d(df["SUBJECT"].unique(),dept_list)
    if (len(diff_list) > 0):
        for x in diff_list:
            process_dept(x)
    print("Finished Department Insertion")

    print("Generating Distributions")
    new_additions = df[~df["TERM"].isin(list(set(TermDist.term for TermDist in session.query(TermDistribution).all())))]
    new_additions.groupby(["TERM","HR_NAME","FULL_NAME"],group_keys=False).apply(process_dist)
    print("Finished Generating Distributions")

    print("Beginning SRT Updating")
    srt_frame().apply(srt_updating,args=(session,),axis=1)
    print("Finished SRT Updating")

    print("Beginning Title Search")
    class_dists = session.query(ClassDistribution).order_by(ClassDistribution.class_name).all()
    for class_dist in class_dists:
        fetch_better_course_info(class_dist,session)
    print("Finished Title Search")

    print("Inserting Libed Search")
    # For each term, search every department's classes and insert information regarding credits, libeds, onestop link, etc
    # IF the class distribution has not already been modified.
    highest_term = max(new_additions["TERM"].unique())
    # Worry not about the CACHED variables, this is simply to help store previous requests in order to prevent redundant calls to an API
    # TERMS should hold the value of the next 2 terms, current term, and past 2 term in decreasing order.
    TERMS = gen_terms(highest_term)
    for term in TERMS:
        dept_dists = session.query(DepartmentDistribution).all()
        for dept_dist in dept_dists:
            fetch_asr(dept_dist, term, session)
    print("Finished Libed Search")