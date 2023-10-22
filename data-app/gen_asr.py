import requests
from db.Models import DepartmentDistribution, ClassDistribution, Libed, Session
from mapping.mappings import libed_mapping

from multiprocessing import Pool
from time import time


def fetch_traditional(dept_dist:DepartmentDistribution,term:int) -> None:
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

    link=f"https://courses.umn.edu/campuses/UMNTC/terms/{term}/courses.json?q=subject_id={dept}"

    with requests.get(link) as url:
        try:
            req=url.json()
        except ValueError:
            print("Json malformed, icky!")
            req={}
            return
    for course in req["courses"]:
        subj = course["subject"]["subject_id"]
        nbr = course["catalog_number"]
        session = Session()
        class_dist = session.query(ClassDistribution).filter(ClassDistribution.class_name == f"{subj} {nbr}").first()
        if class_dist:
            class_dist.class_desc = course["title"]
            class_dist.cred_min = course["credits_minimum"]
            class_dist.cred_max = course["credits_maximum"]
            class_dist.onestop = f"https://umtc.catalog.prod.coursedog.com/courses/{course['course_id']}1"
            for attribute in course["course_attributes"]:
                if attribute["family"] in ["CLE","HON","FSEM"]:
                    libed_dist = session.query(Libed).filter(Libed.name == libed_mapping[attribute['attribute_id']]).first()
                    libed_dist.class_dists.append(class_dist)
            print(f"Updated {class_dist.class_name} ({class_dist.onestop}) : [{class_dist.cred_min} - {class_dist.cred_max}] credits : Libeds: ({class_dist.libeds})")
        session.commit()
        session.close()


def fetch_multiprocess(dept_dists:DepartmentDistribution,term:int) -> None:
    with Pool(10) as p:
        p.starmap(fetch_traditional,[[dept_dist,term] for dept_dist in dept_dists])



if __name__ == "__main__":
    TERMS = [1225, 1229, 1233, 1235, 1239]
    session = Session()
    dists = session.query(DepartmentDistribution).all()
    session.close()
    start = time()
    for term in TERMS:
        fetch_multiprocess(dists,term)
    end = time()
    print(f"Time Elapsed: {end-start}")
    









