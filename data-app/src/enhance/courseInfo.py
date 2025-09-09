# courseInfo.py - Handles API calls to UMN Courses API for course attributes/libed information
# credit to https://github.com/003MattB/ScheduleBuilderImproved this github for saving us on how to use courseInfo

import requests
import datetime
import time
import random
import threading
from .abstract import EnhanceBase
from .threading_abstract import ThreadingEnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session, and_
from mapping.mappings import libed_mapping, campus_api_mapping
from sqlalchemy.exc import OperationalError, PendingRollbackError

# Thread-local storage for database sessions
thread_local = threading.local()

class CourseInfoEnhance(ThreadingEnhanceBase):
    """Handles course enhancement using UMN Courses API for libed/attribute information"""

    def _get_thread_session(self):
        """Get a thread-local database session."""
        if not hasattr(thread_local, 'session') or thread_local.session is None:
            thread_local.session = Session()
        return thread_local.session

    def _close_thread_session(self):
        """Close the thread-local database session."""
        if hasattr(thread_local, 'session') and thread_local.session is not None:
            try:
                thread_local.session.close()
            except Exception:
                pass
            thread_local.session = None

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

        # Add random delay to reduce concurrent database access
        initial_delay = random.uniform(0.5, 2.0)
        time.sleep(initial_delay)

        api_campus = campus_api_mapping.get(campus_str)
        if not api_campus:
            print(f"[CourseInfo] Invalid campus code for API call: {campus_str}")
            return
        
        current_term = self._calculate_current_term()
        
        # Retry mechanism for database operations with exponential backoff
        max_retries = 5
        retry_delay_base = 2.0

        for attempt in range(max_retries):
            session = None
            try:
                session = self._get_thread_session()
                
                # Get all courses for this department from database
                courses = session.query(ClassDistribution).filter(
                    and_(
                        ClassDistribution.dept_abbr == dept,
                        ClassDistribution.campus == campus_str
                    )
                ).all()

                for course in courses:
                    self._process_course_api(session, dept, course.course_num, campus_str, api_campus, current_term)
                
                print("[CourseInfo] Committing changes to the database.")
                session.commit()
                print(f"[CourseInfo] Successfully processed {len(courses)} courses for {dept}")
                break  # Success, exit retry loop
                
            except (OperationalError, PendingRollbackError) as e:
                if session:
                    try:
                        session.rollback()
                    except Exception:
                        pass
                    self._close_thread_session()  # Close and recreate session on error
                
                if attempt < max_retries - 1:
                    retry_delay = retry_delay_base * (2 ** attempt) + random.uniform(0.5, 2.0)
                    print(f"[CourseInfo] Database locked for {dept}, retrying in {retry_delay:.2f}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    print(f"[CourseInfo] Failed to process {dept} after {max_retries} attempts: {e}")
                    return  # Give up on this department
                    
            except Exception as e:
                if session:
                    try:
                        session.rollback()
                    except Exception:
                        pass
                    self._close_thread_session()
                print(f"[CourseInfo] Unexpected error processing {dept}: {e}")
                break
            finally:
                # Keep session alive for thread reuse, only close on error or completion
                pass

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
        
        # Be a good citizen and don't spam the API
        time.sleep(0.1)
