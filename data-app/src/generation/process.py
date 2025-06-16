import pandas as pd
from db.Models import Session, ClassDistribution, DepartmentDistribution, Professor, Distribution, Libed, TermDistribution, and_
from collections import Counter
from mapping.mappings import term_to_name, dept_mapping, libed_mapping

class Process:
    @staticmethod
    def process_dist(x: pd.DataFrame) -> pd.DataFrame:
        """
        On a grouped element by FULL_NAME, TERM, and NAME (individual class taught by a specific professor) it will generate
        a distribution and associate it with the appropriate class distribution and professor. Should neither of those two exist
        then it will create them as well. If the department of the class doesn't exist then that will be created.

        :type x: pd.DataFrame
        """
        session = Session()
        prof_name = x["NAME"].iloc[0]
        dept_abbr = x["SUBJECT"].iloc[0]
        catalog_num = x["CATALOG_NBR"].iloc[0]
        class_descr = x["DESCR"].iloc[0]
        term = x["TERM"].iloc[0]
        campus = x["CAMPUS"].iloc[0]
        grade_hash = {
            'A':0, 
            'A+':0,
            'A-':0,
            'B': 0, 
            'B+': 0, 
            'B-': 0, 
            'C': 0, 
            'C+': 0, 
            'C-':0, 
            'D':0,
            'D+': 0, 
            'D-':0,
            'F':0,
            'N': 0, 
            'S': 0, 
            'P':0,
            'W': 0
        }
        grade_hash = x.groupby("CRSE_GRADE_OFF")["GRADE_HDCNT"].sum().to_dict()
        num_students = sum(grade_hash.values())
        # Begin Insertion
        class_dist = session.query(ClassDistribution).filter(and_(ClassDistribution.dept_abbr == dept_abbr, ClassDistribution.course_num == catalog_num, ClassDistribution.campus == campus)).first()
        # dept = session.query(DepartmentDistribution).filter(and_(DepartmentDistribution.dept_abbr == dept_abbr, DepartmentDistribution.campus == campus)).first()
        prof = session.query(Professor).filter(Professor.name == prof_name).first() or session.query(Professor).filter(Professor.name == "Unknown Instructor").first()
        if class_dist == None:
            class_dist = ClassDistribution(campus=campus,dept_abbr=dept_abbr,course_num=catalog_num,class_desc=class_descr,total_students=num_students,total_grades=grade_hash)
            session.add(class_dist)
            session.flush()
            print(f"[DIST Create] Created New Class Distribution {class_dist.dept_abbr} {class_dist.course_num}")
        else:
            class_dist.total_grades = Counter(class_dist.total_grades) + Counter(grade_hash)
            class_dist.total_students += num_students
            print(f"[DIST Update] Updated Class Distribution {class_dist.dept_abbr} {class_dist.course_num}")

        dist = session.query(Distribution).filter(Distribution.class_id == class_dist.id, Distribution.professor_id == prof.id).first()
        
        if dist == None:
            dist = Distribution(class_id = class_dist.id, professor_id = prof.id)
            session.add(dist)
            session.flush()
            print(f"[DIST Create] Created New Distribution Linking {class_dist.dept_abbr} {class_dist.course_num} to {prof.name}")

        if session.query(TermDistribution).filter(TermDistribution.term == term, TermDistribution.dist_id==dist.id).first() == None:
            term_dist = TermDistribution(students=num_students,grades=grade_hash,dist_id=dist.id, term=int(term))
            session.add(term_dist)
            session.commit()
            print(f"[TERM DIST Create] Added Term Distribution for {prof.name}'s {class_dist.dept_abbr} {class_dist.course_num} for {term_to_name(term)} with {term_dist.students} students.")

        session.close()
        return x
    
    @staticmethod
    def process_prof(prof_name: str) -> None:
        session = Session()
        professor = Professor(name=prof_name)
        session.add(professor)
        session.commit()
        print(f"[PROF Create] Added New Professor {professor.name}.")
        session.close()

    @staticmethod
    def process_dept(dept_tuple: tuple[str, str]) -> None:
        campus, dept_abbr = dept_tuple
        if campus not in dept_mapping:
            raise ValueError(f"[DEPT Error] Campus {campus} not found in department mapping.")
        if dept_abbr not in dept_mapping[campus]:
            raise ValueError(f"[DEPT Error] Department {dept_abbr} not found for campus {campus} in department mapping.")
        session = Session()
        dept = DepartmentDistribution(campus=campus, dept_abbr=dept_abbr,dept_name=dept_mapping[campus][dept_abbr])
        session.add(dept)
        session.commit()
        print(f"[DEPT Create] Added New Department {dept.dept_name} ({dept.dept_abbr}) for {dept.campus}.")
        session.close()
    
    @staticmethod
    def process_libeds() -> None:
        """ Adds all libeds as defined in libed_mapping to the database if they do not already exist."""
        session = Session()
        if len(session.query(Libed).all()) == 0:
            session.add_all([Libed(name=libed) for libed in set(libed_mapping.values())])
            session.commit()
        session.close()