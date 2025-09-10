# courseInfo.py - Handles API calls to UMN CourseInfo API for course attributes/libed information
# credit to https://github.com/003MattB/ScheduleBuilderImproved this github for saving us on how to use courseInfo

from .abstract import EnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
import requests
import datetime
from mapping.mappings import libed_mapping


class CourseInfoEnhance(EnhanceBase):
    
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
        else:  # Fall
            semester_code = '9'
        
        sterm = f"{year - 1900}{semester_code}"
        return sterm
    
    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        dept = dept_dist.dept_abbr
        campus = dept_dist.campus
        campus_str = str(campus)

        # Only process UMNTC and UMNRO campuses
        if campus_str not in ["UMNTC", "UMNRO"]:
            return
        
        current_term = self._calculate_current_term()
        link = f"https://courses.umn.edu/campuses/{campus_str.lower()}/terms/{current_term}/courses.json?q=subject_id={dept}"

        with requests.get(link) as url:
            try:
                req = url.json()
                courses = req.get("courses", [])
            except ValueError:
                print("Json malformed, icky!")
                return
            
        for course in courses:
            course_nbr = course["catalog_number"]
            session = Session()
            class_dist = session.query(ClassDistribution).filter(and_(ClassDistribution.dept_abbr == dept, ClassDistribution.course_num == course_nbr, ClassDistribution.campus == campus)).first()
            if class_dist:
                class_dist.libeds.clear()
                
                for attribute in course.get("course_attributes", []):
                    family = attribute.get("family", "")
                    attr_id = attribute.get("attribute_id", "")
                    api_key = f"{family}_{attr_id}"
                    
                    if api_key in libed_mapping:
                        libed_name = libed_mapping[api_key]
                    elif attr_id in libed_mapping:
                        libed_name = libed_mapping[attr_id]
                    else:
                        continue
                    # Removed logging for libed not found due to many irrelevant unmapped attributes
                    
                    libed_dist = session.query(Libed).filter(Libed.name == libed_name).first()
                    if class_dist not in libed_dist.class_dists:
                        libed_dist.class_dists.append(class_dist)
                        
                print(f"[CourseInfo] Updated [{class_dist.campus}] {class_dist.dept_abbr} {class_dist.course_num} : Libeds: ({class_dist.libeds})")
            session.commit()
            session.close()
