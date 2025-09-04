import argparse
import pandas as pd
import numpy as np
from db.Models import Session, Professor, DepartmentDistribution, TermDistribution

from src.generation.process import Process
from src.enhance.courseDog import CourseDogEnhance
from src.rmp.rmp import RMP
from src.srt.srt import SRT

# Add all libeds as defined in libed_mapping. This is a constant addition as there are a finite amount of libed requirements.

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run Data Generation!')
    parser.add_argument("clean_filename", type=str, help="The filename of the CSV file to process.")
    parser.add_argument('-dr','--disableRMP', dest='DisableRMP', action='store_true', help='Disables RMP Search.')
    parser.add_argument('-ds','--disableSRT', dest='DisableSRT', action='store_true', help='Disables SRT Updating for Class Distributions.')
    parser.add_argument('-dc','--disableCD', dest='DisableCD', action='store_true', help='Disables CourseDog Updating for Class Libeds, Titles, and Onestop Links.')

    args = parser.parse_args()
    clean_filename = args.clean_filename

    print(f"[MAIN] Loading Data")
    df = pd.read_csv(clean_filename, dtype={"CLASS_SECTION": str})
    print(f"[MAIN] Loaded Data from {clean_filename}")

    print("[MAIN] Defining Libeds")
    Process.process_libeds()
    print("[MAIN] Libeds Defined")

    print("[MAIN] Adding Instructors")
    # Add All Instructors Including an "Unknown Instructor" for non-attributed values to the Database
    session = Session()
    prof_list = np.array([prof.name for prof in session.query(Professor).all()])
    session.close()
    data_list = df["NAME"].unique()
    diff_list = np.setdiff1d(data_list,prof_list)
    if diff_list.size > 0:
        print(f"[MAIN] Adding {len(diff_list)} new instructors: {diff_list}")
        for x in diff_list:
            Process.process_prof(x)
    else:
        print("[MAIN] No new instructors found.")

    session = Session()
    if session.query(Professor).filter(Professor.name == "Unknown Instructor").first() == None:
        session.add(Professor(name="Unknown Instructor"))
        session.commit()
        print("[MAIN] Added 'Unknown Instructor' to Instructors.")
    session.close()

    print("[MAIN] Finished Instructor Insertion")

    print("[MAIN] Adding Departments")
    session = Session()
    dept_list = [(dept.campus, dept.dept_abbr) for dept in session.query(DepartmentDistribution).all()]
    session.close()
    diff_list = set(zip(df['CAMPUS'], df["SUBJECT"])).difference(set(dept_list))
    if len(diff_list) > 0:
        missingDepts = []
        for x in diff_list:
            print(f"[MAIN] Processing Department: {x[0], x[1]}")
            try:
                Process.process_dept(x)
            except ValueError as e:
                hasError = True
                missingDepts.append(x)

        if len(missingDepts) > 0:
            print(f"[MAIN] The following departments failed to process: {sorted(missingDepts)}")
            raise ValueError("[MAIN] One or more departments failed to process. See errors above.")
    
    else:
        print("[MAIN] No new departments found.")
    
    print("[MAIN] Finished Department Insertion")

    print("[MAIN] Generating Distributions")
    session = Session()
    new_additions = df[~df["TERM"].isin(list(set(TermDist.term for TermDist in session.query(TermDistribution).all())))]
    session.close()
    new_additions.groupby(["TERM", "NAME", "FULL_NAME", "CAMPUS"], group_keys=False).apply(Process.process_dist)
    print("[MAIN] Finished Generating Distributions")

    if not args.DisableCD:
        print("[MAIN] Beginning CourseDog Updating")
        session = Session()
        dept_dists = session.query(DepartmentDistribution).all()
        session.close()
        CourseDogEnhance().enhance(dept_dists,clean_filename)
        print("[MAIN] Finished CourseDog Updating")
    
    if not args.DisableRMP:
        print("[MAIN] RMP Update For Instructors")
        RMP().update_profs()
        print("[MAIN] RMP Updated")
    
    if not args.DisableSRT:
        print("[MAIN] Beginning SRT Updating")
        SRT.initialize("SRT_DATA/main.csv")
        SRT.insertReviews()
        print("[MAIN] Finished SRT Updating")