# so lowkey I just fucked this file up, the semi original is below but this uses the csv from coursedog
# for all the courses and courseInfo for all the libed info like honors, topics or enviroment etc.
# credit to https://github.com/003MattB/ScheduleBuilderImproved this github for saving us on how to use courseInfo
# this should be cleaned up with the rest of the code

import pandas as pd
import requests
import datetime
import time
from .abstract import EnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
from mapping.mappings import catalog_mapping # Assuming this is still needed for other parts

# A mapping of API attribute identifiers to the names stored in the database.
# The key is a combination of the attribute's "family" and "attribute_id" from the API response.
API_LIBED_MAPPING = {
    "HON_HON": "Honors",
    "CLE_WI": "Writing Intensive",
    "CLE_AH": "Arts/Humanities",
    "CLE_BIOL": "Biological Sciences",
    "CLE_CIV": "Civic Life and Ethics",
    "CLE_ENV": "Environment",
    "CLE_GP": "Global Perspectives",
    "CLE_HIS": "Historical Perspectives",
    "CLE_HP": "Historical Perspectives",  # Alias for Historical Perspectives Core
    "CLE_LITR": "Literature",
    "CLE_MATH": "Mathematical Thinking",
    "CLE_PHYS": "Physical Sciences",
    "CLE_DSJ": "Race, Power, and Justice in the United States",
    "CLE_SOCS": "Social Sciences",
    "CLE_TS": "Technology and Society",
    # Attributes below don't fit the family_id pattern and are matched by attribute_id alone
    "FSEM": "Freshman Seminar",
    "TOP": "Topics Course"
}

class CourseDogEnhance(EnhanceBase):

    def _calculate_current_term(self) -> str:
        """
        Calculates the current UMN term code (STERM) based on the current date.
        Example: Fall 2025 -> (2025-1900) = 125, code = 9 -> "1259"
        """
        now = datetime.datetime.now()
        year = now.year
        month = now.month

        if 1 <= month <= 5:  # Spring
            semester_code = '3'
        elif 6 <= month <= 8:  # Summer
            semester_code = '5'
        else:  # Fall (September onwards)
            semester_code = '9'
        
        sterm = f"{year - 1900}{semester_code}"
        return sterm

    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        dept = dept_dist.dept_abbr
        campus_str = str(dept_dist.campus)

        # This CSV provides the master list of courses to check and update.
        csv_path = "CLASS_DATA/courses-report.2025-08-15.csv"
        
        try:
            df = pd.read_csv(csv_path)
        except FileNotFoundError:
            print(f"[API Enhance] Master course CSV not found: {csv_path}")
            return
        
        # Mapping for the main CSV campus names
        campus_mapping = { "UMNTC": "Twin Cities", "UMNRO": "Rochester" }
        csv_campus_name = campus_mapping.get(campus_str)

        if csv_campus_name is None:
            print(f"[API Enhance] Invalid campus code: {campus_str}")
            return

        # Filter the DataFrame for the specific department and campus
        dept_courses = df[
            (df["Course subject code"] == dept) &
            (df["Campus"] == csv_campus_name)
        ]

        if dept_courses.empty:
            print(f"[API Enhance] No courses found in master CSV for {dept} on {campus_str}.")
            return
        
        # Mapping for campus codes used in the API URL
        campus_api_mapping = {
            "UMNTC": "umntc",
            "UMNRO": "umnro",
            "UMNDL": "umndl",
            "UMNCR": "umncr",
            "UMNMO": "umnmo",
        }
        api_campus = campus_api_mapping.get(campus_str)
        if not api_campus:
            print(f"[API Enhance] Invalid campus code for API call: {campus_str}")
            return
        
        current_term = self._calculate_current_term()
        session = Session()

        try:
            for _, course in dept_courses.iterrows():
                course_nbr = str(course["Course number"])

                # --- Fetch Course Attributes from UMN Courses API ---
                api_url = f"https://courses.umn.edu/campuses/{api_campus}/terms/{current_term}/courses.json?q=catalog_number={course_nbr},subject_id={dept}"
                attributes_for_course = []
                MAX_RETRIES = 3
                for attempt in range(MAX_RETRIES):
                    try:
                        response = requests.get(api_url, timeout=30)
                        response.raise_for_status()  # Raise an exception for 4xx or 5xx status codes
                        data = response.json()

                        if data.get("courses"):
                            course_data = data["courses"][0]  # Assume the first result is the correct one
                            api_attributes = course_data.get("course_attributes", [])
                        
                            for attr in api_attributes:
                                family = attr.get("family", "")
                                attr_id = attr.get("attribute_id", "")
                            
                                # Create a key to look up in our mapping dictionary
                                api_key = f"{family}_{attr_id}"
                            
                                if api_key in API_LIBED_MAPPING:
                                    attributes_for_course.append(API_LIBED_MAPPING[api_key])
                                elif attr_id in API_LIBED_MAPPING: # Fallback for keys like 'FSEM'
                                    attributes_for_course.append(API_LIBED_MAPPING[attr_id])
                        break

                    except requests.exceptions.RequestException as e:
                        print(f"[API Enhance] Attempt {attempt + 1} failed for {dept} {course_nbr}: {e}")
                        if attempt + 1 == MAX_RETRIES:
                            # If this was the last attempt, print a final error and continue to the next course
                            print(f"[API Enhance] All retries failed for {dept} {course_nbr}. Skipping.")
                            continue
                        else:
                            # Wait for 2 seconds before trying again
                            time.sleep(2)
                
                # --- Find and Update the Course in the Database ---
                class_dist = session.query(ClassDistribution).filter(
                    and_(
                        ClassDistribution.dept_abbr == dept, 
                        ClassDistribution.course_num == course_nbr, 
                        ClassDistribution.campus == campus_str
                    )
                ).first()

                if class_dist:
                    # Update basic course info from the master CSV
                    class_dist.class_desc = course["Course name"]
                    class_dist.onestop_desc = course["Course description"]
                    class_dist.cred_min = course["Minimum credits"]
                    class_dist.cred_max = course["Maximum credits"]
                    
                    # Overwrite existing attributes with fresh data from the API
                    class_dist.libeds.clear()
                    session.flush() # Ensure the clear operation is executed before adding new ones

                    # Use set() to ensure each attribute is unique
                    for attribute_name in set(attributes_for_course):
                        libed_obj = session.query(Libed).filter(Libed.name == attribute_name).first()
                        if libed_obj is None:
                            print(f"[API Enhance] Libed '{attribute_name}' not found in DB for {dept} {course_nbr}")
                        elif libed_obj not in class_dist.libeds:
                            class_dist.libeds.append(libed_obj)
                    
                    updated_libeds = [l.name for l in class_dist.libeds]
                    print(f"[API Enhance] Updated [{class_dist.campus}] {dept} {course_nbr} | Libeds: {updated_libeds}")
                
                # Be a good citizen and don't spam the API # said by our AI overlord
                time.sleep(0.1)

        finally:
            print("[API Enhance] Committing changes to the database.")
            session.commit()
            session.close()

