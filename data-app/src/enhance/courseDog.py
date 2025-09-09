# courseDog.py - Handles CSV-based course information updates
# Updates course names, descriptions, and credit information from CourseDosg CSV exports

import pandas as pd
import time
import random
import threading
from .abstract import EnhanceBase
from .threading_abstract import ThreadingEnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Session, and_
from sqlalchemy.exc import OperationalError, PendingRollbackError

# Thread-local storage for database sessions
thread_local = threading.local()

class CourseDogEnhance(ThreadingEnhanceBase):
    """Handles course enhancement using CourseDosg CSV exports for basic course information"""

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

    def enhance_helper(self, dept_dist: DepartmentDistribution) -> None:
        """Enhance courses for a department using CSV data for basic course information"""
        dept = dept_dist.dept_abbr
        campus_str = str(dept_dist.campus)

        # Add random delay to reduce concurrent database access
        initial_delay = random.uniform(0.5, 2.0)
        time.sleep(initial_delay)

        # This CSV provides the master list of courses to check and update.
        csv_path = "CLASS_DATA/courses-report.2025-08-15.csv"
        
        try:
            df = pd.read_csv(csv_path)
        except FileNotFoundError:
            print(f"[CourseDog] Master course CSV not found: {csv_path}")
            return
        
        # Mapping for the main CSV campus names
        campus_mapping = { "UMNTC": "Twin Cities", "UMNRO": "Rochester" }
        csv_campus_name = campus_mapping.get(campus_str)

        if csv_campus_name is None:
            print(f"[CourseDog] Invalid campus code: {campus_str}")
            return

        # Filter the DataFrame for the specific department and campus
        dept_courses = df[
            (df["Course subject code"] == dept) &
            (df["Campus"] == csv_campus_name)
        ]

        if dept_courses.empty:
            print(f"[CourseDog] No courses found in master CSV for {dept} on {campus_str}.")
            return
        
        # Retry mechanism for database operations with exponential backoff
        max_retries = 5
        retry_delay_base = 2.0

        for attempt in range(max_retries):
            session = None
            try:
                session = self._get_thread_session()
                
                for _, course in dept_courses.iterrows():
                    course_nbr = str(course["Course number"])
                    self._process_course_csv(session, dept, course_nbr, campus_str, course)
                
                print("[CourseDog] Committing changes to the database.")
                session.commit()
                print(f"[CourseDog] Successfully processed {len(dept_courses)} courses for {dept}")
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
                    print(f"[CourseDog] Database locked for {dept}, retrying in {retry_delay:.2f}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(retry_delay)
                else:
                    print(f"[CourseDog] Failed to process {dept} after {max_retries} attempts: {e}")
                    return  # Give up on this department
                    
            except Exception as e:
                if session:
                    try:
                        session.rollback()
                    except Exception:
                        pass
                    self._close_thread_session()
                print(f"[CourseDog] Unexpected error processing {dept}: {e}")
                break
            finally:
                # Keep session alive for thread reuse, only close on error or completion
                pass

    def _process_course_csv(self, session, dept: str, course_nbr: str, campus_str: str, course_data) -> None:
        """Process a single course with CSV data for basic course information."""
        
        # --- Find and Update the Course in the Database ---
        class_dist = session.query(ClassDistribution).filter(
            and_(
                ClassDistribution.dept_abbr == dept, 
                ClassDistribution.course_num == course_nbr, 
                ClassDistribution.campus == campus_str
            )
        ).first()

        if class_dist:
            # Update basic course info from the CSV
            class_dist.class_desc = course_data["Course name"]
            class_dist.onestop_desc = course_data["Course description"]
            class_dist.cred_min = course_data["Minimum credits"]
            class_dist.cred_max = course_data["Maximum credits"]
            
            print(f"[CourseDog] Updated [{class_dist.campus}] {dept} {course_nbr} - {class_dist.class_desc} | Credits: {class_dist.cred_min}-{class_dist.cred_max}")
        else:
            print(f"[CourseDog] Course not found in database: {dept} {course_nbr}")
