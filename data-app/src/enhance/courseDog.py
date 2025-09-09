# courseDog.py - Handles CSV-based course information updates
# Updates course names, descriptions, and credit information from CourseDosg CSV exports

import pandas as pd
import time
import random
from .abstract import EnhanceBase
from db.Models import DepartmentDistribution, ClassDistribution, Session, and_

class CourseDogEnhance(EnhanceBase):
    """Handles course enhancement using CourseDosg CSV exports for basic course information"""

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
        
        session = Session()
        updated_count = 0
        skipped_count = 0
        
        try:
            for _, course in dept_courses.iterrows():
                course_nbr = str(course["Course number"])
                result = self._process_course_csv(session, dept, course_nbr, campus_str, course)
                if result:
                    updated_count += 1
                else:
                    skipped_count += 1
            
            session.commit()
            print(f"[CourseDog] {dept}: Updated {updated_count} courses, skipped {skipped_count} (not in database)")
            
        except Exception as e:
            session.rollback()
            print(f"[CourseDog] Error processing {dept}: {e}")
        finally:
            session.close()

    def _process_course_csv(self, session, dept: str, course_nbr: str, campus_str: str, course_data) -> bool:
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
            return True
        # Removed the "not found" message to reduce log noise
        return False