# import pandas as pd
# from .abstract import EnhanceBase
# from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
# import requests
# from mapping.mappings import catalog_mapping, libed_mapping


# class CourseDogEnhance(EnhanceBase):
#     def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
#         dept = dept_dist.dept_abbr
#         campus = dept_dist.campus

#         campus_str = str(campus)
#         # link=f"https://app.coursedog.com/api/v1/cm/umn_{'umntc_rochester' if campus_str == 'UMNRO' else campus_str.lower()}_peoplesoft/courses/?subjectCode={dept}"

#         csv_path = f"CLASS_DATA/courses-report.2025-08-15.csv"
        
#         # load CSV into pandas DataFrame
#         try:
#             df = pd.read_csv(csv_path)
#         except FileNotFoundError:
#             print(f"[CD Enhance] CSV file not found: {csv_path}")
#             return
        
#         # mapping dictionary
#         campus_mapping = {
#         "UMNTC": "Twin Cities",
#         "UMNRO": "Rochester"
#         }
#         csv_campus_name = campus_mapping.get(campus_str)

#         if csv_campus_name is None:
#             print(f"[CD Enhance] Invalid campus code: {campus_str}")
#             return

#         # Filter the DataFrame using the correct campus name
#         dept_courses = df[
#             (df["Course subject code"] == dept) &
#             (df["Campus"] == csv_campus_name)
#         ]

#         if dept_courses.empty:
#             print(f"[CD Enhance] No courses found for {dept} on {campus_str} campus.")
#             return
        
