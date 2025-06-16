from .abstract import EnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
import requests
from mapping.mappings import catalog_mapping, libed_mapping


class CourseDogEnhance(EnhanceBase):
    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        dept = dept_dist.dept_abbr
        campus = dept_dist.campus

        campus_str = str(campus)
        link=f"https://app.coursedog.com/api/v1/cm/umn_{'umntc_rochester' if campus_str == 'UMNRO' else campus_str.lower()}_peoplesoft/courses/?subjectCode={dept}"

        with requests.get(link) as url:
            try:
                req=url.json()
            except ValueError:
                print("Json malformed, icky!")
                req={}
                return
            
        for course in req.values():
            course_nbr = course["courseNumber"]
            session = Session()
            class_dist = session.query(ClassDistribution).filter(and_(ClassDistribution.dept_abbr == dept, ClassDistribution.course_num == course_nbr, ClassDistribution.campus == campus)).first()
            if class_dist:
                class_dist.class_desc = course["longName"]
                class_dist.onestop_desc = course["description"]
                class_dist.cred_min = course["credits"]["creditHours"]["min"]
                class_dist.cred_max = course["credits"]["creditHours"]["max"]
                class_dist.onestop = f"https://{catalog_mapping.get(campus_str)}.catalog.prod.coursedog.com/courses/{course['sisId']}"
                for attribute in course["attributes"]:
                    if attribute not in libed_mapping:
                        print("[CD Enhance] Libed not found:", attribute)
                        continue
                    
                    libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute]).first()
                    if libed_dist == None:
                        print("[CD Enhance] Libed not found:", attribute, libed_mapping[attribute])
                    elif class_dist not in libed_dist.class_dists:
                        libed_dist.class_dists.append(class_dist)
                print(f"[CD Enhance] Updated [{class_dist.campus}] {class_dist.dept_abbr} {class_dist.course_num} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
            session.commit()
            session.close()