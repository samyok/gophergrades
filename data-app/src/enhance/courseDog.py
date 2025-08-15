import pandas as pd
from .abstract import EnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
import requests
from mapping.mappings import catalog_mapping, libed_mapping


class CourseDogEnhance(EnhanceBase):
    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        dept = dept_dist.dept_abbr
        campus = dept_dist.campus

        campus_str = str(campus)
        # link=f"https://app.coursedog.com/api/v1/cm/umn_{'umntc_rochester' if campus_str == 'UMNRO' else campus_str.lower()}_peoplesoft/courses/?subjectCode={dept}"

        csv_path = f"CLASS_DATA/courses-report.2025-08-15.csv"
        
        # load CSV into pandas DataFrame
        try:
            df = pd.read_csv(csv_path)
        except FileNotFoundError:
            print(f"[CD Enhance] CSV file not found: {csv_path}")
            return
        
        # mapping dictionary
        campus_mapping = {
        "UMNTC": "Twin Cities",
        "UMNRO": "Rochester"
        }
        csv_campus_name = campus_mapping.get(campus_str)

        if csv_campus_name is None:
            print(f"[CD Enhance] Invalid campus code: {campus_str}")
            return

        # Filter the DataFrame using the correct campus name
        dept_courses = df[
            (df["Course subject code"] == dept) &
            (df["Campus"] == csv_campus_name)
        ]

        if dept_courses.empty:
            print(f"[CD Enhance] No courses found for {dept} on {campus_str} campus.")
            return
        
        # libed csvs
        libed_csvs = {
            "Global Perspectives": "CLASS_DATA/LIBED/courses-report.2025-08-15.GlobalPerspectives.csv",
            "Civic Life and Ethics": "CLASS_DATA/LIBED/courses-report.2025-08-15.CivicLifeEthics.csv",
            "Environment": "CLASS_DATA/LIBED/courses-report.2025-08-15.Environment.csv",
            "Arts/Humanities": "CLASS_DATA/LIBED/courses-report.2025-08-15.ArtsHumanities.csv",
            "Biological Sciences": "CLASS_DATA/LIBED/courses-report.2025-08-15.BiologicalScience.csv",
            "Historical Perspectives": "CLASS_DATA/LIBED/courses-report.2025-08-15.HistoricalPerspectives.csv",
            "Literature": "CLASS_DATA/LIBED/courses-report.2025-08-15.Literature.csv",
            "Race, Power, and Justice in the United States": "CLASS_DATA/LIBED/courses-report.2025-08-15.RacePowerJustice.csv",
            "Social Sciences": "CLASS_DATA/LIBED/courses-report.2025-08-15.SocialSciences.csv",
            "Technology and Society": "CLASS_DATA/LIBED/courses-report.2025-08-15.TechnologySociety.csv",
            "Mathematical Thinking": "CLASS_DATA/LIBED/courses-report.2025-08-15.MathematicalThinking.csv",
            "Physical Sciences": "CLASS_DATA/LIBED/courses-report.2025-08-15.PhysicalSciences.csv",
        }

        libed_courses_by_name = {}

        for libed_name, libed_file_path in libed_csvs.items():
            try:
                libed_df = pd.read_csv(libed_file_path)
                # Create a set of tuples for quick lookups: (subject_code, course_number)
                libed_courses_by_name[libed_name] = set(zip(libed_df["Course subject code"], libed_df["Course number"]))
            except FileNotFoundError:
                print(f"[CD Enhance] Libed CSV not found: {libed_file_path}")

        session = Session()
        for _,course in dept_courses.iterrows():
            course_nbr = course["Course number"]

            # --- Libed and Attribute Processing ---
            attributes_for_course = []
            
            # Use the pre-loaded sets to check for liberal education attributes
            course_key = (dept, str(course_nbr))
            for libed_name, courses_in_set in libed_courses_by_name.items():
                if course_key in courses_in_set:
                    attributes_for_course.append(libed_name)

            is_honors = 'H' in course_nbr or 'V' in course_nbr
            is_writing_intensive = 'W' in course_nbr or 'V' in course_nbr

            if is_honors:
                attributes_for_course.append("Honors")

            if is_writing_intensive:
                attributes_for_course.append("Writing Intensive")

            class_dist = session.query(ClassDistribution).filter(
                and_(
                    ClassDistribution.dept_abbr == dept, 
                    ClassDistribution.course_num == course_nbr, 
                    ClassDistribution.campus == campus_str
                )
            ).first()

            if class_dist:
                class_dist.class_desc = course["Course name"]
                class_dist.onestop_desc = course["Course description"]
                class_dist.cred_min = course["Minimum credits"]
                class_dist.cred_max = course["Maximum credits"]
                # figure out how to get this shit now
                # class_dist.onestop = f"https://{catalog_mapping.get(campus_str)}.catalog.prod.coursedog.com/courses/{course['sisId']}"
                # cooked on this sections for now

                # for attribute in attributes_for_course:
                #     if attribute not in libed_mapping:
                #         print("[CD Enhance] Libed not found:", attribute)
                #         continue
                    
                #     libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute]).first()
                #     if libed_dist == None:
                #         print("[CD Enhance] Libed not found:", attribute, libed_mapping[attribute])
                #     elif class_dist not in libed_dist.class_dists:
                #         libed_dist.class_dists.append(class_dist) 

                for attribute in attributes_for_course:
                    libed_obj = session.query(Libed).filter(Libed.name == attribute).first()
                    if libed_obj is None:
                        print(f"[CD Enhance] Libed object not found in DB: {attribute}")
                    elif class_dist not in libed_obj.class_dists:
                        libed_obj.class_dists.append(class_dist)

                
                print(f"[CD Enhance] Updated [{class_dist.campus}] {class_dist.dept_abbr} {class_dist.course_num} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
            
            session.commit()
            session.close()