#         # libed csvs
#         libed_csvs = {
#             "Global Perspectives": "CLASS_DATA/LIBED/courses-report.2025-08-15.GlobalPerspectives.csv",
#             "Civic Life and Ethics": "CLASS_DATA/LIBED/courses-report.2025-08-15.CivicLifeEthics.csv",
#             "Environment": "CLASS_DATA/LIBED/courses-report.2025-08-15.Environment.csv",
#             "Arts/Humanities": "CLASS_DATA/LIBED/courses-report.2025-08-15.ArtsHumanities.csv",
#             "Biological Sciences": "CLASS_DATA/LIBED/courses-report.2025-08-15.BiologicalScience.csv",
#             "Historical Perspectives": "CLASS_DATA/LIBED/courses-report.2025-08-15.HistoricalPerspectives.csv",
#             "Literature": "CLASS_DATA/LIBED/courses-report.2025-08-15.Literature.csv",
#             "Race, Power, and Justice in the United States": "CLASS_DATA/LIBED/courses-report.2025-08-15.RacePowerJustice.csv",
#             "Social Sciences": "CLASS_DATA/LIBED/courses-report.2025-08-15.SocialSciences.csv",
#             "Technology and Society": "CLASS_DATA/LIBED/courses-report.2025-08-15.TechnologySociety.csv",
#             "Mathematical Thinking": "CLASS_DATA/LIBED/courses-report.2025-08-15.MathematicalThinking.csv",
#             "Physical Sciences": "CLASS_DATA/LIBED/courses-report.2025-08-15.PhysicalSciences.csv",
#         }

#         libed_courses_by_name = {}

#         for libed_name, libed_file_path in libed_csvs.items():
#             try:
#                 libed_df = pd.read_csv(libed_file_path)
#                 # Create a set of tuples for quick lookups: (subject_code, course_number)
#                 libed_courses_by_name[libed_name] = set(zip(libed_df["Course subject code"], libed_df["Course number"]))
#             except FileNotFoundError:
#                 print(f"[CD Enhance] Libed CSV not found: {libed_file_path}")

#         session = Session()
#         for _,course in dept_courses.iterrows():
#             course_nbr = course["Course number"]

#             # --- Libed and Attribute Processing ---
#             attributes_for_course = []
            
#             # Use the pre-loaded sets to check for liberal education attributes
#             course_key = (dept, str(course_nbr))
#             for libed_name, courses_in_set in libed_courses_by_name.items():
#                 if course_key in courses_in_set:
#                     attributes_for_course.append(libed_name)

#             is_honors = 'H' in course_nbr or 'V' in course_nbr
#             is_writing_intensive = 'W' in course_nbr or 'V' in course_nbr

#             if is_honors:
#                 attributes_for_course.append("Honors")

#             if is_writing_intensive:
#                 attributes_for_course.append("Writing Intensive")

#             class_dist = session.query(ClassDistribution).filter(
#                 and_(
#                     ClassDistribution.dept_abbr == dept, 
#                     ClassDistribution.course_num == course_nbr, 
#                     ClassDistribution.campus == campus_str
#                 )
#             ).first()

#             if class_dist:
#                 class_dist.class_desc = course["Course name"]
#                 class_dist.onestop_desc = course["Course description"]
#                 class_dist.cred_min = course["Minimum credits"]
#                 class_dist.cred_max = course["Maximum credits"]
#                 # figure out how to get this shit now
#                 # class_dist.onestop = f"https://{catalog_mapping.get(campus_str)}.catalog.prod.coursedog.com/courses/{course['sisId']}"
                
#                 # cooked on this sections for now

#                 # for attribute in attributes_for_course:
#                 #     if attribute not in libed_mapping:
#                 #         print("[CD Enhance] Libed not found:", attribute)
#                 #         continue
                    
#                 #     libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute]).first()
#                 #     if libed_dist == None:
#                 #         print("[CD Enhance] Libed not found:", attribute, libed_mapping[attribute])
#                 #     elif class_dist not in libed_dist.class_dists:
#                 #         libed_dist.class_dists.append(class_dist) 

#                 for attribute in attributes_for_course:
#                     libed_obj = session.query(Libed).filter(Libed.name == attribute).first()
#                     if libed_obj is None:
#                         print(f"[CD Enhance] Libed object not found in DB: {attribute}")
#                     elif class_dist not in libed_obj.class_dists:
#                         libed_obj.class_dists.append(class_dist)

                
#                 print(f"[CD Enhance] Updated [{class_dist.campus}] {class_dist.dept_abbr} {class_dist.course_num} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
            
#             session.commit()
#             session.close()