import requests
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session
from mapping.mappings import libed_mapping

from multiprocessing import Pool
from time import time


def fetch_traditional(dept_dist:DepartmentDistribution) -> None:
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
    dept = dept_dist.dept_abbr

    link=f"https://app.coursedog.com/api/v1/cm/umn_umntc_peoplesoft/courses/?subjectCode={dept}"

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
        class_dist = session.query(ClassDistribution).filter(ClassDistribution.class_name == f"{dept} {course_nbr}").first()
        if class_dist:
            class_dist.class_desc = course["longName"]
            class_dist.onestop_desc = course["description"]
            class_dist.cred_min = course["credits"]["creditHours"]["min"]
            class_dist.cred_max = course["credits"]["creditHours"]["max"]
            class_dist.onestop = f"https://umtc.catalog.prod.coursedog.com/courses/{course['sisId']}"
            for attribute in course["attributes"]:
                libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute]).first()
                if libed_dist == None:
                    print(attribute, libed_mapping[attribute])
                libed_dist.class_dists.append(class_dist)
            print(f"Updated {class_dist.class_name} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
        session.commit()
        session.close()


def fetch_multiprocess(dept_dists:DepartmentDistribution) -> None:
    with Pool(10) as p:
        p.map(fetch_traditional, dept_dists)



if __name__ == "__main__":
    session = Session()
    dists = session.query(DepartmentDistribution).all()
    session.close()
    start = time()
    fetch_multiprocess(dists)
    end = time()
    print(f"Time Elapsed: {end-start}")
    









