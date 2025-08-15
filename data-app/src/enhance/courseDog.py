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

        csv_path = f"data-app/CLASS_DATA/courses-report.2025-08-15.csv"
        
        # load CSV into pandas DataFrame
        try:
            df = pd.read_csv(csv_path)
        except FileNotFoundError:
            print(f"[CD Enhance] CSV file not found: {csv_path}")
            return
        
        # filter DataFrame for the specific department and campus
        dept_courses = df[
            (df["Course subject code"] == dept) &
            (df["Campus"] == ("Twin Cities" if campus_str == "UMNTW" else "Rochester" if campus_str == "UMNRO" else None))
        ]

        if dept_courses.empty:
            print(f"[CD Enhance] No courses found for {dept} on {campus_str} campus.")
            return

        session = Session()
        for _,course in dept_courses.iterrows():
            course_nbr = course["Course number"]
            
            class_dist = session.query(ClassDistribution).filter(
                and_(
                    ClassDistribution.dept_abbr == dept, 
                    ClassDistribution.course_num == str(int(course_nbr)), 
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
                """ for attribute in course["attributes"]:
                    if attribute not in libed_mapping:
                        print("[CD Enhance] Libed not found:", attribute)
                        continue
                    
                    libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute]).first()
                    if libed_dist == None:
                        print("[CD Enhance] Libed not found:", attribute, libed_mapping[attribute])
                    elif class_dist not in libed_dist.class_dists:
                        libed_dist.class_dists.append(class_dist) """
                print(f"[CD Enhance] Updated [{class_dist.campus}] {class_dist.dept_abbr} {class_dist.course_num} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
            session.commit()
            session.close()