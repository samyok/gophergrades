# courseInfo.py - Handles API calls to UMN Courses API for course attributes/libed information
# credit to https://github.com/003MattB/ScheduleBuilderImproved this github for saving us on how to use courseInfo

import requests
import datetime
import time
import random
from .abstract import EnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
from mapping.mappings import libed_mapping

class CourseInfoEnhance(EnhanceBase):
    """Handles course enhancement using UMN Courses API for libed/attribute information"""

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
        """Enhance courses for a department using API calls to get libed information"""
        dept = dept_dist.dept_abbr
        campus_str = str(dept_dist.campus)

        # Only process UMNTC and UMNRO campuses
        if campus_str not in ["UMNTC", "UMNRO"]:
            print(f"[CourseInfo] Skipping {dept} on {campus_str} - only processing UMNTC and UMNRO")
            return

        # Add random delay to reduce concurrent database access
        initial_delay = random.uniform(0.5, 2.0)
        time.sleep(initial_delay)

        api_campus = campus_str.lower()
        if not api_campus:
            print(f"[CourseInfo] Invalid campus code for API call: {campus_str}")
            return
        
        current_term = self._calculate_current_term()
        
        # Simple retry mechanism for database locks
        max_retries = 3
        for attempt in range(max_retries):
            session = Session()
            try:
                # Get all courses for this department from database
                courses = session.query(ClassDistribution).filter(
                    and_(
                        ClassDistribution.dept_abbr == dept,
                        ClassDistribution.campus == campus_str
                    )
                ).all()

                for course in courses:
                    self._process_course_api(session, dept, course.course_num, campus_str, api_campus, current_term)
                
                session.commit()
                print(f"[CourseInfo] Successfully processed {len(courses)} courses for {dept}")
                break  # Success, exit retry loop
                
            except Exception as e:
                session.rollback()
                if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                    retry_delay = (attempt + 1) * 2.0 + random.uniform(0.5, 1.5)
                    print(f"[CourseInfo] Database locked for {dept}, retrying in {retry_delay:.1f}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    print(f"[CourseInfo] Error processing {dept}: {e}")
                    break
            finally:
                session.close()

    def _process_course_api(self, session, dept: str, course_nbr: str, campus_str: str, api_campus: str, current_term: str) -> None:
        """Process a single course with API calls to get libed information."""
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
                    course_api_data = data["courses"][0]  # Assume the first result is the correct one
                    api_attributes = course_api_data.get("course_attributes", [])
                
                    for attr in api_attributes:
                        family = attr.get("family", "")
                        attr_id = attr.get("attribute_id", "")
                    
                        # Create a key to look up in our mapping dictionary
                        api_key = f"{family}_{attr_id}"
                    
                        if api_key in libed_mapping:
                            attributes_for_course.append(libed_mapping[api_key])
                        elif attr_id in libed_mapping:  # Fallback for keys like 'FSEM'
                            attributes_for_course.append(libed_mapping[attr_id])
                break

            except requests.exceptions.RequestException as e:
                print(f"[CourseInfo] Attempt {attempt + 1} failed for {dept} {course_nbr}: {e}")
                if attempt + 1 == MAX_RETRIES:
                    # If this was the last attempt, print a final error and continue to the next course
                    print(f"[CourseInfo] All retries failed for {dept} {course_nbr}. Skipping.")
                    return
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
            try:
                # Overwrite existing libed attributes with fresh data from the API
                class_dist.libeds.clear()
                session.flush()  # Ensure the clear operation is executed before adding new ones

                # Use set() to ensure each attribute is unique
                for attribute_name in set(attributes_for_course):
                    libed_obj = session.query(Libed).filter(Libed.name == attribute_name).first()
                    if libed_obj is None:
                        print(f"[CourseInfo] Libed '{attribute_name}' not found in DB for {dept} {course_nbr}")
                    elif libed_obj not in class_dist.libeds:
                        class_dist.libeds.append(libed_obj)
                
                updated_libeds = [l.name for l in class_dist.libeds]
                print(f"[CourseInfo] Updated [{class_dist.campus}] {dept} {course_nbr} | Libeds: {updated_libeds}")
                
            except Exception as e:
                print(f"[CourseInfo] Error updating libeds for {dept} {course_nbr}: {e}")
                # Don't re-raise, continue with next course
        
        # Be a good citizen and don't spam the API
        time.sleep(0.1)
