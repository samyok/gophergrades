import pandas as pd
from db.Models import *
import re

if __name__ == "__main__":
    session = Session()
    depts = session.query(DepartmentDistribution).all()
    for dept in depts:
        dept.campus = "UMNTC"
    
    session.commit()

    # Add capture groups to ^(.+) (\d+)$ where the first is department and the second is course number
    re.compile(r"^(?P<dept>.+) (?P<course_num>\d+)$")

    def insert(class_dist):
        try:
            name_capture = re.match(r"^(?P<dept>.+) (?P<course_num>.+)$",class_dist.class_name)
            dept_abbr = name_capture.group("dept")
            course_num = name_capture.group("course_num")
            class_dist.campus = "UMNTC"
            class_dist.dept_abbr = dept_abbr
            class_dist.course_num = course_num
        except:
            print(f"Failed to parse {class_dist.class_name}")
    

    
    for c_dist in session.query(ClassDistribution).all():
        insert(c_dist)
    
    session.commit()
    session.close()


