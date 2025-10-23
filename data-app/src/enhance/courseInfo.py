# courseInfo.py - Handles API calls to UMN CourseInfo API for course attributes/libed information
# credit to https://github.com/003MattB/ScheduleBuilderImproved this github for saving us on how to use courseInfo

from .abstract import EnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
import httpx
import datetime
from mapping.mappings import libed_mapping
import asyncio

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
    
    def _process_course_data(self, courses: list[dict], dept: str, campus: str) -> None:
        session = Session()
        try:
            for course in courses:
                course_nbr = course["catalog_number"]
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
                        # Removed logging for libed not found due to many irrelevant unmapped attributes making it hard to monitor
                        # [CI Enhanced] Libed mapping not found for attribute: ONL_ONLINE / ONLINE
                        # [CI Enhanced] Libed mapping not found for attribute: DELM_08 / 08
                        # There are more examples like this but they are not useful to log
                        
                        libed_dist = session.query(Libed).filter(Libed.name == libed_name).first()
                        if libed_dist and class_dist not in libed_dist.class_dists:
                            libed_dist.class_dists.append(class_dist)
                        
                    print(f"[CI Enhance] Updated [{class_dist.campus}] {class_dist.dept_abbr} {class_dist.course_num} : Libeds: ({class_dist.libeds})")
            session.commit()
        except Exception as e:
            print(f"[CI ERROR] Error processing course data for {dept} at {campus}: {e}")
            session.rollback()
        finally:
            session.close()

    async def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:

        async with asyncio.Semaphore(10):
            dept = dept_dist.dept_abbr
            campus = dept_dist.campus
            campus_str = str(campus)

            # Only process UMNTC and UMNRO campuses
            if campus_str not in ["UMNTC", "UMNRO"]:
                return
            
            current_term = self._calculate_current_term()
            link = f"https://courses.umn.edu/campuses/{campus_str.lower()}/terms/{current_term}/courses.json?q=subject_id={dept}"

            courses = []
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(link)
                    response.raise_for_status()
                    req = response.json()
                    courses = req.get("courses", [])
                except (httpx.RequestError, ValueError) as e:
                    print(f"[CI ERROR] Failed to fetch or parse data for {dept} at {campus_str}: {e}")
                    return
        
            if not courses:
                print(f"[CI INFO] No courses found for {dept} at {campus_str}")
                return

            try:
                await asyncio.to_thread(self._process_course_data, courses, dept, campus)
            except Exception as e:
                print(f"[CI ERROR] Error in processing thread for {dept}: {e}")
                return

            