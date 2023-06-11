import requests
from db.Models import DepartmentDistribution, ClassDistribution, Libed
from sqlalchemy import and_
from mapping.mappings import libed_mapping

CACHED_LINK = ""
CACHED_REQ = {}

def fetch_asr(dept_dist:DepartmentDistribution,term:int,session) -> None:
    """
    Uses the ASR Api: https://github.com/umn-asr/courses
    to fetch class information for relavent classes, classes that are recently being conducted +- 2 terms
    from current semester. This is because these are the bounds of data held by the server, any before or
    futher are not guarenteed to be found. 

    :param dept_dist: The department distribution that we might modify depending on the results returned.
    :type dept_dist: DepartmentDistribution
    :param term: A term id
    :type term: int
    """
    global CACHED_LINK
    global CACHED_REQ
    dept = dept_dist.dept_abbr

    link=f"https://courses.umn.edu/campuses/UMNTC/terms/{term}/courses.json?q=subject_id={dept}"

    if link!=CACHED_LINK:
        with requests.get(link) as url:
            CACHED_LINK=link
            try:
                CACHED_REQ=url.json()
            except ValueError:
                # print("Json malformed, icky!")
                CACHED_REQ={}
                return
    for course in CACHED_REQ["courses"]:
        subj = course["subject"]["subject_id"]
        nbr = course["catalog_number"]
        class_dist = session.query(ClassDistribution).filter(and_(ClassDistribution.onestop == None,ClassDistribution.class_name == f"{subj} {nbr}")).first()
        if class_dist:
            class_dist.class_desc = course["title"]
            class_dist.cred_min = course["credits_minimum"]
            class_dist.cred_max = course["credits_maximum"]
            class_dist.onestop = f"https://onestop2.umn.edu/pcas/viewCatalogCourse.do?courseId={course['course_id']}"
            for attribute in course["course_attributes"]:
                if attribute["family"] in ["CLE","HON","FSEM"]:
                    libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute['attribute_id']]).first()
                    libed_dist.class_dists.append(class_dist)
            # print(f"Updated {class_dist.class_name} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
        session.commit()